"use client";

import { useEffect, useState } from "react";
import type { SlopPattern, SlopReport, SlopReportResponse } from "@/types";

type SlopCategory = SlopPattern["category"];

const CATEGORY_LABELS: Record<SlopCategory, string> = {
  logic_bug: "Logic Bug",
  security: "Security",
  code_quality: "Code Quality",
  inefficiency: "Inefficiency",
  context_mismatch: "Context Mismatch",
};

const SEVERITY_CONFIG = {
  critical: {
    text: "text-red-700",
    bg: "bg-red-50",
    icon: "Critical",
    label: "CRITICAL",
  },
  high: {
    text: "text-orange-700",
    bg: "bg-orange-50",
    icon: "High",
    label: "HIGH",
  },
  medium: {
    text: "text-yellow-700",
    bg: "bg-yellow-50",
    icon: "Medium",
    label: "MEDIUM",
  },
  low: {
    text: "text-blue-700",
    bg: "bg-blue-50",
    icon: "Low",
    label: "LOW",
  },
} as const;

interface SlopReportPanelProps {
  jobId: string;
  initialSlopReport: SlopReport | null;
  token: string | null;
  prUrl: string;
  onIgnored?: () => void;
}

function toDisplayReport(data: SlopReportResponse): SlopReport {
  return {
    totalCount: data.totalCount,
    criticalCount: data.criticalCount,
    byCategory: data.byCategory,
    byFile: data.byFile,
    summary: data.summary,
    canAutoFix: data.canAutoFix,
    humanishScore: data.humanishScore,
    verdict: data.verdict,
    remainingWorkSummary: data.remainingWorkSummary,
    severityBreakdown: data.severityBreakdown,
    categoryBreakdown: data.categoryBreakdown,
    topPriorities: data.topPriorities,
  };
}

export default function SlopReportPanel({
  jobId,
  initialSlopReport,
  token,
  prUrl,
  onIgnored,
}: SlopReportPanelProps) {
  const [state, setState] = useState<"idle" | "fixing" | "fixed" | "ignored">(
    "idle"
  );
  const [cleanupJobId, setCleanupJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [report, setReport] = useState<SlopReport | null>(initialSlopReport);
  const [isFetchingReport, setIsFetchingReport] = useState(true);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "https://be.100xswe.app";

  useEffect(() => {
    if (!token) {
      setIsFetchingReport(false);
      return;
    }

    let cancelled = false;

    const fetchReport = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/slop/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (!cancelled) {
            setReport(initialSlopReport);
            setIsFetchingReport(false);
          }
          return;
        }

        const data: SlopReportResponse = await response.json();

        if (cancelled) {
          return;
        }

        setReport(toDisplayReport(data));
        setCleanupJobId(data.cleanupJobId);

        if (data.status === "fixed") {
          setState("fixed");
        } else if (data.status === "fixing") {
          setState("fixing");
        } else if (data.status === "ignored") {
          setState("ignored");
        } else {
          setState("idle");
        }
      } catch {
        if (!cancelled) {
          setReport(initialSlopReport);
        }
      } finally {
        if (!cancelled) {
          setIsFetchingReport(false);
        }
      }
    };

    fetchReport();

    return () => {
      cancelled = true;
    };
  }, [backendUrl, initialSlopReport, jobId, token]);

  useEffect(() => {
    if (state !== "fixing" || !cleanupJobId || !token) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${backendUrl}/api/slop/cleanup-status/${cleanupJobId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.state === "completed") {
          clearInterval(interval);
          setState("fixed");
        } else if (data.state === "failed") {
          clearInterval(interval);
          setCleanupJobId(null);
          setError(data.failedReason || "Cleanup job failed");
          setState("idle");
        }
      } catch {
        // Keep polling quietly during transient failures.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [backendUrl, cleanupJobId, state, token]);

  const handleFix = async () => {
    if (!token) return;

    setState("fixing");
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/slop/${jobId}/fix`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to trigger cleanup");
      }

      const data = await response.json();
      setCleanupJobId(data.cleanupJobId);
    } catch (err: any) {
      setError(err.message);
      setState("idle");
    }
  };

  const handleIgnore = async () => {
    if (!token) return;

    try {
      await fetch(`${backendUrl}/api/slop/${jobId}/ignore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setState("ignored");
      onIgnored?.();
    } catch {
      setState("ignored");
      onIgnored?.();
    }
  };

  if (state === "ignored") return null;
  if (isFetchingReport && !report) return null;
  if (!report) return null;

  const bySeverity = {
    critical: [] as SlopPattern[],
    high: [] as SlopPattern[],
    medium: [] as SlopPattern[],
    low: [] as SlopPattern[],
  };

  const patterns = Object.values(report.byFile).flat();
  for (const pattern of patterns) {
    bySeverity[pattern.severity].push(pattern);
  }

  return (
    <div className="mt-6 border border-gray-200 rounded-2xl overflow-hidden bg-background">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">AI</span>
            <div>
              <h3 className="font-semibold text-foreground">Humanish Review</h3>
              <p className="text-sm text-muted-foreground">
                Review of the generated PR: {report.humanishScore}% Humanish
                {report.totalCount > 0 && (
                  <span className="text-red-600 font-medium">
                    {" "}
                    - {report.totalCount} issue
                    {report.totalCount !== 1 ? "s" : ""} left
                  </span>
                )}
              </p>
            </div>
          </div>

          {state === "fixed" && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Cleaned
            </span>
          )}

          {state === "fixing" && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Fixing...
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-3 text-sm text-muted-foreground border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">{report.verdict}</p>
            <p>{report.summary}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Score
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {report.humanishScore}%
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              report.humanishScore >= 90
                ? "bg-green-500"
                : report.humanishScore >= 70
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${report.humanishScore}%` }}
          />
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <p className="text-sm font-medium text-foreground mb-1">
          What is left to reach 100% Humanish
        </p>
        <p className="text-sm text-muted-foreground">
          {report.remainingWorkSummary}
        </p>
        {report.topPriorities.length > 0 && (
          <div className="mt-3 space-y-2">
            {report.topPriorities.map((priority, index) => (
              <div
                key={`${priority}-${index}`}
                className="text-sm text-foreground bg-gray-50 rounded-lg px-3 py-2"
              >
                {index + 1}. {priority}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-4 space-y-2">
        {(["critical", "high", "medium", "low"] as const).map((severity) => {
          const items = bySeverity[severity];
          const count = report.severityBreakdown[severity];
          if (count === 0) return null;

          const config = SEVERITY_CONFIG[severity];

          return (
            <div
              key={severity}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${config.bg}`}
            >
              <span>{config.icon}</span>
              <span className={`font-semibold text-sm ${config.text}`}>
                {config.label} ({count})
              </span>
              <span className="text-sm text-muted-foreground">
                {items.map((item) => CATEGORY_LABELS[item.category]).join(", ")}
              </span>
            </div>
          );
        })}
      </div>

      {Object.keys(report.categoryBreakdown).length > 0 && (
        <div className="px-6 pb-4">
          <p className="text-sm font-medium text-foreground mb-2">
            Slop by Category
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(report.categoryBreakdown).map(([category, count]) => (
              <span
                key={category}
                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-foreground"
              >
                {CATEGORY_LABELS[category as SlopCategory]}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {report.totalCount > 0 && (
        <div className="px-6 pb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-foreground hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            {expanded ? "v" : ">"} View Full Report with Suggestions
          </button>
        </div>
      )}

      {expanded && report.totalCount > 0 && (
        <div className="px-6 pb-4 space-y-4">
          {Object.entries(report.byFile).map(([file, filePatterns]) => (
            <div
              key={file}
              className="border border-gray-100 rounded-lg overflow-hidden"
            >
              <div className="px-4 py-2 bg-gray-50 font-mono text-sm text-foreground flex items-center justify-between">
                <span>{file}</span>
                <span className="text-muted-foreground text-xs">
                  {filePatterns.length} issue
                  {filePatterns.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {filePatterns.map((pattern, idx) => {
                  const config = SEVERITY_CONFIG[pattern.severity];

                  return (
                    <div key={idx} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.text} ${config.bg}`}
                        >
                          {config.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-muted-foreground">
                          {CATEGORY_LABELS[pattern.category]}
                        </span>
                        {pattern.line && (
                          <span className="text-xs text-muted-foreground">
                            Line {pattern.line}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground">
                        {pattern.description}
                      </p>
                      <div className="bg-gray-50 rounded px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Suggested Fix:
                        </p>
                        <p className="text-sm text-foreground">
                          {pattern.suggestion}
                        </p>
                      </div>
                      {pattern.snippet && (
                        <pre className="text-xs bg-gray-900 text-gray-100 rounded px-3 py-2 overflow-x-auto">
                          <code>{pattern.snippet}</code>
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {report.totalCount === 0 && (
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-xl px-4 py-3">
            <span className="text-lg">Done</span>
            <div>
              <p className="font-medium">This feature is 100% Humanish</p>
              <p className="text-sm text-green-600">
                No slop cleanup is needed for this generated code.
              </p>
            </div>
          </div>
        </div>
      )}

      {report.totalCount > 0 && state === "idle" && (
        <div className="px-6 py-4 border-t border-gray-100">
          {!report.canAutoFix && (
            <div className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Some findings need human judgment, so this PR review can be shown
              automatically but cannot be safely auto-fixed.
            </div>
          )}

          <div className="flex items-center gap-3">
          <button
            onClick={handleFix}
            disabled={!report.canAutoFix}
            className="flex-1 bg-foreground text-background font-semibold py-3 px-6 rounded-xl transition-all hover:bg-gray-800 hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-foreground disabled:hover:shadow-none disabled:active:scale-100"
          >
            {report.canAutoFix
              ? "Make This PR Humanish"
              : "Needs Manual Review"}
          </button>
          <button
            onClick={handleIgnore}
            className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-xl transition-colors"
          >
            Keep Current PR
          </button>
          </div>
        </div>
      )}

      {state === "fixed" && (
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-xl px-4 py-3">
            <span className="text-lg">Done</span>
            <div>
              <p className="font-medium">PR Updated</p>
              <p className="text-sm text-green-600">
                The follow-up cleanup pass updated the PR to make it more Humanish.
              </p>
            </div>
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              View PR
            </a>
          </div>
        </div>
      )}

      {error && (
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-sm text-red-600">Warning: {error}</p>
        </div>
      )}
    </div>
  );
}
