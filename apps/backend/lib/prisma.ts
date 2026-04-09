import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("[Prisma Pool] Unexpected error on idle client", err);
});

pool.on("connect", () => {
  console.log("[Prisma Pool] New client connected");
});

pool.on("remove", () => {
  console.log("[Prisma Pool] Client removed from pool");
});

const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

async function gracefulShutdown() {
  console.log("[Prisma] Graceful shutdown initiated...");

  try {
    await prisma.$disconnect();
    console.log("[Prisma] Client disconnected");

    await pool.end();
    console.log("[Prisma] Connection pool closed");

    process.exit(0);
  } catch (error) {
    console.error("[Prisma] Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

console.log("[Prisma] Singleton initialized");
console.log(`[Prisma] Max connections: ${pool.options.max}`);
console.log(`[Prisma] Environment: ${process.env.NODE_ENV}`);
