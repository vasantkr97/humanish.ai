import { Router } from "express";
import type { Request, Response } from "express";
import crypto from "crypto";
import { Octokit } from "@octokit/rest";
import {
  createSession,
  deleteSession,
  verifySession,
} from "../lib/session_manager";
import { generateSessionToken } from "../lib/jwt_manager";
import { authenticateUser } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { connection as redis } from "@humanish/shared/queues";

const router = Router();

const GITHUB_CLIENT_ID = process.env.MY_GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.MY_GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL =
  process.env.MY_GITHUB_CALLBACK_URL ||
  "https://be.100xswe.app/auth/github/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://100xswe.app";

interface GitHubOAuthTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  throw new Error(
    "GitHub OAuth credentials (MY_GITHUB_CLIENT_ID, MY_GITHUB_CLIENT_SECRET) must be set!"
  );
}

const OAUTH_STATE_TTL = 15 * 60;

async function generateOAuthState(): Promise<string> {
  const state = crypto.randomBytes(32).toString("base64url");
  const stateData = JSON.stringify({
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
  });

  await redis.setex(`oauth:state:${state}`, OAUTH_STATE_TTL, stateData);
  console.log(
    `[OAuth] State created: ${state.substring(0, 8)}... (expires in ${OAUTH_STATE_TTL}s)`
  );

  return state;
}

async function verifyOAuthState(state: string): Promise<boolean> {
  const stateKey = `oauth:state:${state}`;

  try {
    const storedData = await redis.get(stateKey);

    if (!storedData) {
      console.log(
        `[OAuth] State verification FAILED: ${state.substring(0, 8)}... (expired or invalid)`
      );
      return false;
    }

    await redis.del(stateKey);

    const parsed = JSON.parse(storedData);
    console.log(
      `[OAuth] State verified: ${state.substring(0, 8)}... (created: ${parsed.createdAt})`
    );

    return true;
  } catch (error) {
    console.error("[OAuth] State verification error:", error);
    return false;
  }
}

router.get("/github/login", async (req: Request, res: Response) => {
  try {
    console.log("[OAuth] Initiating GitHub OAuth flow");

    const state = await generateOAuthState();

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID!,
      redirect_uri: GITHUB_CALLBACK_URL,
      scope: "user:email read:user repo",
      state: state,
      allow_signup: "true",
    });

    const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    console.log(
      `[OAuth] Redirecting to GitHub with state: ${state.substring(0, 8)}...`
    );

    res.redirect(githubAuthUrl);
  } catch (error: any) {
    console.error("[OAuth] Error initiating OAuth:", error);
    const errorUrl = `${FRONTEND_URL}/login?error=${encodeURIComponent(error.message)}`;
    res.redirect(errorUrl);
  }
});

router.get("/github/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.log(`[OAuth] User denied access: ${error}`);
      const errorUrl = `${FRONTEND_URL}/login?error=access_denied`;
      return res.redirect(errorUrl);
    }

    if (!code || !state) {
      throw new Error("Missing code or state parameter");
    }

    console.log("[OAuth] Received callback from GitHub");

    const isValidState = await verifyOAuthState(state as string);
    if (!isValidState) {
      throw new Error(
        "Invalid or expired OAuth state parameter. Please try logging in again."
      );
    }

    console.log("[OAuth] Exchanging code for access token");
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code: code,
          redirect_uri: GITHUB_CALLBACK_URL,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(
        `GitHub API returned ${tokenResponse.status}: ${tokenResponse.statusText}`
      );
    }

    const tokenData = (await tokenResponse.json()) as GitHubOAuthTokenResponse;

    const { access_token, error: tokenError } = tokenData;
    if (tokenError || !access_token) {
      throw new Error(
        `GitHub OAuth error: ${tokenError || "No access token received"}`
      );
    }
    console.log("[OAuth] Access token received");

    const octokit = new Octokit({ auth: access_token });

    console.log("[OAuth] Fetching user information from GitHub");
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();
    console.log(
      `[OAuth] User authenticated: ${githubUser.login} (ID: ${githubUser.id})`
    );

    let email = githubUser.email;
    if (!email) {
      console.log(
        "[OAuth] Email not in profile, fetching from emails endpoint"
      );
      const { data: emails } =
        await octokit.rest.users.listEmailsForAuthenticated();

      const primaryEmail = emails.find((e) => e.primary && e.verified);
      email = primaryEmail?.email || emails[0]?.email || "noemail@github.com";
    }

    console.log("[OAuth] Saving user to PostgreSQL database");
    const user = await prisma.user.upsert({
      where: {
        githubId: githubUser.id,
      },
      update: {
        username: githubUser.login,
        email: email!,
        name: githubUser.name,
        avatar: githubUser.avatar_url,
        profileUrl: githubUser.html_url,
        lastLoginAt: new Date(),
      },
      create: {
        githubId: githubUser.id,
        username: githubUser.login,
        email: email!,
        name: githubUser.name,
        avatar: githubUser.avatar_url,
        profileUrl: githubUser.html_url,
        lastLoginAt: new Date(),
      },
    });
    console.log(
      `[OAuth] User saved to database: ${user.username} (DB ID: ${user.id}, GitHub ID: ${user.githubId})`
    );

    console.log("[OAuth] Creating session in Redis");
    const sessionId = await createSession({
      userId: user.id,
      username: user.username,
      email: user.email,
      githubAccessToken: access_token,
      name: user.name,
      avatar: user.avatar,
      profileUrl: user.profileUrl,
    });
    console.log(`[OAuth] Session created: ${sessionId}`);

    const jwtToken = generateSessionToken(sessionId, user.id);
    console.log("[OAuth] JWT token generated");

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      profileUrl: user.profileUrl,
    };

    const redirectUrl = new URL(`${FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set("token", jwtToken);
    redirectUrl.searchParams.set("user", JSON.stringify(userData));

    console.log("[OAuth] Redirecting to frontend with token");
    res.redirect(redirectUrl.toString());
  } catch (error: any) {
    console.error("[OAuth] Callback error:", error);
    const errorMessage = error.message || "Authentication failed";
    const errorUrl = `${FRONTEND_URL}/login?error=${encodeURIComponent(errorMessage)}`;
    res.redirect(errorUrl);
  }
});

router.get("/me", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    res.json({
      userId: user.userId,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      profileUrl: user.profileUrl,
      sessionId: user.sessionId,
      createdAt: user.createdAt,
      expiresAt: user.expiredAt,
    });
  } catch (error: any) {
    console.error("[Auth] /me error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.post(
  "/logout",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const deleted = await deleteSession(user.sessionId);

      if (deleted) {
        console.log(
          `[Auth] User logged out: ${user.username}, session ${user.sessionId} deleted`
        );
        res.json({ message: "Logged out successfully" });
      } else {
        res.json({ message: "Session already expired" });
      }
    } catch (error: any) {
      console.error("[Auth] Logout error:", error);
      res.status(500).json({ error: error.message || "Logout failed" });
    }
  }
);

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }

    const { refreshSessionToken } = require("../lib/jwt_manager");
    const newToken = refreshSessionToken(token);

    res.json({
      token: newToken,
      message: "Token refreshed successfully",
    });
  } catch (error: any) {
    console.error("[Auth] Token refresh error:", error);
    res.status(401).json({ error: error.message || "Token refresh failed" });
  }
});

router.get(
  "/installations",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      console.log(`[Auth] Fetching installations for user ${user.username}`);

      const installations = await prisma.installation.findMany({
        where: {
          accountLogin: user.username,
          deletedAt: null,
        },
        include: {
          repositories: {
            where: {
              removedAt: null,
            },
          },
        },
      });

      console.log(
        `[Auth] Found ${installations.length} installation(s) for user ${user.username}`
      );

      res.json({
        total: installations.length,
        installations: installations.map((inst: any) => ({
          installationId: inst.installationId,
          accountLogin: inst.accountLogin,
          accountType: inst.accountType,
          repositoryCount: inst.repositories.length,
          installedAt: inst.installedAt,
          updatedAt: inst.updatedAt,
        })),
      });
    } catch (error: any) {
      console.error("[Auth] /installations error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch installations" });
    }
  }
);

router.get("/repos", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    console.log(
      `[Auth] Fetching installed repositories for user ${user.username}`
    );

    const installations = await prisma.installation.findMany({
      where: {
        accountLogin: user.username,
        deletedAt: null,
      },
      include: {
        repositories: {
          where: {
            removedAt: null,
          },
        },
      },
    });

    const allRepos = installations.flatMap((installation: any) =>
      installation.repositories.map((repo: any) => ({
        id: repo.githubId,
        name: repo.name,
        full_name: repo.fullName,
        html_url: `https://github.com/${repo.fullName}`,
        description: null,
        private: repo.private,
        language: null,
        updated_at: repo.addedAt.toISOString(),
        defaultBranch: "main",
        owner: {
          login: repo.fullName.split("/")[0],
          avatar_url: user.avatar,
        },
      }))
    );

    console.log(
      `[Auth] Found ${allRepos.length} installed repositories for user ${user.username} across ${installations.length} installation(s)`
    );

    res.json({ repos: allRepos });
  } catch (error: any) {
    console.error("[Auth] /repos error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch repositories" });
  }
});

export default router;
