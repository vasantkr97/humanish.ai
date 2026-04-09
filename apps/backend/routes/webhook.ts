import { Router } from "express";
import { randomUUID } from "crypto";
import { indexingQueue, chatQueue } from "../src/server";
import { connection } from "@humanish/shared/queues";
import { getInstallationForRepo } from "./installation";
import {
  getInstallationToken,
  verifyWebhookSignature,
} from "../lib/github_app";

const INCREMENTAL_THRESHOLD = parseInt(
  process.env.INCREMENTAL_THRESHOLD || "100"
);
const router = Router();

function extractChangedFiles(commits: any[]) {
  const files = {
    added: [] as string[],
    modified: [] as string[],
    removed: [] as string[],
  };

  for (const commit of commits || []) {
    files.added.push(...(commit.added || []));
    files.modified.push(...(commit.modified || []));
    files.removed.push(...(commit.removed || []));
  }

  files.added = [...new Set(files.added)];
  files.modified = [...new Set(files.modified)];
  files.removed = [...new Set(files.removed)];

  return files;
}

async function isRepositoryIndexed(
  repoName: string,
  branch: string
): Promise<boolean> {
  const key = `index:${repoName}:${branch}:meta`;
  return (await connection.exists(key)) === 1;
}

function determineIndexStrategy(
  isIndexed: boolean,
  beforeSHA: string,
  totalChanges: number
): { type: "full" | "incremental"; reason: string } {
  if (!isIndexed) {
    return { type: "full", reason: "Not indexed" };
  }

  if (beforeSHA === "0000000000000000000000000000000000000000") {
    return { type: "full", reason: "Force push" };
  }

  if (totalChanges === 0) {
    return { type: "full", reason: "No changes" };
  }

  if (totalChanges > INCREMENTAL_THRESHOLD) {
    return {
      type: "full",
      reason: `Changes exceed threshold (${totalChanges} > ${INCREMENTAL_THRESHOLD})`,
    };
  }

  return { type: "incremental", reason: "Incremental update" };
}

router.post("/github", async (req, res) => {
  try {
    const signature = req.header("X-Hub-Signature-256") || "";
    const event = req.header("X-GitHub-Event") || "";
    const deliveryId = req.header("X-GitHub-Delivery") || "";
    const body = req.body;
    const rawBody = (req as any).rawBody as Buffer;

    console.log(`\n[Webhook] ${event} | Delivery: ${deliveryId}`);

    if (!(await verifyWebhookSignature(rawBody, signature))) {
      console.error("[Webhook] Invalid signature");
      return res.status(403).json({ error: "Invalid signature" });
    }

    if (event === "installation" || event === "installation_repositories") {
      console.log(
        `[Webhook] Received ${event} event - should be sent to /installation endpoint`
      );
      return res.status(200).json({
        message: "Installation events should be sent to /installation endpoint",
        event,
      });
    }

    const repoName = body?.repository?.full_name;
    const repoUrl = body?.repository?.clone_url;
    const repoHtmlUrl = body?.repository?.html_url;

    if (!repoName || !repoUrl) {
      console.error("[Webhook] Missing repository info");
      return res.status(400).json({ error: "Missing repository information" });
    }

    console.log(`[Webhook] Repository: ${repoName}`);

    const installationId = await getInstallationForRepo(repoName);

    if (!installationId) {
      console.error(`[Webhook] Repository ${repoName} not installed`);
      return res.status(404).json({
        error: "Repository not registered",
        message: "Please install the GitHub App on this repository first",
      });
    }

    let installationToken: string;
    try {
      installationToken = await getInstallationToken(installationId);
      console.log(
        `[Webhook] Token generated for installation ${installationId}`
      );
    } catch (error: any) {
      console.error(`[Webhook] Failed to get token:`, error.message);
      return res.status(500).json({ error: "Failed to generate token" });
    }

    if (event === "push") {
      const branch = body.ref?.replace("refs/heads/", "") || "main";
      const commits = body.commits || [];
      const pusher = body.pusher?.name || "unknown";
      const beforeSHA = body.before;
      const afterSHA = body.after;

      console.log(
        `[Push] ${branch} | ${beforeSHA?.slice(0, 7)}...${afterSHA?.slice(0, 7)} | ${commits.length} commits`
      );

      const changedFiles = extractChangedFiles(commits);
      const totalChanges =
        changedFiles.added.length +
        changedFiles.modified.length +
        changedFiles.removed.length;

      console.log(
        `[Push] +${changedFiles.added.length} ~${changedFiles.modified.length} -${changedFiles.removed.length}`
      );

      const isIndexed = await isRepositoryIndexed(repoName, branch);
      const strategy = determineIndexStrategy(
        isIndexed,
        beforeSHA,
        totalChanges
      );

      console.log(
        `[Push] Strategy: ${strategy.type.toUpperCase()} (${strategy.reason})`
      );

      if (strategy.type === "full") {
        const jobId = randomUUID();
        const job = await indexingQueue.add(
          "index-repo",
          {
            projectId: repoName,
            repoUrl: repoHtmlUrl,
            repoId: repoName,
            branch,
            timestamp: Date.now(),
            trigger: "webhook",
            event: "push",
            indexType: "full",
            pusher,
            commits: commits.length,
            beforeSHA,
            afterSHA,
            installationToken,
            installationId,
          },
          {
            jobId,
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          }
        );

        console.log(`[Push] Full index job: ${job.id}`);

        return res.status(200).json({
          message: "Full indexing queued",
          indexType: "full",
          reason: strategy.reason,
          jobId: job.id,
          statusUrl: `/api/index-status/${job.id}`,
        });
      }

      const jobId = randomUUID();
      const job = await indexingQueue.add(
        "incremental-index",
        {
          projectId: repoName,
          repoUrl: repoHtmlUrl,
          repoId: repoName,
          branch,
          timestamp: Date.now(),
          trigger: "webhook",
          event: "push",
          indexType: "incremental",
          pusher,
          commits: commits.length,
          beforeSHA,
          afterSHA,
          changedFiles,
          totalChangedFiles: totalChanges,
          installationToken,
          installationId,
        },
        {
          jobId,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        }
      );

      console.log(`[Push] Incremental job: ${job.id}`);

      return res.status(200).json({
        message: "Incremental indexing queued",
        indexType: "incremental",
        filesChanged: totalChanges,
        changedFiles: {
          added: changedFiles.added.length,
          modified: changedFiles.modified.length,
          removed: changedFiles.removed.length,
        },
        jobId: job.id,
        statusUrl: `/api/index-status/${job.id}`,
      });
    }

    if (event === "pull_request") {
      const action = body.action;
      const prNumber = body.pull_request?.number;
      const prBranch = body.pull_request?.head?.ref;
      const baseBranch = body.pull_request?.base?.ref;
      const merged = body.pull_request?.merged || false;
      const mergedAt = body.pull_request?.merged_at;

      console.log(`[PR] #${prNumber} ${action} ${merged ? "(merged)" : ""}`);

      if (action === "closed" && merged) {
        console.log(
          `[PR Merged] #${prNumber} merged into ${baseBranch} at ${mergedAt}`
        );

        const jobId = randomUUID();
        const job = await indexingQueue.add(
          "index-repo",
          {
            projectId: repoName,
            repoUrl: repoHtmlUrl,
            repoId: repoName,
            branch: baseBranch,
            timestamp: Date.now(),
            trigger: "webhook",
            event: "pull_request_merged",
            prNumber,
            action: "merged",
            indexType: "full",
            installationToken,
            installationId,
          },
          {
            jobId,
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          }
        );

        console.log(
          `[PR Merged] Base branch ${baseBranch} re-index job: ${job.id}`
        );

        return res.status(200).json({
          message: "PR merged - base branch re-indexing queued",
          action: "merged",
          baseBranch,
          prNumber,
          jobId: job.id,
          statusUrl: `/api/index-status/${job.id}`,
        });
      }

      if (action === "closed" && !merged) {
        console.log(`[PR Closed] #${prNumber} closed without merging`);

        return res.status(200).json({
          message: "PR closed without merge",
          action: "closed",
          prNumber,
        });
      }

      if (action === "opened" || action === "synchronize") {
        const jobId = randomUUID();
        const job = await indexingQueue.add(
          "index-repo",
          {
            projectId: `${repoName}/pr-${prNumber}`,
            repoUrl: repoHtmlUrl,
            repoId: repoName,
            branch: prBranch,
            timestamp: Date.now(),
            trigger: "webhook",
            event: "pull_request",
            prNumber,
            action,
            indexType: "full",
            installationToken,
            installationId,
          },
          {
            jobId,
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          }
        );

        console.log(`[PR] Index job: ${job.id}`);

        return res.status(200).json({
          message: "PR indexing queued",
          jobId: job.id,
          statusUrl: `/api/index-status/${job.id}`,
        });
      }

      return res.status(200).json({
        message: "PR event received",
        action,
        prNumber,
      });
    }

    console.log(`[Webhook] Unhandled event: ${event}`);
    return res.status(200).json({ message: "Event not handled", event });
  } catch (error: any) {
    console.error("[Webhook] Error:", error.message);
    return res
      .status(500)
      .json({ error: "Processing failed", message: error.message });
  }
});

export default router;
