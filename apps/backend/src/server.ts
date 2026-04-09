import "dotenv/config";

import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { createQueue, QUEUE_NAMES, connection } from "@humanish/shared/queues";
import webhookRoute from "../routes/webhook";
import installationRoute from "../routes/installation";
import authRoute from "../routes/auth.routes";
import chatRoute from "../routes/chat";
import { getInstallationForRepo } from "../routes/installation";
import { getInstallationToken } from "../lib/github_app";
import { authenticateUser } from "../middleware/auth.middleware";
import { Octokit } from "@octokit/rest";

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;

console.log("Starting Primary Backend");

function sanitizeError(error: any): string {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    return error.message || "An error occurred";
  }

  const safeErrors: Record<string, string> = {
    ECONNREFUSED: "Service temporarily unavailable",
    ENOTFOUND: "Resource not found",
    ETIMEDOUT: "Request timeout",
    ECONNRESET: "Connection was reset",
    EPIPE: "Connection was closed",
  };

  if (error.code && safeErrors[error.code]) {
    return safeErrors[error.code]!;
  }

  return "An error occurred while processing your request";
}

const chatQueue = createQueue(QUEUE_NAMES.WORKER_JOB);
const indexingQueue = createQueue(QUEUE_NAMES.INDEXING);

/**
 * Detect if a repository is a fork and get parent repository information
 */
async function getForkInfo(repoUrl: string, token: string) {
  const repoId = repoUrl
    .replace(/^https?:\/\/(www\.)?github\.com\//, "")
    .replace(".git", "")
    .replace(/\/$/, "")
    .trim();

  const [owner, repo] = repoId.split("/");

  if (!owner || !repo) {
    console.warn(`[Fork Detection] Invalid repo format: ${repoId}`);
    return {
      forkUrl: repoUrl,
      parentUrl: null,
      forkId: repoId,
      parentId: null,
      isFork: false,
      forkOwner: owner || "unknown",
      parentOwner: null,
    };
  }

  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.repos.get({ owner, repo });

    if (data.fork && data.parent) {
      const isCrossAccount = data.owner.login !== data.parent.owner.login;
      console.log(
        `[Fork Detection] Repository is a fork: ${data.full_name} → parent: ${data.parent.full_name}`
      );
      console.log(
        `[Fork Detection] Fork type: ${isCrossAccount ? "cross-account" : "same-account"}`
      );

      return {
        forkUrl: data.html_url,
        parentUrl: data.parent.html_url,
        forkId: data.full_name,
        parentId: data.parent.full_name,
        isFork: true,
        forkOwner: data.owner.login,
        parentOwner: data.parent.owner.login,
      };
    }

    console.log(`[Fork Detection] Repository is NOT a fork: ${data.full_name}`);
    return {
      forkUrl: data.html_url,
      parentUrl: null,
      forkId: data.full_name,
      parentId: null,
      isFork: false,
      forkOwner: data.owner.login,
      parentOwner: null,
    };
  } catch (error: any) {
    console.error(`[Fork Detection] Error fetching repo info:`, error.message);
    return {
      forkUrl: repoUrl,
      parentUrl: null,
      forkId: repoId,
      parentId: null,
      isFork: false,
      forkOwner: owner,
      parentOwner: null,
    };
  }
}

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "10mb",
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Job creation limit exceeded. Please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

app.post("/api/chat", authenticateUser, strictLimiter, async (req, res) => {
  try {
    const { repoUrl, task } = req.body;
    const userId = req.user!.userId;
    const username = req.user!.username;

    if (!repoUrl || !task) {
      return res.status(400).json({ error: "Missing repoUrl or task" });
    }

    const repoId = repoUrl
      .replace(/^https?:\/\/(www\.)?github\.com\//, "")
      .replace(".git", "")
      .replace(/\/$/, "")
      .trim();

    console.log(
      `[Chat API] Code generation request - User: ${username}, Repo: ${repoId}, Task: ${task}`
    );

    let installationToken: string | null = null;
    let installationId: number | null = null;

    try {
      installationId = await getInstallationForRepo(repoId);

      if (installationId) {
        installationToken = await getInstallationToken(installationId);
        console.log(
          `[Chat API] Using GitHub App token for installation ${installationId}`
        );
      } else {
        console.log(
          `[Chat API] No GitHub App installation found for ${repoId}, will use MY_GITHUB_ACCESS_TOKEN fallback`
        );
      }
    } catch (error: any) {
      console.warn(
        `[Chat API] Failed to get installation token: ${error.message}`
      );
      console.log(`[Chat API] Will use MY_GITHUB_ACCESS_TOKEN fallback`);
    }

    const bm25Key = `bm25:index:${repoId}`;
    const isIndexed = await connection.exists(bm25Key);

    if (!isIndexed) {
      console.log(
        `Repository ${repoId} not indexed. Triggering automatic indexing...`
      );

      const indexingJobId = randomUUID();
      const projectId = `index-${indexingJobId}`;
      const indexingJob = await indexingQueue.add(
        "index-repo",
        {
          projectId,
          repoUrl,
          repoId,
          branch: "main",
          task: "Auto-index repository",
          installationToken,
          installationId,
          userId,
          username,
        },
        {
          jobId: indexingJobId,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        }
      );

      console.log(
        `[Chat API] Indexing job ${indexingJob.id} queued for ${repoId} by user ${username}`
      );

      // Step 1: Get fork information using preliminary token
      const preliminaryToken =
        installationToken || process.env.MY_GITHUB_ACCESS_TOKEN || "";
      const forkInfo = await getForkInfo(repoUrl, preliminaryToken);

      // Step 2: Smart token selection based on repository type
      let githubToken: string;
      let tokenType: "app" | "oauth";

      if (forkInfo.isFork && forkInfo.forkOwner !== forkInfo.parentOwner) {
        // Cross-account fork → Use user's OAuth token
        const userOAuthToken = req.user!.githubAccessToken;

        if (!userOAuthToken) {
          return res.status(401).json({
            error:
              "Fork workflow requires GitHub authentication. Please log in.",
            requiresLogin: true,
          });
        }

        githubToken = userOAuthToken;
        tokenType = "oauth";
        console.log(
          `[Chat API] Cross-account fork (${forkInfo.forkId} → ${forkInfo.parentId}): using user OAuth token`
        );
      } else {
        // Own repo or same-account fork → Prefer app token
        if (installationToken) {
          githubToken = installationToken;
          tokenType = "app";
          console.log(
            `[Chat API] Own repository (${repoId}): using GitHub App token`
          );
        } else {
          const userOAuthToken = req.user!.githubAccessToken;
          if (!userOAuthToken) {
            return res.status(401).json({
              error: "Please install the GitHub App or log in with GitHub.",
              requiresAuth: true,
            });
          }
          githubToken = userOAuthToken;
          tokenType = "oauth";
          console.log(
            `[Chat API] No app installation: using user OAuth token as fallback`
          );
        }
      }

      const codeGenJobId = randomUUID();
      const codeGenJob = await chatQueue.add(
        "process",
        {
          repoUrl: forkInfo.forkUrl,
          parentRepoUrl: forkInfo.parentUrl,
          task,
          repoId: forkInfo.forkId,
          parentRepoId: forkInfo.parentId,
          isFork: forkInfo.isFork,
          indexingJobId: indexingJob.id,
          githubToken,
          tokenType,
          userId,
          username,
        },
        {
          jobId: codeGenJobId,
          delay: 10000,
        }
      );

      return res.status(202).json({
        message: "Repository not indexed. Indexing automatically...",
        indexing: true,
        indexingJobId: indexingJob.id,
        codeGenJobId: codeGenJob.id,
        repoId: repoId,
        statusUrl: `/api/status/${codeGenJob.id}`,
        indexingStatusUrl: `/api/index-status/${indexingJob.id}`,
        estimatedTime: "3-5 minutes for indexing, then code generation",
      });
    }

    console.log(
      `[Chat API] Repository ${repoId} already indexed. Proceeding with code generation for user ${username}...`
    );

    // Step 1: Get fork information using preliminary token
    const preliminaryToken =
      installationToken || process.env.MY_GITHUB_ACCESS_TOKEN || "";
    const forkInfo = await getForkInfo(repoUrl, preliminaryToken);

    // Step 2: Smart token selection based on repository type
    let githubToken: string;
    let tokenType: "app" | "oauth";

    if (forkInfo.isFork && forkInfo.forkOwner !== forkInfo.parentOwner) {
      // Cross-account fork → Use user's OAuth token
      const userOAuthToken = req.user!.githubAccessToken;

      if (!userOAuthToken) {
        return res.status(401).json({
          error: "Fork workflow requires GitHub authentication. Please log in.",
          requiresLogin: true,
        });
      }

      githubToken = userOAuthToken;
      tokenType = "oauth";
      console.log(
        `[Chat API] Cross-account fork (${forkInfo.forkId} → ${forkInfo.parentId}): using user OAuth token`
      );
    } else {
      // Own repo or same-account fork → Prefer app token
      if (installationToken) {
        githubToken = installationToken;
        tokenType = "app";
        console.log(
          `[Chat API] Own repository (${repoId}): using GitHub App token`
        );
      } else {
        const userOAuthToken = req.user!.githubAccessToken;
        if (!userOAuthToken) {
          return res.status(401).json({
            error: "Please install the GitHub App or log in with GitHub.",
            requiresAuth: true,
          });
        }
        githubToken = userOAuthToken;
        tokenType = "oauth";
        console.log(
          `[Chat API] No app installation: using user OAuth token as fallback`
        );
      }
    }

    if (forkInfo.isFork) {
      console.log(
        `[Chat API] Fork workflow: ${forkInfo.forkId} → ${forkInfo.parentId}`
      );
    } else {
      console.log(`[Chat API] Same-repo workflow: ${forkInfo.forkId}`);
    }

    const jobId = randomUUID();
    const job = await chatQueue.add(
      "process",
      {
        repoUrl: forkInfo.forkUrl,
        parentRepoUrl: forkInfo.parentUrl,
        task,
        repoId: forkInfo.forkId,
        parentRepoId: forkInfo.parentId,
        isFork: forkInfo.isFork,
        githubToken,
        tokenType,
        userId,
        username,
      },
      {
        jobId,
      }
    );

    res.status(202).json({
      message: "Task queued",
      indexing: false,
      jobId: job.id,
      repoId: repoId,
      statusUrl: `/api/status/${job.id}`,
    });
  } catch (error: any) {
    console.error("[Chat API Error]", error);
    res.status(500).json({ error: sanitizeError(error) });
  }
});

app.get("/api/status/:jobId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { jobId } = req.params;

    if (!jobId || jobId === "undefined" || jobId === "null") {
      console.log(`[Job Status] Invalid jobId received: ${jobId}`);
      return res.status(400).json({ error: "Valid Job ID is required" });
    }

    console.log(`[Job Status] Fetching job ${jobId} for user ${userId}`);
    const job = await chatQueue.getJob(jobId);

    if (!job) {
      console.log(`[Job Status] Job ${jobId} not found in queue`);
      return res.status(404).json({ error: "Job not found" });
    }

    console.log(`[Job Status] Job ${jobId} found, checking ownership`);
    if (job.data.userId !== userId) {
      console.log(
        `[Job Status] User ${userId} attempted to access job ${job.id} owned by ${job.data.userId}`
      );
      return res
        .status(403)
        .json({ error: "Forbidden: You do not have access to this job" });
    }

    const state = await job.getState();
    console.log(
      `[Job Status] Job ${jobId} state: ${state}, progress: ${job.progress}`
    );

    res.json({
      jobId: job.id,
      state: state,
      progress: job.progress,
      result: job.returnvalue,
    });
  } catch (error: any) {
    console.error("[Job Status Error]", error);
    res.status(500).json({ error: sanitizeError(error) });
  }
});

app.get("/api/job-details/:jobId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { jobId } = req.params;

    if (!jobId || jobId === "undefined" || jobId === "null") {
      console.log(`[Job Details] Invalid jobId received: ${jobId}`);
      return res.status(400).json({ error: "Valid Job ID is required" });
    }

    const job = await chatQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.data.userId !== userId) {
      console.log(
        `[Job Details] User ${userId} attempted to access job ${job.id} owned by ${job.data.userId}`
      );
      return res
        .status(403)
        .json({ error: "Forbidden: You do not have access to this job" });
    }

    const state = await job.getState();
    const result = job.returnvalue;

    res.json({
      jobId: job.id,
      state,
      progress: job.progress,
      result,
      fileDiffs: result?.fileDiffs || [],
      fileOperations: result?.fileOperations || [],
      explanation: result?.explanation || "",
    });
  } catch (error: any) {
    console.error("[Job Details Error]", error);
    res.status(500).json({ error: sanitizeError(error) });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "primary-backend" });
});

app.use("/webhook", webhookRoute);
app.use("/installation", installationRoute);

app.use("/github-webhook", (req, res, next) => {
  const event = req.header("X-GitHub-Event") || "";
  console.log(`[Unified Webhook] Received ${event} event`);

  if (event === "installation" || event === "installation_repositories") {
    console.log(`[Unified Webhook] Forwarding to /installation handler`);
    return installationRoute(req, res, next);
  }

  if (event === "push" || event === "pull_request") {
    console.log(`[Unified Webhook] Forwarding to /webhook handler`);
    return webhookRoute(req, res, next);
  }

  console.log(`[Unified Webhook] Unhandled event: ${event}`);
  return res.status(200).json({
    message: "Event received but not handled",
    event,
    note: "Only installation, push, and pull_request events are processed",
  });
});

app.use("/auth", authRoute);
app.use("/api", chatRoute);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("[Global Error Handler]", err);
    res.status(err.status || 500).json({
      error: sanitizeError(err),
    });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}\n`);

  console.log(`=== GITHUB APP WEBHOOKS (Configure in GitHub App settings) ===`);
  console.log(`POST /github-webhook - USE THIS for GitHub App Webhook URL`);
  console.log(`POST /webhook/github - LEGACY - Don't use directly`);
  console.log(`POST /installation - LEGACY - Don't use directly\n`);

  console.log(`=== GITHUB APP AUTH (Configure in GitHub App settings) ===`);
  console.log(`GET /auth/github/login - Initiate GitHub OAuth`);
  console.log(
    `GET /auth/github/callback - OAuth callback (use in GitHub App)\n`
  );

  console.log(`=== API ENDPOINTS ===`);
  console.log(`POST /api/chat - Chat endpoint`);
  console.log(`GET /api/status/:jobId - Chat job status`);
  console.log(`GET /api/job-details/:jobId - Job details with file diffs`);
  console.log(`GET /installation/list - List all installations`);
  console.log(`GET /auth/me - Get current user`);
  console.log(`GET /auth/repos - Get user repositories`);
  console.log(`POST /auth/logout - Logout`);
  console.log(`POST /auth/refresh - Refresh JWT token`);
  console.log(`GET /health - Health check\n`);

  console.log(`CORS enabled for: ${FRONTEND_URL}`);
  console.log(
    `Queue: Redis on ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
  );
});

export default app;
export { indexingQueue, chatQueue };
