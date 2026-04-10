import { Sandbox } from "@e2b/code-interpreter";

export class GitService {
  private gitInstalled = false;

  private async ensureGitInstalled(sandbox: Sandbox): Promise<void> {
    if (this.gitInstalled) {
      console.log("Git already installed");
      return;
    }

    console.log("Checking for git...");
    const check = await sandbox.commands.run("git --version", {
      timeoutMs: 15000,
    });

    if (check.exitCode === 0) {
      console.log("Git already available");
      this.gitInstalled = true;
      return;
    }

    console.log("Installing git locally (no sudo)...");
    const installCommand = `
            cd /home/user && \
            wget https://mirrors.edge.kernel.org/pub/software/scm/git/git-2.44.0.tar.gz && \
            tar -xzf git-2.44.0.tar.gz && \
            cd git-2.44.0 && \
            make prefix=/home/user/local all && \
            make prefix=/home/user/local install && \
            export PATH=/home/user/local/bin:$PATH && \
            git --version
        `;

    const result = await sandbox.commands.run(installCommand, {
      timeoutMs: 600000,
    });

    if (result.exitCode !== 0) {
      console.error(result.stderr);
      throw new Error("Failed to install git locally.");
    }

    console.log("Git installed successfully!");
    this.gitInstalled = true;
  }

  async cloneRepository(
    sandbox: Sandbox,
    repoUrl: string,
    githubToken?: string
  ): Promise<string> {
    await this.ensureGitInstalled(sandbox);

    const urlPattern = /^https:\/\/github\.com\/[\w\-]+\/[\w\-\.]+(?:\.git)?$/;
    if (!urlPattern.test(repoUrl)) {
      throw new Error(
        "Invalid repository URL format. Only GitHub URLs are allowed."
      );
    }

    console.log(`Cloning: ${repoUrl}`);

    const targetDir = "/home/user/project";
    await sandbox.commands.run(`rm -rf ${targetDir}`);

    // Add authentication token to URL if provided
    let cloneUrl = repoUrl;
    if (githubToken) {
      cloneUrl = repoUrl.replace(
        "https://github.com",
        `https://x-access-token:${githubToken}@github.com`
      );
      console.log("Using authenticated clone (OAuth token provided)");
    }

    const escapedRepoUrl = cloneUrl.replace(/'/g, "'\\''");
    const escapedTargetDir = targetDir.replace(/'/g, "'\\''");

    const cloneCmd = `
            export PATH=/home/user/local/bin:$PATH && \
            git clone '${escapedRepoUrl}' '${escapedTargetDir}'
        `;

    const result = await sandbox.commands.run(cloneCmd, { timeoutMs: 300000 });

    if (result.exitCode !== 0) {
      console.error(result.stderr);
      throw new Error("Failed to clone repository.");
    }

    console.log("Repository cloned successfully!");
    return targetDir;
  }

  async commitAndPush(
    sandbox: Sandbox,
    repoPath: string,
    branchName: string,
    commitMessage: string,
    forkUrl: string,
    githubToken: string
  ): Promise<void> {
    const escapedRepoPath = repoPath.replace(/'/g, "'\\''");
    const escapedBranchName = branchName.replace(/'/g, "'\\''");
    const escapedCommitMessage = commitMessage.replace(/'/g, "'\\''");

    await sandbox.commands.run(
      `cd '${escapedRepoPath}' && git config user.email "bot@100xswe.com"`
    );
    await sandbox.commands.run(
      `cd '${escapedRepoPath}' && git config user.name "100xSWE Bot"`
    );

    await sandbox.commands.run(
      `cd '${escapedRepoPath}' && git checkout -b '${escapedBranchName}'`
    );

    await sandbox.commands.run(`cd '${escapedRepoPath}' && git add .`);
    await sandbox.commands.run(
      `cd '${escapedRepoPath}' && git commit -m '${escapedCommitMessage}'`
    );

    const authenticatedRepoUrl = forkUrl.replace(
      "https://github.com",
      `https://x-access-token:${githubToken}@github.com`
    );
    const escapedRepoUrl = authenticatedRepoUrl.replace(/'/g, "'\\''");
    await sandbox.commands.run(
      `cd '${escapedRepoPath}' && git push '${escapedRepoUrl}' '${escapedBranchName}'`
    );
  }
}
