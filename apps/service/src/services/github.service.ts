import { GitHubHelper } from "../lib/github_helper";

export class GitHubService {
  private githubHelper: GitHubHelper;

  constructor(githubToken: string) {
    this.githubHelper = new GitHubHelper(githubToken);
  }

  async ensureFork(
    repoUrl: string,
    accountOwner: string
  ): Promise<{ forkUrl: string; forkOwner: string }> {
    const { owner, repo } = this.githubHelper.parseGitHubUrl(repoUrl);
    let forkInfo = await this.githubHelper.getFork(owner, repo, accountOwner);

    if (!forkInfo.exists) {
      const newFork = await this.githubHelper.forkRepository(owner, repo);
      return {
        forkUrl: newFork.cloneUrl,
        forkOwner: newFork.forkOwner,
      };
    }

    return {
      forkUrl: forkInfo.cloneUrl!,
      forkOwner: forkInfo.forkOwner!,
    };
  }

  async createPullRequest(
    repoUrl: string,
    forkOwner: string,
    branchName: string,
    task: string,
    explanation: string,
    isFork?: boolean
  ): Promise<{ number: number; url: string }> {
    const { owner: originalOwner, repo: originalRepo } =
      this.githubHelper.parseGitHubUrl(repoUrl);

    return await this.githubHelper.createPullRequest(
      originalOwner,
      originalRepo,
      forkOwner,
      branchName,
      `AI: ${task}`,
      explanation,
      undefined,
      isFork
    );
  }
}
