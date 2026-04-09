import { Router } from "express";
import { verifyWebhookSignature } from "../lib/github_app";
import { authenticateUser } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";

const router = Router();

// Database return types
interface RepositoryRecord {
  id: number;
  githubId: number;
  name: string;
  fullName: string;
  private: boolean;
  addedAt: Date;
  removedAt: Date | null;
  installationId: number;
}

interface InstallationRecord {
  id: number;
  installationId: number;
  accountLogin: string;
  accountType: string;
  installedAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  repositories: RepositoryRecord[];
}

interface Installation {
  installationId: number;
  accountLogin: string;
  accountType: "User" | "Organization";
  repositories: {
    id: number;
    name: string;
    fullName: string;
    private: boolean;
  }[];
  installedAt: string;
  updatedAt: string;
}

router.post("/", async (req, res) => {
  try {
    const signature = req.header("X-Hub-Signature-256") || "";
    const event = req.header("X-GitHub-Event") || "";
    const deliveryId = req.header("X-GitHub-Delivery") || "";
    const body = req.body;
    const rawBody = (req as any).rawBody as Buffer;
    console.log(`\n[Installation] ${event} | Delivery: ${deliveryId}`);
    if (!(await verifyWebhookSignature(rawBody, signature))) {
      console.error("Invalid signature");
      return res.status(403).json({ error: "Invalid signature" });
    }
    if (event === "installation" && body.action === "created") {
      const installationId = body.installation.id;
      const account = body.installation.account;
      const repositories = body.repositories || [];
      console.log("App installed");

      await prisma.installation.create({
        data: {
          installationId,
          accountLogin: account.login,
          accountType: account.type,
          installedAt: new Date(),
          deletedAt: null,
          repositories: {
            create: repositories.map((repo: any) => ({
              githubId: repo.id,
              name: repo.name,
              fullName: repo.full_name,
              private: repo.private,
              addedAt: new Date(),
              removedAt: null,
            })),
          },
        },
      });

      console.log(
        `[Installation] Created installation ${installationId} with ${repositories.length} repos in database`
      );

      return res.status(200).json({
        message: "Installation created",
        installationId,
        repositories: repositories.length,
      });
    }
    if (event === "installation" && body.action === "deleted") {
      const installationId = body.installation.id;
      const account = body.installation.account;
      console.log(`[Installation] Uninstalled by ${account.login}`);

      await prisma.installation.delete({
        where: { installationId },
      });

      console.log(
        `[Installation] Deleted installation ${installationId} from database`
      );

      return res.status(200).json({
        message: "Deleted",
        installationId,
      });
    }
    if (event === "installation_repositories" && body.action === "added") {
      const installationId = body.installation.id;
      const addedRepos = body.repositories_added || [];
      console.log(
        `[Installation] ${addedRepos.length} repos added to ${installationId}`
      );

      await prisma.repository.createMany({
        data: addedRepos.map((repo: any) => ({
          githubId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          installationId,
          addedAt: new Date(),
          removedAt: null,
        })),
      });

      await prisma.installation.update({
        where: { installationId },
        data: { updatedAt: new Date() },
      });

      console.log(
        `[Installation] Added ${addedRepos.length} repos to installation ${installationId} in database`
      );

      return res.status(200).json({
        message: "Repositories added",
        installationId,
        added: addedRepos.length,
      });
    }
    if (event === "installation_repositories" && body.action === "removed") {
      const installationId = body.installation.id;
      const removedRepos = body.repositories_removed || [];
      console.log(
        `${removedRepos.length} repos removed from ${installationId}`
      );

      await prisma.repository.deleteMany({
        where: {
          fullName: {
            in: removedRepos.map((r: any) => r.full_name),
          },
        },
      });

      await prisma.installation.update({
        where: { installationId },
        data: { updatedAt: new Date() },
      });

      console.log(
        `[Installation] Removed ${removedRepos.length} repos from installation ${installationId} in database`
      );

      return res.status(200).json({
        message: "Removed Repositories",
        installationId,
        removed: removedRepos.length,
      });
    }

    if (event === "push" || event === "pull_request") {
      console.log(
        `[Installation] Received ${event} - this should go to /webhook/github`
      );
      return res.status(200).json({
        message: `${event} events should be sent to /webhook/github endpoint`,
        event,
      });
    }

    console.log(`[Installation] Unhandled event: ${event}`);
    return res.status(200).json({ message: "Event not handled", event });
  } catch (error: any) {
    console.error("[Installation] Error:", error.message);
    return res.status(500).json({
      error: "Processing Failed",
    });
  }
});

export async function getInstallationForRepo(
  repoFullName: string
): Promise<number | null> {
  const repo = await prisma.repository.findUnique({
    where: { fullName: repoFullName },
    select: { installationId: true },
  });
  return repo?.installationId || null;
}

router.get("/list", authenticateUser, async (req, res) => {
  try {
    const username = req.user!.username;

    console.log(
      `[Installation List] Fetching installations for user: ${username}`
    );

    const installations = await prisma.installation.findMany({
      where: {
        accountLogin: username,
        deletedAt: null,
      },
      include: {
        repositories: {
          where: {
            removedAt: null,
          },
        },
      },
    });

    const installationList = installations.map(
      (install: InstallationRecord) => ({
        installationId: install.installationId,
        account: install.accountLogin,
        type: install.accountType,
        repositories: install.repositories.length,
        repos: install.repositories.map((r: RepositoryRecord) => r.fullName),
        installedAt: install.installedAt,
      })
    );

    console.log(
      `[Installation List] Found ${installationList.length} installation(s) for user ${username}`
    );

    res.json({
      total: installationList.length,
      installations: installationList,
    });
  } catch (error: any) {
    console.error("[Installation List] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
