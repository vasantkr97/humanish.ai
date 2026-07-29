import { useState, useEffect, useRef } from "react";
import type { Job } from "@/types";

export function useJobStatus(jobId: string | null, token: string | null) {
  const [status, setStatus] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs to manage the interval and backoff without re-renders
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(10000); // Start at 10s
  const isFinalRef = useRef(false);

  useEffect(() => {
    if (!jobId || !token) {
      setIsLoading(false);
      return;
    }

    isFinalRef.current = false;
    backoffRef.current = 10000;
    setIsLoading(true);

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://be.100xswe.app";

    const scheduleNext = (delay: number) => {
      if (isFinalRef.current) return;
      intervalRef.current = setTimeout(fetchStatus, delay);
    };

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `${backendUrl}/api/status/${jobId}?t=${Date.now()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );

        // Rate-limited — back off silently, do NOT set error
        if (response.status === 429) {
          backoffRef.current = Math.min(backoffRef.current * 2, 60000); // max 60s
          console.warn(
            `[useJobStatus] 429 rate limit — backing off to ${backoffRef.current / 1000}s`
          );
          scheduleNext(backoffRef.current);
          return;
        }

        // Reset backoff on successful response
        backoffRef.current = 10000;

        if (!response.ok) {
          const errorText = await response.text();
          const msg = `Failed to fetch job status: ${response.status} ${response.statusText}`;
          console.error(`[useJobStatus] ${msg} — ${errorText}`);

          // 404 = job was removed from queue, stop polling
          if (response.status === 404) {
            isFinalRef.current = true;
            setError("Job not found. It may have expired.");
            setIsLoading(false);
            return;
          }

          // For other errors, show error but keep polling (transient server errors)
          setError(msg);
          setIsLoading(false);
          scheduleNext(15000); // slower retry on server errors
          return;
        }

        const data: Job = await response.json();
        console.log(
          `[useJobStatus] state=${data.state} progress=${data.progress}`
        );

        setStatus(data);
        setError(null);
        setIsLoading(false);

        if (data.state === "completed" || data.state === "failed") {
          console.log(`[useJobStatus] Job ${data.state} — stopping polling`);
          isFinalRef.current = true;
          return; // no reschedule
        }

        scheduleNext(10000); // Normal 10s interval
      } catch (err) {
        // Network error — retry silently
        const msg = err instanceof Error ? err.message : "Network error";
        console.error(`[useJobStatus] Fetch error:`, msg);
        scheduleNext(15000);
      }
    };

    // Initial fetch immediately
    fetchStatus();

    return () => {
      isFinalRef.current = true;
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [jobId, token]);

  return { status, error, isLoading };
}
