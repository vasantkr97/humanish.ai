"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import CodeWorkspace from "@/components/chat/CodeWorkspace";
import SlopReportPanel from "@/components/chat/SlopReportPanel";
import { useJobStatus } from "@/hooks/useJobStatus";
import { getProgressMessages } from "@/lib/progressMessages";
import { useAuth } from "@/contexts/AuthContext";

function ChatContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const { token } = useAuth();
  const { status, error, isLoading } = useJobStatus(jobId, token);
  const [slopDismissed, setSlopDismissed] = useState(false);

  const messages = status
    ? getProgressMessages(status.progress || 0, status.state)
    : [];

  const isCompleted = status?.state === "completed";
  const initialSlopReport = isCompleted ? (status?.result?.slopReport ?? null) : null;
  const showSlopPanel = isCompleted && !slopDismissed;

  if (!jobId) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">
          No job ID provided. Please submit a task from the dashboard.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      <ChatSidebar messages={messages} jobId={jobId} isLoading={isLoading} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <CodeWorkspace
          jobId={jobId}
          status={status}
          isCompleted={isCompleted}
          prUrl={status?.result?.prUrl}
          token={token}
        />
        {showSlopPanel && (
          <div className="flex-shrink-0 overflow-y-auto max-h-[50vh] px-4 md:px-8 pb-6">
            <SlopReportPanel
              jobId={jobId}
              initialSlopReport={initialSlopReport}
              token={token}
              prUrl={status?.result?.prUrl ?? ""}
              onIgnored={() => setSlopDismissed(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
