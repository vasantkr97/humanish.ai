import { useState, useEffect, useRef } from "react";

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
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDelayRef = useRef(10000); // Start at 10s

  useEffect(() => {
    if (!jobId || !token) {
      setIsLoading(false);
      return;
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    const stopPolling = () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const scheduleNext = (delay: number) => {
      stopPolling();
      intervalRef.current = setTimeout(fetchStatus, delay);
    };

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

        if (response.status === 429) {
          // Rate limited — back off exponentially up to 60s
          currentDelayRef.current = Math.min(currentDelayRef.current * 2, 60000);
          console.warn(
            `[useJobStatus] Rate limited (429). Backing off to ${currentDelayRef.current / 1000}s`
          );
          scheduleNext(currentDelayRef.current);
          return;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[useJobStatus] Request failed: ${response.status} - ${errorText}`
          );
          throw new Error(
            `Failed to fetch job status: ${response.status} ${response.statusText}`
          );
        }

        // Success — reset delay back to normal
        currentDelayRef.current = 10000;

        const data = await response.json();
        console.log(
          `[useJobStatus] Job state: ${data.state}, progress: ${data.progress}`
        );

        setStatus(data);
        setError(null);
        setIsLoading(false);

        if (data.state === "completed" || data.state === "failed") {
          console.log(`[useJobStatus] Job ${data.state}, stopping polling`);
          stopPolling();
        } else {
          scheduleNext(currentDelayRef.current);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error(`[useJobStatus] Error fetching status:`, err);
        setError(errorMessage);
        setIsLoading(false);
        if (errorMessage.includes("404")) {
          console.log(
            `[useJobStatus] Job not found (404), stopping polling.`
          );
          stopPolling();
        } else {
          // Retry after backoff
          scheduleNext(currentDelayRef.current);
        }
      }
    };

    fetchStatus();

    return () => {
      stopPolling();
    };
  }, [jobId, token]);

  return { status, error, isLoading };
}
