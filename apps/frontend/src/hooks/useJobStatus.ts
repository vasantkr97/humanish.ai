import { useState, useEffect } from "react";

interface JobStatus {
  jobId: string;
  state: "waiting" | "active" | "completed" | "failed";
  progress: number;
  result?: {
    success: boolean;
    prUrl: string;
    prNumber: number;
  };
}

export function useJobStatus(jobId: string | null, token: string | null) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId || !token) {
      setIsLoading(false);
      return;
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://be.100xswe.app";

    const fetchStatus = async () => {
      try {
        console.log(`[useJobStatus] Fetching status for job: ${jobId}`);
        const response = await fetch(`${backendUrl}/api/status/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(
          `[useJobStatus] Response status: ${response.status} ${response.statusText}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[useJobStatus] Request failed: ${response.status} - ${errorText}`
          );
          throw new Error(
            `Failed to fetch job status: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log(
          `[useJobStatus] Job state: ${data.state}, progress: ${data.progress}`
        );

        setStatus(data);
        setError(null); // Clear any previous errors
        setIsLoading(false);

        if (data.state === "completed" || data.state === "failed") {
          console.log(`[useJobStatus] Job ${data.state}, stopping polling`);
          clearInterval(intervalId);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error(`[useJobStatus] Error fetching status:`, err);
        setError(errorMessage);
        setIsLoading(false);
        if (errorMessage.includes("404")) {
          console.log(
            `[useJobStatus] Job not found (404), stopping polling. Job may have been removed from queue.`
          );
          clearInterval(intervalId);
        }
      }
    };

    fetchStatus();
    const intervalId = setInterval(fetchStatus, 5000); // Reduced from 2000ms to 5000ms

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, token]);

  return { status, error, isLoading };
}
