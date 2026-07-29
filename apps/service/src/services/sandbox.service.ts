import { Sandbox } from "@e2b/code-interpreter";
import { SandboxManager } from "../lib/sandbox_manager";
import type { FileOperation } from "@humanish/shared";

export class SandboxService {
  private sandboxManager: SandboxManager;

  constructor() {
    this.sandboxManager = new SandboxManager();
  }

  async getOrCreateSandbox(projectId: string): Promise<Sandbox> {
    let sandbox = this.sandboxManager.get(projectId);

    if (!sandbox) {
      sandbox = await this.sandboxManager.create(projectId);
    }

    return sandbox;
  }

  async getFileTree(
    sandbox: Sandbox,
    dir: string = "/home/user/project"
  ): Promise<string[]> {
    const result = await sandbox.commands.run(
      `find ${dir} -type f -not -path "*/node_modules/*" -not -path "*/.git/*" | head -100`
    );

    return result.stdout
      .split("\n")
      .filter((p) => p.trim() !== "")
      .map((p) => p.replace(`${dir}/`, ""));
  }

  async getFileContents(
    sandbox: Sandbox,
    filePaths: string[],
    maxLines: number = 100,
    repoPath: string = "/home/user/project"
  ): Promise<Map<string, string>> {
    const limitMsg =
      maxLines === Infinity ? "no line limit" : `max ${maxLines} lines`;
    console.log(
      `\nReading contents of ${filePaths.length} files (${limitMsg}):`
    );
    const contents = new Map<string, string>();

    for (const path of filePaths) {
      try {
        const absolutePath = path.startsWith("/")
          ? path
          : `${repoPath}/${path}`;

        const fullContent = await this.readFile(sandbox, absolutePath);
        const lines = fullContent.split("\n");
        const truncated =
          maxLines === Infinity
            ? fullContent
            : lines.slice(0, maxLines).join("\n");
        const wasTruncated = lines.length > maxLines && maxLines !== Infinity;

        contents.set(absolutePath, truncated);
        const statusMsg = wasTruncated
          ? ` (truncated from ${lines.length} to ${maxLines} lines)`
          : ` (${lines.length} lines, ${fullContent.length} chars)`;
        console.log(`  [OK] ${path}${statusMsg}`);
      } catch (error) {
        console.error(`  ✗ Error reading ${path}:`, (error as Error).message);
      }
    }

    console.log(`\nSuccessfully read ${contents.size} files\n`);
    return contents;
  }

  async separateExistingAndNewFiles(
    sandbox: Sandbox,
    filePaths: string[],
    repoPath: string = "/home/user/project"
  ): Promise<{ existingFiles: string[]; newFiles: string[] }> {
    console.log(`\nChecking file existence for ${filePaths.length} file(s)...`);
    const existingFiles: string[] = [];
    const newFiles: string[] = [];

    for (const path of filePaths) {
      const absolutePath = path.startsWith("/") ? path : `${repoPath}/${path}`;

      const exists = await this.fileExists(sandbox, absolutePath);
      if (exists) {
        existingFiles.push(path);
        console.log(`  [OK] Exists: ${path}`);
      } else {
        newFiles.push(path);
        console.log(` New file: ${path}`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`  Existing files to modify: ${existingFiles.length}`);
    console.log(`  New files to create: ${newFiles.length}`);
    console.log("");

    return { existingFiles, newFiles };
  }

  async executeFileOperations(
    sandbox: Sandbox,
    operations: FileOperation[],
    repoPath: string
  ): Promise<void> {
    for (const operation of operations) {
      const fullPath = operation.path.startsWith(repoPath)
        ? operation.path
        : `${repoPath}/${operation.path}`;

      await this.executeFileOperation(sandbox, {
        ...operation,
        path: fullPath,
      });
    }
  }

  async detectPackageManager(
    sandbox: Sandbox,
    repoPath: string
  ): Promise<string> {
    try {
      const pnpmCheck = await sandbox.commands.run(
        `[ -f ${repoPath}/pnpm-lock.yaml ] && echo "exists" || echo "not found"`
      );
      if (pnpmCheck.stdout.trim() === "exists") {
        return "pnpm";
      }

      const yarnCheck = await sandbox.commands.run(
        `[ -f ${repoPath}/yarn.lock ] && echo "exists" || echo "not found"`
      );
      if (yarnCheck.stdout.trim() === "exists") {
        return "yarn";
      }

      const npmCheck = await sandbox.commands.run(
        `[ -f ${repoPath}/package-lock.json ] && echo "exists" || echo "not found"`
      );
      if (npmCheck.stdout.trim() === "exists") {
        return "npm";
      }

      const pythonCheck = await sandbox.commands.run(
        `[ -f ${repoPath}/requirements.txt ] || [ -f ${repoPath}/pyproject.toml ] && echo "exists" || echo "not found"`
      );
      if (pythonCheck.stdout.trim() === "exists") {
        return "pip";
      }

      const rubyCheck = await sandbox.commands.run(
        `[ -f ${repoPath}/Gemfile ] && echo "exists" || echo "not found"`
      );
      if (rubyCheck.stdout.trim() === "exists") {
        return "bundler";
      }

      const rustCheck = await sandbox.commands.run(
        `[ -f ${repoPath}/Cargo.toml ] && echo "exists" || echo "not found"`
      );
      if (rustCheck.stdout.trim() === "exists") {
        return "cargo";
      }

      const goCheck = await sandbox.commands.run(
        `[ -f ${repoPath}/go.mod ] && echo "exists" || echo "not found"`
      );
      if (goCheck.stdout.trim() === "exists") {
        return "go";
      }

      return "npm";
    } catch (error) {
      console.warn(
        "Error detecting package manager, defaulting to npm:",
        error
      );
      return "npm";
    }
  }

  private async ensurePackageManagerInstalled(
    sandbox: Sandbox,
    packageManager: string
  ): Promise<void> {
    try {
      // Check if package manager is available
      const checkResult = await sandbox.commands.run(`which ${packageManager}`);

      if (checkResult.exitCode === 0) {
        console.log(
          `  Package manager '${packageManager}' is already installed\n`
        );
        return;
      }
    } catch (error) {
      // Package manager not found, install it
      console.log(`  Installing ${packageManager}...`);

      try {
        if (packageManager === "pnpm") {
          await sandbox.commands.run("npm install -g pnpm", {
            timeoutMs: 120000,
          });
          console.log(`  Successfully installed pnpm\n`);
        } else if (packageManager === "yarn") {
          await sandbox.commands.run("npm install -g yarn", {
            timeoutMs: 120000,
          });
          console.log(`  Successfully installed yarn\n`);
        } else if (packageManager === "cargo") {
          console.log(
            `  Warning: Cargo not available, skipping installation (requires Rust)\n`
          );
        } else if (packageManager === "go") {
          console.log(`  Warning: Go not available, skipping installation\n`);
        }
        // npm, pip, bundler are usually pre-installed or don't need global install
      } catch (installError) {
        console.warn(
          `  Failed to install ${packageManager}: ${(installError as Error).message}`
        );
        console.log(`  Will attempt to run commands anyway...\n`);
      }
    }
  }

  async runShellCommands(
    sandbox: Sandbox,
    commands: string[],
    repoPath: string,
    packageManager?: string
  ): Promise<void> {
    if (commands && commands.length > 0) {
      // Ensure package manager is installed if specified
      if (
        packageManager &&
        (packageManager === "pnpm" || packageManager === "yarn")
      ) {
        await this.ensurePackageManagerInstalled(sandbox, packageManager);
      }

      for (const command of commands) {
        try {
          console.log(`  Running: ${command}`);
          const result = await sandbox.commands.run(
            `cd ${repoPath} && ${command}`,
            { timeoutMs: 180000 }
          );

          if (result.stdout) {
            console.log(`  Output: ${result.stdout.substring(0, 200)}`);
          }
          if (result.stderr) {
            console.warn(`  Warning: ${result.stderr.substring(0, 200)}`);
          }

          console.log(`  Command completed successfully\n`);
        } catch (error) {
          console.warn(`  Command failed (non-fatal): ${command}`);
          console.warn(`  Error: ${(error as Error).message}`);
          console.log(`  Continuing with next steps...\n`);
          // Don't throw - continue with remaining commands
        }
      }
    }
  }

  async cleanup(projectId: string): Promise<void> {
    await this.sandboxManager.cleanup(projectId);
  }

  private async fileExists(sandbox: Sandbox, path: string): Promise<boolean> {
    try {
      await sandbox.files.read(path);
      return true;
    } catch {
      return false;
    }
  }

  private async readFile(sandbox: Sandbox, path: string): Promise<string> {
    return await sandbox.files.read(path);
  }

  private async writeFile(
    sandbox: Sandbox,
    path: string,
    content: string
  ): Promise<void> {
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir) await sandbox.commands.run(`mkdir -p ${dir}`);
    await sandbox.files.write(path, content);
  }

  private async deleteFile(sandbox: Sandbox, path: string): Promise<void> {
    await sandbox.commands.run(`rm -f ${path}`);
  }

  private async executeFileOperation(
    sandbox: Sandbox,
    operation: FileOperation
  ): Promise<void> {
    console.log(`\n  Executing operation: ${operation.type}`);
    console.log(`  Target file: ${operation.path}`);

    switch (operation.type) {
      case "createFile":
      case "rewriteFile":
        console.log(
          `  Writing ${operation.content.length} characters to file...`
        );
        await this.writeFile(sandbox, operation.path, operation.content);
        console.log(`  File written successfully`);
        break;

      case "updateFile":
        console.log(`  Reading current file content...`);
        let content = await this.readFile(sandbox, operation.path);
        const originalLength = content.length;
        console.log(`  Current file size: ${originalLength} characters`);
        console.log(
          `  Number of search/replace operations: ${operation.searchReplace.length}`
        );

        let modificationsMade = false;

        for (let i = 0; i < operation.searchReplace.length; i++) {
          const sr = operation.searchReplace[i];
          if (!sr) continue;
          const { search, replace } = sr;

          const beforeLength = content.length;

          console.log(
            `\n  [Pattern ${i + 1}/${operation.searchReplace.length}]`
          );
          console.log(
            `     Search: "${search.substring(0, 80)}${search.length > 80 ? "..." : ""}"`
          );
          console.log(
            `     Replace with: "${replace.substring(0, 80)}${replace.length > 80 ? "..." : ""}"`
          );

          try {
            const regex = new RegExp(search, "g");
            const matches = content.match(regex);

            if (matches && matches.length > 0) {
              console.log(`     Found ${matches.length} match(es) using regex`);
              content = content.replace(regex, replace);
              const afterLength = content.length;
              console.log(
                `     Replaced successfully (${beforeLength} -> ${afterLength} chars)`
              );
              modificationsMade = true;
            } else {
              console.log(
                `     No regex matches found, trying literal string search...`
              );

              if (content.includes(search)) {
                console.log(`     Found literal match!`);
                const occurrences = content.split(search).length - 1;
                console.log(`     Found ${occurrences} occurrence(s)`);
                content = content.split(search).join(replace);
                const afterLength = content.length;
                console.log(
                  `     Replaced successfully (${beforeLength} -> ${afterLength} chars)`
                );
                modificationsMade = true;
              } else {
                console.log(
                  `     Pattern NOT found in file (neither regex nor literal)`
                );
                console.log(`     File preview (first 200 chars):`);
                console.log(`        "${content.substring(0, 200)}..."`);
                console.log(
                  `     Tip: Check for whitespace differences or escape sequences`
                );
              }
            }
          } catch (error) {
            console.log(`     Regex error: ${(error as Error).message}`);
            console.log(`     Falling back to literal string replacement...`);

            if (content.includes(search)) {
              content = content.split(search).join(replace);
              console.log(`     Literal replacement successful`);
              modificationsMade = true;
            } else {
              console.log(
                `     Literal replacement also failed - pattern not found`
              );
            }
          }
        }

        if (!modificationsMade) {
          console.log(`\n  WARNING: No modifications were made to the file!`);
          console.log(
            `  The search patterns didn't match anything in the file.`
          );
          console.log(
            `  Consider using 'rewriteFile' instead of 'updateFile'.`
          );
        } else {
          console.log(`\n  Modifications applied successfully`);
          console.log(
            `  Final file size: ${content.length} characters (was ${originalLength})`
          );
        }

        console.log(`  Writing updated content back to file...`);
        await this.writeFile(sandbox, operation.path, content);
        console.log(`  File updated successfully`);
        break;

      case "deleteFile":
        console.log(`  Deleting file...`);
        await this.deleteFile(sandbox, operation.path);
        console.log(`  File deleted successfully`);
        break;

      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }

    console.log(`  \n`);
  }
}
