import type { Request } from "express";
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: number; // github user id from OAuth
      username: string; // github username
      email: string;
      name: string | null;
      avatar: string;
      profileUrl: string;
      sessionId: string;
      githubAccessToken: string;
      createdAt: number;
      expiredAt: number;
    };
  }
}
