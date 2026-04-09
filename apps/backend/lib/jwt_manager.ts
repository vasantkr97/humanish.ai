import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in environment variables!");
}

const SESSION_EXPIRE_DAYS = Number(process.env.SESSION_EXPIRE_DAYS) || 7;

interface JwtPayload {
  sessionId: string;
  userId: number;
}

interface DecodedJwt extends JwtPayload {
  iat: number;
  exp: number;
}

export function generateSessionToken(
  sessionId: string,
  userId: number
): string {
  const payload: JwtPayload = {
    sessionId,
    userId,
  };

  try {
    const expiresInSeconds = SESSION_EXPIRE_DAYS * 24 * 60 * 60;

    const token = jwt.sign(
      payload,
      JWT_SECRET as jwt.Secret,
      {
        expiresIn: expiresInSeconds,
        algorithm: "HS256",
      } as jwt.SignOptions
    );

    console.log(`[JWT] Generated token for user ${userId}, session
  ${sessionId}`);

    return token;
  } catch (error) {
    console.error("[JWT] Failed to generate token:", error);
    throw new Error("Failed to generate JWT token");
  }
}

export function verifySessionToken(token: string): DecodedJwt {
  if (!token || token.trim() === "") {
    throw new Error("JWT token is required");
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET as jwt.Secret,
      {
        algorithms: ["HS256"],
      } as jwt.VerifyOptions
    ) as DecodedJwt;

    if (!decoded.sessionId || !decoded.userId) {
      throw new Error("JWT payload is missing required fields");
    }

    console.log(`[JWT] Verified token for user ${decoded.userId},
  session ${decoded.sessionId}`);

    return decoded;
  } catch (error: any) {
    console.error("[JWT] Token verification failed:", error.message);

    if (error.name === "TokenExpiredError") {
      throw new Error("JWT token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid JWT token");
    } else {
      throw new Error("JWT verification failed");
    }
  }
}

export function generateJwtSecret(length: number = 64): string {
  const bytes = crypto.randomBytes(length);
  const secret = bytes.toString("base64");
  return secret;
}

export function decodeTokenUnsafe(token: string): DecodedJwt | null {
  try {
    const decoded = jwt.decode(token) as DecodedJwt;
    if (!decoded) {
      return null;
    }
    return decoded;
  } catch (error) {
    console.error("[JWT] Failed to decode token:", error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean | null {
  try {
    const decoded = jwt.decode(token) as DecodedJwt;

    if (!decoded || !decoded.exp) {
      return null;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime > decoded.exp;
  } catch (error) {
    console.error("[JWT] Failed to check expiration:", error);
    return null;
  }
}

export function refreshSessionToken(oldToken: string): string {
  const decoded = verifySessionToken(oldToken);
  const newToken = generateSessionToken(decoded.sessionId, decoded.userId);
  console.log(`[JWT] Refreshed token for user ${decoded.userId}`);
  return newToken;
}
