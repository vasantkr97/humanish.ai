"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { GitHubRepo, ChatResponse } from "@/types";
import Image from "next/image";
import octopusLogo from "@/assets/octopus.png";

export default function Dashboard() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();

  // State management
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [task, setTask] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<ChatResponse | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const fetchRepositories = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingRepos(true);
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://be.100xswe.app";

      const response = await fetch(`${backendUrl}/auth/repos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }

      const data = await response.json();
      setRepos(data.repos);
      setFilteredRepos(data.repos);
    } catch (error) {
      console.error("[Dashboard] Error fetching repos:", error);
      alert("Failed to fetch repositories. Please try again.");
    } finally {
      setLoadingRepos(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      fetchRepositories();
    }
  }, [user, token, fetchRepositories]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRepos(repos);
    } else {
      const filtered = repos.filter(
        (repo) =>
          repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          repo.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRepos(filtered);
    }
  }, [searchQuery, repos]);

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setSearchQuery(repo.full_name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRepo || !task.trim()) {
      alert("Please select a repository and describe your task");
      return;
    }

    setIsSubmitting(true);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://be.100xswe.app";
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoUrl: selectedRepo.html_url,
          task: task,
        }),
      });

      const data = await response.json();
      setJobStatus(data);

      setTask("");

      // Handle both response formats: indexing (codeGenJobId) and direct (jobId)
      const actualJobId = data.codeGenJobId || data.jobId;

      setTimeout(() => {
        router.push(`/chat?jobId=${actualJobId}`);
      }, 1500);
    } catch (error) {
      console.error("Error submitting task:", error);
      alert("Failed to submit task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // Show loading only while auth is resolving
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-foreground border-t-transparent mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything (useEffect will redirect to "/")
  if (!user) {
    return null;
  }

  // Show loading while fetching repos (only for authenticated users)
  if (loadingRepos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-foreground border-t-transparent mb-4"></div>
          <p className="text-muted-foreground text-sm">
            Fetching repositories...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={octopusLogo}
              alt="100xSWE Logo"
              width={36}
              height={36}
            />
            <h1 className="text-xl font-bold text-foreground">100xSWE</h1>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">
                {user.name || user.username}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <img
              src={user.avatar}
              alt={user.username}
              className="w-9 h-9 rounded-full ring-2 ring-gray-200"
            />
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-100 rounded-full transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            What would you like to build today?
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Repository Selector */}
          <div className="relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="w-5 h-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search repositories..."
                className="text-foreground w-full pl-12 pr-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none bg-background text-base transition-shadow hover:shadow-sm"
              />
              {selectedRepo && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <span className="px-2 py-1 bg-gray-100 text-foreground rounded-lg text-xs font-medium">
                    {selectedRepo.language || "Code"}
                  </span>
                </div>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && filteredRepos.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-background border border-gray-200 rounded-2xl shadow-xl max-h-72 overflow-y-auto">
                {filteredRepos.map((repo, index) => (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => handleRepoSelect(repo)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      index === 0 ? "rounded-t-2xl" : ""
                    } ${index === filteredRepos.length - 1 ? "rounded-b-2xl" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {repo.full_name}
                        </p>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {repo.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {repo.language && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-foreground rounded-lg">
                            {repo.language}
                          </span>
                        )}
                        {repo.private && (
                          <span className="px-2 py-1 text-xs bg-foreground text-background rounded-lg">
                            Private
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && filteredRepos.length === 0 && searchQuery && (
              <div className="absolute z-10 w-full mt-2 bg-background border border-gray-200 rounded-2xl shadow-xl p-6">
                <p className="text-muted-foreground text-center text-sm">
                  No repositories match your search
                </p>
              </div>
            )}

            {/* No repos message */}
            {!loadingRepos && repos.length === 0 && !searchQuery && (
              <div className="mt-4 bg-gray-50 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-foreground"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      No Repositories Found
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Install the GitHub App to access your repositories.
                    </p>
                    <button
                      onClick={() => {
                        window.location.href =
                          "https://github.com/apps/100xSWE/installations/new";
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background font-medium rounded-full transition-colors hover:bg-gray-800"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Install GitHub App
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDropdown && (
              <div
                className="fixed inset-0 z-0"
                onClick={() => setShowDropdown(false)}
              />
            )}
          </div>

          {/* Task Description */}
          <div>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              rows={6}
              className="text-foreground w-full px-4 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none outline-none bg-background text-base transition-shadow hover:shadow-sm"
            />
            <div className="flex items-center justify-between mt-2">
              {selectedRepo && (
                <p className="text-sm text-muted-foreground">
                  Working on{" "}
                  <span className="font-medium text-foreground">
                    {selectedRepo.name}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedRepo || !task.trim() || isSubmitting}
            className="w-full bg-foreground text-background font-semibold py-4 px-6 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-gray-800 hover:shadow-lg active:scale-[0.99]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating...
              </span>
            ) : (
              "Generate Code"
            )}
          </button>
        </form>

        {/* Job Status Display */}
        {jobStatus && (
          <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-foreground rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-background"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">
                  Task Submitted
                </h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Job ID:{" "}
                    <span className="font-mono text-foreground">
                      {jobStatus.jobId || jobStatus.codeGenJobId}
                    </span>
                  </p>
                  <p>
                    Status:{" "}
                    <span className="text-foreground">{jobStatus.message}</span>
                  </p>
                  {jobStatus.indexing && (
                    <div className="mt-3 flex items-center gap-2 text-foreground">
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Indexing repository...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
