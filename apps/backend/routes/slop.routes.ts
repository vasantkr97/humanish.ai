import { Router } from "express";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { authenticateUser } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { createQueue, QUEUE_NAMES } from "@humanish/shared/queues";
import { createSlopMetrics, type SlopPattern } from "@humanish/shared";

const router = Router();
const slopCleanupQueue = createQueue(QUEUE_NAMES.SLOP_CLEANUP);
const chatQueue = createQueue(QUEUE_NAMES.WORKER_JOB);

type PersistedSlopReport = Awaited<
  ReturnType<typeof prisma.slopReport.findUnique>
>;

function normalizePatterns(patterns: unknown): SlopPattern[] {
  if (!Array.isArray(patterns)) {
    return [];
  }

  return patterns.filter((pattern): pattern is SlopPattern => {
    return !!pattern && typeof pattern === "object" && "file" in pattern;
  });
}

function flattenUniquePatterns(byFile: Record<string, SlopPattern[]>): SlopPattern[] {
  const seen = new Set<string>();
  const flattened: SlopPattern[] = [];

  for (const filePatterns of Object.values(byFile)) {
    for (const pattern of filePatterns) {
      const key = [
        pattern.file,
        pattern.line ?? "",
        pattern.endLine ?? "",
        pattern.category,
        pattern.severity,
        pattern.snippet,
      ].join("::");

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      flattened.push(pattern);
    }
  }

  return flattened;
}

function buildStructuredReport(patterns: SlopPattern[]) {
  const byFile: Record<string, SlopPattern[]> = {};
  const byCategory: Partial<Record<SlopPattern["category"], SlopPattern[]>> = {};

  for (const pattern of patterns) {
    if (!byFile[pattern.file]) {
      byFile[pattern.file] = [];
    }
    byFile[pattern.file]!.push(pattern);

    if (!byCategory[pattern.category]) {
      byCategory[pattern.category] = [];
    }
    byCategory[pattern.category]!.push(pattern);
  }

  return { byFile, byCategory };
}

async function hydrateReportFromCompletedJob(
  jobId: string,
  userId: number
): Promise<PersistedSlopReport | "forbidden" | null> {
  const existing = await prisma.slopReport.findUnique({
    where: { jobId },
  });

  if (existing) {
    return existing;
  }

  const job = await chatQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  if (job.data.userId !== userId) {
    return "forbidden";
  }

  const state = await job.getState();
  const result = job.returnvalue;
  const slopReport = result?.slopReport;
  const branchName = result?.branchName;

  if (state !== "completed" || !slopReport || !branchName) {
    return null;
  }

  const flattenedPatterns = flattenUniquePatterns(slopReport.byFile || {});

  try {
    return await prisma.slopReport.create({
      data: {
        jobId,
        userId: job.data.userId,
        patterns: flattenedPatterns,
        totalCount: slopReport.totalCount || flattenedPatterns.length,
        criticalCount: slopReport.criticalCount || 0,
        summary: slopReport.summary || "",
        canAutoFix: slopReport.canAutoFix ?? true,
        repoId: job.data.repoId,
        branchName,
        prNumber: result?.prNumber || null,
      },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return prisma.slopReport.findUnique({
        where: { jobId },
      });
    }

    throw error;
  }
}

function serializeReport(report: NonNullable<PersistedSlopReport>) {
  const patterns = normalizePatterns(report.patterns);
  const { byFile, byCategory } = buildStructuredReport(patterns);
  const metrics = createSlopMetrics(patterns);

  return {
    id: report.id,
    jobId: report.jobId,
    patterns,
    byFile,
    byCategory,
    totalCount: report.totalCount,
    criticalCount: report.criticalCount,
    summary: report.summary,
    canAutoFix: report.canAutoFix,
    repoId: report.repoId,
    branchName: report.branchName,
    prNumber: report.prNumber,
    status: report.status,
    cleanupJobId: report.cleanupJobId,
    fixedAt: report.fixedAt,
    createdAt: report.createdAt,
    ...metrics,
  };
}

/**
 * GET /api/slop/:jobId
 * Returns the slop report for a specific feature-building job.
 * Free — always available to authenticated users.
 */
router.get(
  "/slop/:jobId",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const userId = req.user!.userId;

      if (!jobId || jobId === "undefined") {
        return res.status(400).json({ error: "Valid Job ID is required" });
      }

      const report = await hydrateReportFromCompletedJob(jobId, userId);

      if (report === "forbidden") {
        return res
          .status(403)
          .json({ error: "Forbidden: You do not have access to this report" });
      }

      if (!report) {
        return res.status(404).json({
          error: "No slop report found for this job",
          message: "Either the job hasn't completed or no slop was detected",
        });
      }

      if (report.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Forbidden: You do not have access to this report" });
      }

      res.json(serializeReport(report));
    } catch (error: any) {
      console.error("[Slop] GET /slop/:jobId error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
);

/**
 * POST /api/slop/:jobId/fix
 * Trigger a slop cleanup job for the given feature job.
 * FREE for now — no credit deduction.
 */
router.post(
  "/slop/:jobId/fix",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const userId = req.user!.userId;

      if (!jobId || jobId === "undefined") {
        return res.status(400).json({ error: "Valid Job ID is required" });
      }

      // Fetch the report
      const report = await hydrateReportFromCompletedJob(jobId, userId);

      if (report === "forbidden") {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!report) {
        return res.status(404).json({ error: "No slop report found" });
      }

      if (report.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Guard: only allow fixing if status is "pending"
      if (report.status !== "pending") {
        return res.status(409).json({
          error: `Report is already in '${report.status}' state`,
          cleanupJobId: report.cleanupJobId,
        });
      }

      if (report.totalCount === 0) {
        return res.status(409).json({
          error: "This feature is already 100% Humanish. No cleanup is needed.",
        });
      }

      if (!report.canAutoFix) {
        return res.status(409).json({
          error: "This slop report requires manual review before cleanup.",
        });
      }

      // Queue the cleanup job
      const cleanupJobId = randomUUID();

      // Get the user's GitHub token from session
      const githubToken = req.user!.githubAccessToken;

      const job = await slopCleanupQueue.add(
        "slop_cleanup",
        {
          slopReportId: report.id,
          originalJobId: jobId,
          userId,
          repoId: report.repoId,
          branchName: report.branchName,
          prNumber: report.prNumber,
          githubToken,
          patterns: normalizePatterns(report.patterns),
        },
        {
          jobId: cleanupJobId,
          attempts: 2,
          backoff: { type: "exponential", delay: 3000 },
        }
      );

      // Update report status to "fixing"
      await prisma.slopReport.update({
        where: { id: report.id },
        data: {
          status: "fixing",
          cleanupJobId: job.id!,
        },
      });

      console.log(
        `[Slop] Cleanup job ${job.id} queued for report ${report.id} by user ${userId}`
      );

      res.status(202).json({
        message: "Slop cleanup job queued",
        cleanupJobId: job.id,
        statusUrl: `/api/slop/cleanup-status/${job.id}`,
      });
    } catch (error: any) {
      console.error("[Slop] POST /slop/:jobId/fix error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
);

/**
 * POST /api/slop/:jobId/ignore
 * Mark the slop report as ignored (user chose to skip cleanup).
 */
router.post(
  "/slop/:jobId/ignore",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const userId = req.user!.userId;

      const report = await hydrateReportFromCompletedJob(jobId, userId);

      if (report === "forbidden") {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!report) {
        return res.status(404).json({ error: "No slop report found" });
      }

      if (report.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (report.status !== "pending") {
        return res
          .status(409)
          .json({ error: `Report is already in '${report.status}' state` });
      }

      await prisma.slopReport.update({
        where: { id: report.id },
        data: { status: "ignored" },
      });

      res.json({ success: true, message: "Report marked as ignored" });
    } catch (error: any) {
      console.error("[Slop] POST /slop/:jobId/ignore error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
);

/**
 * GET /api/slop/cleanup-status/:cleanupJobId
 * Check the status of a slop cleanup job.
 */
router.get(
  "/slop/cleanup-status/:cleanupJobId",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { cleanupJobId } = req.params;

      if (!cleanupJobId || cleanupJobId === "undefined") {
        return res
          .status(400)
          .json({ error: "Valid cleanup job ID is required" });
      }

      const job = await slopCleanupQueue.getJob(cleanupJobId);

      if (!job) {
        return res.status(404).json({ error: "Cleanup job not found" });
      }

      // Verify ownership through the report
      if (job.data.userId !== req.user!.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const state = await job.getState();
      const report = await prisma.slopReport.findFirst({
        where: { cleanupJobId: String(job.id) },
      });

      if (report) {
        if (state === "completed" && report.status !== "fixed") {
          await prisma.slopReport.update({
            where: { id: report.id },
            data: {
              status: "fixed",
              fixedAt: new Date(),
            },
          });
        }

        if (state === "failed" && report.status === "fixing") {
          await prisma.slopReport.update({
            where: { id: report.id },
            data: {
              status: "pending",
              cleanupJobId: null,
            },
          });
        }
      }

      res.json({
        cleanupJobId: job.id,
        state,
        progress: job.progress,
        result: job.returnvalue,
        failedReason: job.failedReason,
      });
    } catch (error: any) {
      console.error("[Slop] GET /slop/cleanup-status error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
);

/**
 * POST /api/slop/save
 * Internal endpoint — called by the worker to persist a slop report after job completes.
 * Auth required to prevent external calls but typically invoked with the job's token.
 */
router.post(
  "/slop/save",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const {
        jobId,
        userId,
        patterns,
        totalCount,
        criticalCount,
        summary,
        canAutoFix,
        repoId,
        branchName,
        prNumber,
      } = req.body;

      if (!jobId || !repoId || !branchName) {
        return res
          .status(400)
          .json({ error: "Missing required fields: jobId, repoId, branchName" });
      }

      const report = await prisma.slopReport.create({
        data: {
          jobId,
          userId: userId || req.user!.userId,
          patterns: patterns || [],
          totalCount: totalCount || 0,
          criticalCount: criticalCount || 0,
          summary: summary || "",
          canAutoFix: canAutoFix ?? true,
          repoId,
          branchName,
          prNumber: prNumber || null,
        },
      });

      console.log(
        `[Slop] Report saved: ${report.id} for job ${jobId} (${totalCount} issues)`
      );

      res.status(201).json({
        id: report.id,
        message: "Slop report saved",
      });
    } catch (error: any) {
      // Handle duplicate jobId gracefully
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ error: "Slop report already exists for this job" });
      }
      console.error("[Slop] POST /slop/save error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
);

export default router;
