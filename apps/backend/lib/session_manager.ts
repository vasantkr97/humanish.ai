import crypto from "crypto";
import { connection } from "@humanish/shared/queues";

const SESSION_PREFIX = "session:";
const SESSION_EXPIRE_DAYS = Number(process.env.SESSION_EXPIRE_DAYS);
if (!SESSION_EXPIRE_DAYS) {
  throw new Error("Session expire days must be set!!");
}
const SESSION_EXPIRE_MS = SESSION_EXPIRE_DAYS * 24 * 60 * 60 * 1000;

interface SessionData {
  userId: number;
  username: string;
  email: string;
  githubAccessToken: string;
  name: string | null;
  avatar: string;
  profileUrl: string;
}
interface Session extends SessionData {
  sessionId: string;
  createdAt: number;
  expiredAt: number;
}

function generateSessionId(): string {
  const randomBytes = crypto.randomBytes(32);
  const randomString = randomBytes.toString("base64url").slice(0, 32);
  return `sess_${randomString}`;
}
export async function createSession(data: SessionData): Promise<string> {
  const sessionId = generateSessionId();
  const now = Date.now();
  const expiredAt = now + SESSION_EXPIRE_MS;
  const session: Session = {
    ...data,
    sessionId,
    createdAt: now,
    expiredAt,
  };
  const redisKey = `${SESSION_PREFIX}${sessionId}`;
  const sessionJson = JSON.stringify(session);
  const ttlSeconds = Math.floor(SESSION_EXPIRE_MS / 1000);
  try {
    await connection.setex(redisKey, ttlSeconds, sessionJson);
    console.log(`[Session] Created session ${sessionId} for user
        ${data.username}, expires in ${SESSION_EXPIRE_DAYS} days`);
  } catch (error) {
    console.error("[Session] Failed to create a session", error);
    throw new Error("Failed to create session");
  }
  return sessionId;
}
export async function getSession(sessionId: string): Promise<Session | null> {
  if (!sessionId || sessionId.trim() === "") {
    console.log("[Session] getSession called with empty sessionid");
    return null;
  }

  const redisKey = `${SESSION_PREFIX}${sessionId}`;

  try {
    // Add 3-second timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Redis get timeout after 3s")), 3000)
    );

    const sessionJson = (await Promise.race([
      connection.get(redisKey),
      timeoutPromise,
    ])) as string | null;

    if (!sessionJson) {
      console.log(`[Session] Session ${sessionId} not found`);
      return null;
    }

    const session = JSON.parse(sessionJson) as Session;
    return session;
  } catch (error) {
    if (error instanceof Error && error.message.includes("timeout")) {
      console.error(
        `[Session] TIMEOUT retrieving session ${sessionId} - Redis connection slow`
      );
    } else {
      console.error(`[Session] Error retrieving session ${sessionId}`, error);
    }
    return null;
  }
}
export async function deleteSession(sessionId: string): Promise<boolean> {
  if (!sessionId || sessionId.trim() === "") {
    console.warn("[Session] deleteSession called with empty sessionId");
    return false;
  }
  const redisKey = `${SESSION_PREFIX}${sessionId}`;
  try {
    const deleteCount = await connection.del(redisKey);
    if (deleteCount > 0) {
      console.log(`Session deleted session ${sessionId}`);
      return true;
    } else {
      console.log(`[Session] Session ${sessionId} did not exist`);
      return false;
    }
  } catch (error) {
    console.error(`[Session] Session ${sessionId} did not exist`);
    return false;
  }
}
export async function verifySession(sessionId: string): Promise<Session> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error("Session not found or expired");
  }
  const now = Date.now();
  if (now > session.expiredAt) {
    await deleteSession(sessionId);
    throw new Error("Session expired");
  }
  return session;
}

export async function cleanupExpiredSessions(): Promise<number> {
  let cleanedCount = 0;
  try {
    const pattern = `${SESSION_PREFIX}*`;
    let cursor = "0";
    const now = Date.now();

    do {
      const result = await connection.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );

      cursor = result[0];
      const keys = result[1];

      for (const key of keys) {
        const sessionJson = await connection.get(key);
        if (sessionJson) {
          const session = JSON.parse(sessionJson) as Session;
          if (now > session.expiredAt) {
            await connection.del(key);
            cleanedCount++;
          }
        }
      }
    } while (cursor !== "0");

    if (cleanedCount > 0) {
      console.log(`[Session] cleaned up ${cleanedCount} expired sessions`);
    }
    return cleanedCount;
  } catch (error) {
    console.error("[Session] Error during cleanup", error);
    return cleanedCount;
  }
}
