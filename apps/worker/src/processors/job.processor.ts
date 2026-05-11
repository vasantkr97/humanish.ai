import Redis from "ioredis";
import { Queue } from "bullmq";
import { traceable } from "langsmith/traceable";
import { GitHubService } from "../services/github.service";
import { GitService } from "../services/git.service";
import { SandboxService } from "../services/sandbox.service";
import { AIService } from "../services/ai.service";
import { generateBranchName, extractKeywords } from "../utils/helpers";
import { EnhancedCodeGraphService } from "../services/code_graph.service";
import { CodeSkeletonService } from "../services/code_skeleton";
import { createCodeValidationGraph } from "../workflows/code_validation";

export class JobProcessor {
  private redis: Redis;
  private gitService: GitService;
  private sandboxService: SandboxService;
  private aiService: AIService;
  private indexingQueue: Queue;

  constructor(redis: Redis) {
    this.redis = redis;
    this.gitService = new GitService();
    this.sandboxService = new SandboxService();
    this.aiService = new AIService();
    this.indexingQueue = new Queue("indexing", { connection: redis });
  }

  async process(job: any): Promise<{
    success: boolean;
    prUrl: string;
    prNumber: number;
    fileDiffs: Array<{
      path: string;
      oldContent: string;
      newContent: string;
      diffOutput: string;
    }>;
    fileOperations: any[];
    explanation: string;
  }> {
    // Wrap entire job in a LangSmith trace for per-job token tracking
    return traceable(
      async () => {
        const {
          repoUrl,
          parentRepoUrl,
          task,
          repoId,
          parentRepoId,
          isFork,
          indexingJobId,
          githubToken,
        } = job.data;
        const projectId = `job-${job.id}`;

        console.log(`Processing job ${job.id}: ${task}`);
        console.log(`Repository ID: ${repoId}`);
        console.log(
          `Workflow: ${isFork ? "FORK (cross-repo PR)" : "SAME-REPO (same-repo PR)"}`
        );
        if (isFork) {
          console.log(`  Fork: ${repoId}`);
          console.log(`  Parent: ${parentRepoId}`);
        }

        if (!githubToken) {
          throw new Error(
            "No GitHub token available. Please ensure you're logged in with GitHub."
          );
        }

        const githubService = new GitHubService(githubToken);
        console.log(`Using user OAuth token for GitHub operations`);

        try {
          if (indexingJobId) {
            console.log(
              `Waiting for indexing job ${indexingJobId} to complete...`
            );
            await this.waitForIndexing(indexingJobId);
            console.log(
              `Indexing complete! Proceeding with code generation...`
            );
          }
          await job.updateProgress(10);
          console.log("Step 1: Creating sandbox...");
          const sandbox =
            await this.sandboxService.getOrCreateSandbox(projectId);

          await job.updateProgress(20);
          console.log("Step 2: Cloning repository...");
          const repoPath = await this.gitService.cloneRepository(
            sandbox,
            repoUrl,
            githubToken
          );

          console.log("Step 3.5: Detecting package manager...");
          const packageManager = await this.sandboxService.detectPackageManager(
            sandbox,
            repoPath
          );
          console.log(`Detected package manager: ${packageManager}\n`);

          await job.updateProgress(40);
          console.log("Step 4: Finding relevant files using Hybrid Search...");
          const relevantFiles = await this.aiService.findRelevantFilesHybrid(
            this.redis,
            repoId,
            task,
            20
          );

          if (relevantFiles.length === 0) {
            throw new Error(
              "No relevant files found. Repository may not be indexed yet."
            );
          }

          console.log(
            "Step 4.5:Building the code graph and code skeletons for candidate files"
          );
          const graphService = new EnhancedCodeGraphService();
          const codeSkeletonService = new CodeSkeletonService();

          const candidateContents = await this.sandboxService.getFileContents(
            sandbox,
            relevantFiles,
            Infinity,
            repoPath
          );
          const codeGraph = graphService.buildGraph(candidateContents);
          console.log(
            `Code graph built: ${codeGraph.nodes.size} nodes extracted`
          );

          console.log("\nStep 4.6: Finding dependent files...");
          const dependentFiles = graphService.findDependentFiles(
            codeGraph,
            relevantFiles,
            relevantFiles
          );

          const skeletons = new Map<string, string>();

          if (dependentFiles.length > 0) {
            console.log(`Found ${dependentFiles.length} dependent files:`);
            dependentFiles.forEach((file, idx) => {
              console.log(`  ${idx + 1}. ${file}`);
            });

            const dependentContents = await this.sandboxService.getFileContents(
              sandbox,
              dependentFiles,
              Infinity,
              repoPath
            );

            const allCandidateContents = new Map([
              ...candidateContents,
              ...dependentContents,
            ]);
            const expandedCodeGraph =
              graphService.buildGraph(allCandidateContents);
            console.log(
              `Expanded code graph: ${expandedCodeGraph.nodes.size} nodes (including dependents)`
            );

            relevantFiles.forEach((filePath) => {
              const skeleton = codeSkeletonService.generateSkeleton(
                expandedCodeGraph,
                filePath
              );
              const formatted =
                codeSkeletonService.formatSkeletonForLLM(skeleton);
              skeletons.set(filePath, `[CANDIDATE FILE]\n${formatted}`);
            });

            dependentFiles.forEach((filePath) => {
              const skeleton = codeSkeletonService.generateSkeleton(
                expandedCodeGraph,
                filePath
              );
              const formatted =
                codeSkeletonService.formatSkeletonForLLM(skeleton);
              skeletons.set(filePath, `[DEPENDENT FILE]\n${formatted}`);
            });

            console.log(
              `Generated ${skeletons.size} code skeletons (${relevantFiles.length} candidates + ${dependentFiles.length} dependents)`
            );
          } else {
            console.log("No dependent files found.");

            relevantFiles.forEach((filePath) => {
              const skeleton = codeSkeletonService.generateSkeleton(
                codeGraph,
                filePath
              );
              const formatted =
                codeSkeletonService.formatSkeletonForLLM(skeleton);
              skeletons.set(filePath, formatted);
            });
            console.log(`Generated ${skeletons.size} code skeletons`);
          }

          console.log("Step 5: Selecting files to modify...");
          const keywords = extractKeywords(task);
          let filesToModify =
            await this.aiService.selectFilesToModifyWithSkeletons(
              task,
              skeletons,
              repoPath
            );

          if (filesToModify.length === 0) {
            console.warn(
              "\nFallback: LLM selected 0 files, using hybrid search results"
            );

            const topN = Math.min(5, relevantFiles.length);
            filesToModify = relevantFiles.slice(0, topN);

            console.log(
              `Selected top ${filesToModify.length} files from hybrid search`
            );
            filesToModify.forEach((file, idx) => {
              console.log(`  ${idx + 1}. ${file}`);
            });
            console.log("");
          }

          await job.updateProgress(60);
          console.log("Step 6: Analyzing files (existing vs new)...");
          const { existingFiles, newFiles } =
            await this.sandboxService.separateExistingAndNewFiles(
              sandbox,
              filesToModify,
              repoPath
            );

          console.log("Step 6.5: Reading existing file contents...");
          const fileContents =
            existingFiles.length > 0
              ? await this.sandboxService.getFileContents(
                  sandbox,
                  existingFiles,
                  Infinity,
                  repoPath
                )
              : new Map<string, string>();
          const allFiles = await this.sandboxService.getFileTree(
            sandbox,
            repoPath
          );

          await job.updateProgress(70);
          console.log("\nStep 7: Starting LangGraph Code Generation Workflow");

          const branchName = generateBranchName(task);
          const graph = createCodeValidationGraph();

          const workflowResult = await graph.invoke(
            {
              repoUrl: parentRepoUrl || repoUrl,
              repoId: parentRepoId || repoId,
              task,
              forkUrl: repoUrl,
              forkOwner: repoId.split("/")[0],
              branchName,
              isFork: isFork || false,
              packageManager,
              relevantFiles,
              filesToModify,
              fileContents, // Only existing files with content
              newFiles, // List of files to be created
              allFiles,
              keywords,
              codeSkeletons: skeletons,
              sandbox,
              repoPath,
              projectId,
              githubToken,
              currentIteration: 0,
              maxIterations: 3,
              validationErrors: [],
              typeErrors: [],
              syntaxErrors: [],
              allValidationsPassed: false,
              status: "generating" as const,
              generatedCode: null,
              prUrl: null,
              prNumber: null,
              errorMessage: null,
            },
            { runName: `CodeValidation-Job-${job.id}` }
          );

          console.log("\nLangGraph Workflow Completed");
          console.log(`Final Status: ${workflowResult.status}`);
          console.log(
            `Iterations: ${workflowResult.currentIteration}/${workflowResult.maxIterations}`
          );
          console.log(
            `Validations Passed: ${workflowResult.allValidationsPassed}`
          );

          if (workflowResult.status !== "success" || !workflowResult.prUrl) {
            const errorMsg =
              workflowResult.errorMessage ||
              "Workflow failed to generate valid code";
            console.error(`\nWorkflow failed: ${errorMsg}`);
            throw new Error(errorMsg);
          }

          console.log(`\nPR Created: ${workflowResult.prUrl}`);
          console.log(`PR Number: #${workflowResult.prNumber}`);

          // Log slop analysis results
          const slopReport = workflowResult.slopReport ?? null;
          if (slopReport) {
            if (slopReport.totalCount === 0) {
              console.log(
                `\nSlop Analysis: ${slopReport.humanishScore}% Humanish (${slopReport.verdict})`
              );
            } else {
              console.log(
                `\nSlop Analysis: ${slopReport.totalCount} issue(s) found (${slopReport.criticalCount} critical, ${slopReport.humanishScore}% Humanish)`
              );
            }
          } else {
            console.log("\nSlop Analysis: No issues found (or analysis skipped)");
          }

          console.log("\nStep 8: Generating file diffs...");
          const fileDiffs = await this.getFileDiffs(
            sandbox,
            repoPath,
            workflowResult.generatedCode?.fileOperations || []
          );
          console.log(`Generated diffs for ${fileDiffs.length} files`);

          await job.updateProgress(100);
          console.log("\nSandbox will remain active for 30 minutes");

          console.log(`\nJob ${job.id} completed successfully!`);

          return {
            success: true,
            prUrl: workflowResult.prUrl,
            prNumber: workflowResult.prNumber!,
            branchName: workflowResult.branchName,
            fileDiffs,
            fileOperations: workflowResult.generatedCode?.fileOperations || [],
            explanation: workflowResult.generatedCode?.explanation || "",
            slopReport,
          };
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          await this.sandboxService.cleanup(projectId);
          throw error;
        }
      },
      {
        name: `Humanish Job #${job.id}`,
        run_type: "chain",
        metadata: {
          jobId: job.id,
          repoUrl: job.data.repoUrl,
          task: job.data.task,
          repoId: job.data.repoId,
        },
      }
    )();
  }

  private async getFileDiffs(
    sandbox: any,
    repoPath: string,
    fileOperations: any[]
  ): Promise<
    Array<{
      path: string;
      oldContent: string;
      newContent: string;
      diffOutput: string;
    }>
  > {
    const diffs: Array<{
      path: string;
      oldContent: string;
      newContent: string;
      diffOutput: string;
    }> = [];

    const excludePatterns = [
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "Cargo.lock",
      "Gemfile.lock",
      "composer.lock",
      "poetry.lock",
      "Pipfile.lock",
      "go.sum",
      "mix.lock",
      "pubspec.lock",
      ".lock",
    ];

    const shouldExcludeFile = (filePath: string): boolean => {
      return excludePatterns.some(
        (pattern) =>
          filePath.endsWith(pattern) || filePath.includes(`/${pattern}`)
      );
    };

    for (const op of fileOperations) {
      try {
        if (shouldExcludeFile(op.path)) {
          console.log(`Skipping excluded file: ${op.path}`);
          continue;
        }

        const filePath = `${repoPath}/${op.path}`;

        let newContent = "";
        try {
          const readResult = await sandbox.files.read(filePath);
          newContent = readResult || "";
        } catch (error) {
          newContent = "";
        }

        let oldContent = "";
        try {
          const gitShowResult = await sandbox.commands.run(
            `cd ${repoPath} && git show HEAD:${op.path}`
          );
          oldContent = gitShowResult.stdout || "";
        } catch (error) {
          oldContent = "";
        }

        let diffOutput = "";
        try {
          let baseBranch = "main";
          try {
            const branchListResult = await sandbox.commands.run(
              `cd ${repoPath} && git branch -r`
            );
            const remoteBranches = branchListResult.stdout || "";
            if (
              remoteBranches.includes("origin/master") &&
              !remoteBranches.includes("origin/main")
            ) {
              baseBranch = "master";
            }
          } catch (e) {
            console.warn("Failed to detect default branch, using main");
          }

          console.log(
            `Generating diff for ${op.path} against origin/${baseBranch}...`
          );

          const gitDiffResult = await sandbox.commands.run(
            `cd ${repoPath} && git diff origin/${baseBranch}...HEAD -- ${op.path}`
          );
          diffOutput = gitDiffResult.stdout || "";

          if (!diffOutput) {
            if (!oldContent && newContent) {
              const lines = newContent.split("\n");
              diffOutput = `diff --git a/${op.path} b/${op.path}\n`;
              diffOutput += `new file mode 100644\n`;
              diffOutput += `--- /dev/null\n`;
              diffOutput += `+++ b/${op.path}\n`;
              diffOutput += `@@ -0,0 +1,${lines.length} @@\n`;
              diffOutput += lines.map((line) => `+${line}`).join("\n");
            } else if (oldContent && !newContent) {
              const lines = oldContent.split("\n");
              diffOutput = `diff --git a/${op.path} b/${op.path}\n`;
              diffOutput += `deleted file mode 100644\n`;
              diffOutput += `--- a/${op.path}\n`;
              diffOutput += `+++ /dev/null\n`;
              diffOutput += `@@ -1,${lines.length} +0,0 @@\n`;
              diffOutput += lines.map((line) => `-${line}`).join("\n");
            }
          }
        } catch (error) {
          console.warn(`Failed to generate git diff for ${op.path}:`, error);
          diffOutput = "";
        }

        diffs.push({
          path: op.path,
          oldContent,
          newContent,
          diffOutput,
        });
      } catch (error) {
        console.warn(`Failed to get diff for ${op.path}:`, error);
        diffs.push({
          path: op.path,
          oldContent: "",
          newContent: "",
          diffOutput: "",
        });
      }
    }

    return diffs;
  }

  private async waitForIndexing(indexingJobId: string): Promise<void> {
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes max
    const pollInterval = 5000; // Check every 5 seconds
    const startTime = Date.now();

    console.log(`Waiting for indexing job ${indexingJobId}...`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexingJob = await this.indexingQueue.getJob(indexingJobId);

        if (!indexingJob) {
          throw new Error(`Indexing job ${indexingJobId} not found`);
        }

        const state = await indexingJob.getState();
        const progress = indexingJob.progress || 0;

        console.log(`Indexing status: ${state} (${progress}%)`);

        if (state === "completed") {
          console.log(`Indexing completed successfully!`);
          return;
        }

        if (state === "failed") {
          const reason = indexingJob.failedReason || "Unknown error";
          throw new Error(`Indexing failed: ${reason}`);
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`Error checking indexing status:`, error);
        throw error;
      }
    }

    throw new Error(
      `Indexing timeout: Job ${indexingJobId} took longer than ${maxWaitTime / 1000 / 60} minutes`
    );
  }

  /**
   * Process a slop cleanup job.
   * Targets only the identified slop patterns and pushes fixes to the same PR branch.
   */
  async processCleanup(job: any): Promise<{
    success: boolean;
    fixedCount: number;
    branchName: string;
  }> {
    const {
      slopReportId,
      originalJobId,
      repoId,
      branchName,
      prNumber,
      githubToken,
      patterns,
    } = job.data;

    console.log(`Processing slop cleanup for report ${slopReportId}`);
    console.log(`  Repository: ${repoId}`);
    console.log(`  Branch: ${branchName}`);
    console.log(`  Patterns to fix: ${Array.isArray(patterns) ? patterns.length : 0}`);

    const projectId = `slop-cleanup-${job.id}`;

    try {
      // Step 1: Create sandbox
      console.log("\nStep 1: Creating sandbox...");
      const sandbox = await this.sandboxService.getOrCreateSandbox(projectId);
      console.log("Sandbox ready");

      // Step 2: Clone repo and checkout existing branch
      console.log("\nStep 2: Cloning repository...");
      const repoUrl = `https://github.com/${repoId}`;
      const repoPath = await this.gitService.cloneRepository(
        sandbox,
        repoUrl,
        githubToken
      );

      // Checkout the existing branch (not creating a new one)
      console.log(`Checking out branch: ${branchName}`);
      await sandbox.commands.run(
        `cd '${repoPath}' && git fetch origin '${branchName}' && git checkout -B '${branchName}' 'origin/${branchName}'`
      );
      console.log("Branch checked out");

      // Step 3: Read the files that need fixing
      console.log("\nStep 3: Reading files to fix...");
      const filesToFix = [
        ...new Set(
          (patterns as any[]).map((p: any) => p.file).filter(Boolean)
        ),
      ] as string[];

      const fileContents = await this.sandboxService.getFileContents(
        sandbox,
        filesToFix,
        Infinity,
        repoPath
      );
      console.log(`Read ${fileContents.size} files`);

      // Step 4: Build targeted fix prompt and generate fixes
      console.log("\nStep 4: Generating targeted fixes...");
      const fixPrompt = this.buildCleanupPrompt(patterns, fileContents);

      const { tracedGenerateObject: generateObject } = require("../lib/langsmith");
      const { default: gemini } = require("../lib/ai_config");
      const { GenerationSchema } = require("@humanish/shared");

      const result = await generateObject({
        model: gemini,
        schema: GenerationSchema,
        prompt: fixPrompt,
        temperature: 0.1,
      });

      const generation = result.object;
      console.log(`Generated ${generation.fileOperations.length} file operations`);

      // Step 5: Execute file operations
      console.log("\nStep 5: Applying fixes...");
      await this.sandboxService.executeFileOperations(
        sandbox,
        generation.fileOperations,
        repoPath
      );

      // Step 6: Commit and push to same branch
      console.log("\nStep 6: Committing and pushing...");
      await this.gitService.commitAndPush(
        sandbox,
        repoPath,
        branchName,
        `fix: remove AI slop patterns\n\nFixed ${(patterns as any[]).length} issues identified by Humanish slop analysis.\nCategories: ${[...new Set((patterns as any[]).map((p: any) => p.category))].join(", ")}`,
        repoUrl,
        githubToken,
        { createBranch: false }
      );

      console.log(`\nSlop cleanup complete! Branch ${branchName} updated.`);

      await job.updateProgress(100);

      return {
        success: true,
        fixedCount: (patterns as any[]).length,
        branchName,
      };
    } catch (error) {
      console.error(`Slop cleanup job ${job.id} failed:`, error);
      throw error;
    } finally {
      await this.sandboxService.cleanup(projectId);
    }
  }

  private buildCleanupPrompt(
    patterns: any[],
    fileContents: Map<string, string>
  ): string {
    let filesSection = "";
    fileContents.forEach((content, path) => {
      filesSection += `\n=== FILE: ${path} ===\n\`\`\`\n${content}\n\`\`\`\n\n`;
    });

    let issuesSection = "";
    patterns.forEach((p: any, idx: number) => {
      issuesSection += `${idx + 1}. [${p.severity.toUpperCase()}] ${p.category} in ${p.file}${p.line ? `:${p.line}` : ""}
   Problem: ${p.description}
   Fix: ${p.suggestion}
   Code: \`${p.snippet}\`\n\n`;
    });

    return `You are a senior code reviewer fixing specific AI slop patterns.

## CRITICAL RULES
1. Fix ONLY the specific issues listed below — nothing else
2. Do NOT change function signatures, API contracts, or business logic
3. Do NOT add new features or refactor unrelated code
4. Do NOT change variable names unless specifically listed as an issue
5. Keep your changes minimal and surgical

## Issues to Fix
${issuesSection}

## Current File Contents
${filesSection}

Fix each issue using the suggested fix. Use updateFile with searchReplace operations for targeted edits. Use rewriteFile only if the changes are too extensive for searchReplace.`;
  }
}
