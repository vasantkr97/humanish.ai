"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface Installation {
  installationId: number;
  targetType: string;
  account: {
    login: string;
    avatarUrl: string;
  };
}

function InstallationCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading } = useAuth();
  const [status, setStatus] = useState<"checking" | "success" | "error">(
    "checking"
  );
  const [message, setMessage] = useState("Verifying installation...");

  useEffect(() => {
    // Wait for authentication to be ready
    if (isLoading) return;

    if (!user || !token) {
      setStatus("error");
      setMessage("Authentication failed. Please log in again.");
      return;
    }

    const verifyInstallation = async () => {
      try {
        const installationId = searchParams.get("installation_id");
        const setupAction = searchParams.get("setup_action");

        console.log("[Installation Callback] Installation ID:", installationId);
        console.log("[Installation Callback] Setup Action:", setupAction);

        if (!installationId) {
          throw new Error("No installation ID received");
        }

        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "https://be.100xswe.app";

        // Polling configuration
        const maxAttempts = 15; // 30 seconds total
        const interval = 2000; // 2 seconds
        let attempts = 0;
        let verified = false;

        while (attempts < maxAttempts && !verified) {
          setMessage(
            attempts === 0 ? "Processing installation..." : "Still verifying..."
          );

          try {
            const response = await fetch(`${backendUrl}/installation/list`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const data = await response.json();
              console.log(
                `[Installation Callback] Attempt ${attempts + 1}:`,
                data
              );

              const installation = data.installations?.find(
                (inst: Installation) =>
                  inst.installationId === parseInt(installationId)
              );

              if (installation) {
                console.log(
                  "[Installation Callback] Installation verified!",
                  installation
                );
                setStatus("success");
                setMessage(
                  "Installation successful! Redirecting to dashboard..."
                );
                verified = true;

                // Redirect to dashboard after short delay
                setTimeout(() => {
                  router.push("/dashboard");
                }, 1500);
                return;
              }
            }
          } catch (err) {
            console.warn(
              `[Installation Callback] Attempt ${attempts + 1} failed:`,
              err
            );
          }

          // Wait before next attempt if not verified
          if (!verified) {
            await new Promise((resolve) => setTimeout(resolve, interval));
            attempts++;
          }
        }

        if (!verified) {
          throw new Error(
            "Installation verification timed out. It may still be processing."
          );
        }
      } catch (error: unknown) {
        console.error("[Installation Callback] Error:", error);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to verify installation"
        );

        // Redirect to dashboard anyway after 5 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 5000);
      }
    };

    verifyInstallation();
  }, [searchParams, router, user, token, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Icon */}
          <div className="mb-6">
            {status === "checking" && (
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
            )}
            {status === "success" && (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            )}
            {status === "error" && (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {status === "checking" && "Setting Up Your Installation"}
            {status === "success" && "Installation Complete!"}
            {status === "error" && "Setup Issue"}
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-6">{message}</p>

          {/* Progress indicator */}
          {status === "checking" && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          )}

          {/* Additional info */}
          <p className="text-xs text-gray-500 mt-4">
            {status === "checking" &&
              "This usually takes just a few seconds..."}
            {status === "success" && "Your repositories are now connected!"}
            {status === "error" &&
              "Don't worry, you can complete setup from your dashboard."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function InstallationCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Loading...
              </h2>
            </div>
          </div>
        </div>
      }
    >
      <InstallationCallbackContent />
    </Suspense>
  );
}
