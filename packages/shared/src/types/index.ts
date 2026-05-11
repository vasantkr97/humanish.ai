import { z } from "zod";

// File operation schemas
export const FileOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("createFile"),
    path: z.string().describe("File path relative to project root"),
    content: z.string().describe("Complete file content"),
  }),
  z.object({
    type: z.literal("rewriteFile"),
    path: z.string().describe("File path to rewrite"),
    content: z.string().describe("New complete file content"),
  }),
  z.object({
    type: z.literal("updateFile"),
    path: z.string().describe("File path to update"),
    searchReplace: z
      .array(
        z.object({
          search: z.string().describe("Text to search for"),
          replace: z.string().describe("Text to replace with"),
        })
      )
      .describe("Array of search/replace operations"),
  }),
  z.object({
    type: z.literal("deleteFile"),
    path: z.string().describe("File path to delete"),
  }),
]);

// Generation schema for AI output
export const GenerationSchema = z.object({
  fileOperations: z
    .array(FileOperationSchema)
    .describe("Array of file operations to execute in order"),
  shellCommands: z
    .array(z.string())
    .describe("Shell commands to run (e.g., npm install package-name)"),
  explanation: z
    .string()
    .describe("Brief explanation of what was created or modified"),
});

// Export types
export type FileOperation = z.infer<typeof FileOperationSchema>;
export type GenerateOutput = z.infer<typeof GenerationSchema>;

// === Slop Analysis Types ===

export const SlopCategoryValues = [
  "logic_bug",
  "security",
  "code_quality",
  "inefficiency",
  "context_mismatch",
] as const;

export type SlopCategory = (typeof SlopCategoryValues)[number];

export const SlopSeverityValues = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type SlopSeverity = (typeof SlopSeverityValues)[number];

export interface SlopPattern {
  file: string;
  line?: number;
  endLine?: number;
  category: SlopCategory;
  severity: SlopSeverity;
  description: string;
  suggestion: string;
  snippet: string;
}

export interface SlopMetrics {
  humanishScore: number;
  verdict: string;
  remainingWorkSummary: string;
  severityBreakdown: Record<SlopSeverity, number>;
  categoryBreakdown: Partial<Record<SlopCategory, number>>;
  topPriorities: string[];
}

export interface SlopReport extends SlopMetrics {
  totalCount: number;
  criticalCount: number;
  byCategory: Partial<Record<SlopCategory, SlopPattern[]>>;
  byFile: Record<string, SlopPattern[]>;
  summary: string;
  canAutoFix: boolean;
}

export type SlopReportStatus = "pending" | "fixing" | "fixed" | "ignored";

const severityPenalty: Record<SlopSeverity, number> = {
  critical: 35,
  high: 20,
  medium: 10,
  low: 4,
};

function buildVerdict(score: number): string {
  if (score >= 100) return "100% Humanish";
  if (score >= 90) return "Almost Humanish";
  if (score >= 75) return "Mostly Humanish";
  if (score >= 50) return "Needs Human Review";
  return "Heavy AI Slop Detected";
}

function buildRemainingWorkSummary(
  score: number,
  severityBreakdown: Record<SlopSeverity, number>,
  totalCount: number
): string {
  if (totalCount === 0) {
    return "No slop was detected. This feature is already 100% Humanish.";
  }

  if (severityBreakdown.critical > 0) {
    return `Resolve ${severityBreakdown.critical} critical issue(s) first, then clean up the remaining ${totalCount - severityBreakdown.critical} issue(s) to reach 100% Humanish.`;
  }

  if (severityBreakdown.high > 0) {
    return `Fix the ${severityBreakdown.high} high-severity issue(s) first, then address the remaining lower-priority items to move this feature toward 100% Humanish.`;
  }

  if (score >= 90) {
    return `Only ${totalCount} low/medium issue(s) remain. A small cleanup pass should bring this feature to 100% Humanish.`;
  }

  return `Address the ${totalCount} remaining issue(s), starting with medium-severity findings, to make this feature fully Humanish.`;
}

export function createSlopMetrics(patterns: SlopPattern[]): SlopMetrics {
  const severityBreakdown: Record<SlopSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const categoryBreakdown: Partial<Record<SlopCategory, number>> = {};

  for (const pattern of patterns) {
    severityBreakdown[pattern.severity] += 1;
    categoryBreakdown[pattern.category] =
      (categoryBreakdown[pattern.category] || 0) + 1;
  }

  const totalPenalty = patterns.reduce(
    (sum, pattern) => sum + severityPenalty[pattern.severity],
    0
  );

  const humanishScore = Math.max(0, Math.min(100, 100 - totalPenalty));
  const verdict = buildVerdict(humanishScore);
  const remainingWorkSummary = buildRemainingWorkSummary(
    humanishScore,
    severityBreakdown,
    patterns.length
  );

  const topPriorities = Array.from(
    new Set(
      patterns
        .filter(
          (pattern) =>
            pattern.severity === "critical" || pattern.severity === "high"
        )
        .map((pattern) => pattern.suggestion)
        .concat(
          patterns
            .filter((pattern) => pattern.severity === "medium")
            .map((pattern) => pattern.suggestion)
        )
    )
  ).slice(0, 3);

  return {
    humanishScore,
    verdict,
    remainingWorkSummary,
    severityBreakdown,
    categoryBreakdown,
    topPriorities,
  };
}

// Zod schemas for slop analysis structured output (used by worker)
export const SlopPatternSchema = z.object({
  file: z.string().describe("Relative file path"),
  line: z.number().optional().describe("Approximate line number"),
  endLine: z.number().optional().describe("End line number if span"),
  category: z
    .enum(SlopCategoryValues)
    .describe("Category of the slop pattern"),
  severity: z.enum(SlopSeverityValues).describe("Severity level"),
  description: z.string().describe("What is wrong - be specific"),
  suggestion: z.string().describe("How to fix it - actionable, concrete"),
  snippet: z.string().describe("The exact problematic code snippet"),
});

export const SlopAnalysisOutputSchema = z.object({
  patterns: z.array(SlopPatternSchema).describe("All identified slop patterns"),
  summary: z.string().describe("1-2 sentence summary of findings"),
  canAutoFix: z
    .boolean()
    .describe(
      "Whether all issues can be safely auto-fixed without human review"
    ),
});
