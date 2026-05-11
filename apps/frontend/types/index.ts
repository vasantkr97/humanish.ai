// User type - matches what backend returns from GitHub OAuth
export interface User {
  id: number;
  username: string;
  email: string;
  name: string | null;
  avatar: string;
  profileUrl: string;
}

// GitHub Repository type - matches GitHub API response
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  fork?: boolean;
  language: string | null;
  stargazers_count?: number;
  updated_at: string;
  defaultBranch?: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface SlopPattern {
  file: string;
  line?: number;
  endLine?: number;
  category:
    | "logic_bug"
    | "security"
    | "code_quality"
    | "inefficiency"
    | "context_mismatch";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  suggestion: string;
  snippet: string;
}

export interface SlopMetrics {
  humanishScore: number;
  verdict: string;
  remainingWorkSummary: string;
  severityBreakdown: Record<SlopPattern["severity"], number>;
  categoryBreakdown: Partial<Record<SlopPattern["category"], number>>;
  topPriorities: string[];
}

export interface SlopReport extends SlopMetrics {
  totalCount: number;
  criticalCount: number;
  byCategory: Partial<Record<SlopPattern["category"], SlopPattern[]>>;
  byFile: Record<string, SlopPattern[]>;
  summary: string;
  canAutoFix: boolean;
}

export interface SlopReportResponse extends SlopReport {
  id: string;
  jobId: string;
  patterns: SlopPattern[];
  repoId: string;
  branchName: string;
  prNumber: number | null;
  status: "pending" | "fixing" | "fixed" | "ignored";
  cleanupJobId: string | null;
  fixedAt: string | null;
  createdAt: string;
}

export interface JobResult {
  success: boolean;
  prUrl: string;
  prNumber: number;
  branchName: string;
  fileDiffs: FileDiff[];
  fileOperations: unknown[];
  explanation: string;
  slopReport: SlopReport | null;
}

export interface FileDiff {
  path: string;
  oldContent: string;
  newContent: string;
  diffOutput: string;
}

export interface Job {
  jobId: string;
  state: "waiting" | "active" | "completed" | "failed";
  progress: number;
  result?: JobResult;
  failedReason?: string | null;
}

export interface ChatResponse {
  message: string;
  indexing: boolean;
  jobId?: string;
  codeGenJobId?: string;
  indexingJobId?: string;
  repoId: string;
  statusUrl: string;
  indexingStatusUrl?: string;
  estimatedTime?: string;
}
