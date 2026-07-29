import { Redis } from "ioredis";
import { connection } from "@humanish/shared/queues";

export const TTL = {
  BM25_INDEX: 7 * 24 * 60 * 60,
  SESSION: 30 * 24 * 60 * 60,
  OAUTH_STATE: 15 * 60,
} as const;

const REFRESH_THRESHOLD = 5 * 24 * 60 * 60;

export class RedisManager {
  private redis: Redis;

  constructor() {
    this.redis = connection;
  }

  async saveBM25Index(repoId: string, indexData: any): Promise<void> {
    const key = `bm25:index:${repoId}`;

    try {
      const jsonString = JSON.stringify(indexData);
      const sizeBytes = Buffer.byteLength(jsonString);
      const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);

      await this.redis.setex(key, TTL.BM25_INDEX, jsonString);

      console.log(`[Redis] Stored ${repoId}: ${sizeMB} MB (7-day TTL)`);
    } catch (error: any) {
      console.error(`[Redis] Error storing ${repoId}:`, error.message);
      throw error;
    }
  }

  async getBM25Index(repoId: string): Promise<any | null> {
    const key = `bm25:index:${repoId}`;

    try {
      const data = await this.redis.get(key);

      if (!data) {
        console.log(`[Redis] Cache miss: ${repoId}`);
        return null;
      }

      console.log(`[Redis] Cache hit: ${repoId}`);

      const currentTTL = await this.redis.ttl(key);
      const ttlDays = (currentTTL / 86400).toFixed(1);

      if (currentTTL > 0 && currentTTL < REFRESH_THRESHOLD) {
        await this.redis.expire(key, TTL.BM25_INDEX);
        console.log(`[Redis] TTL refreshed: ${ttlDays} days to 7 days`);
      } else {
        console.log(`[Redis] TTL remaining: ${ttlDays} days`);
      }

      return JSON.parse(data);
    } catch (error: any) {
      console.error(`[Redis] Error getting ${repoId}:`, error.message);
      throw error;
    }
  }

  async indexExists(repoId: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(`bm25:index:${repoId}`);
      return exists === 1;
    } catch (error: any) {
      console.error("[Redis] Error checking existence:", error.message);
      return false;
    }
  }

  async deleteBM25Index(repoId: string): Promise<void> {
    const key = `bm25:index:${repoId}`;
    await this.redis.del(key);
    console.log(`[Redis] Deleted ${repoId}`);
  }

  async getMemoryStats(): Promise<{
    usedMemory: string;
    maxMemory: string;
    usedPercent?: number;
    evictedKeys: number;
    expiredKeys: number;
  }> {
    try {
      const memInfo = await this.redis.info("memory");
      const statsInfo = await this.redis.info("stats");

      const memLines = memInfo.split("\r\n");
      const statsLines = statsInfo.split("\r\n");

      const getVal = (lines: string[], key: string) => {
        const line = lines.find((l) => l.startsWith(key));
        return line ? line.split(":")[1] : "0";
      };

      const usedBytes = parseInt(getVal(memLines, "used_memory") || "0");
      const maxBytes = parseInt(getVal(memLines, "maxmemory") || "0");
      const evictedKeys = parseInt(getVal(statsLines, "evicted_keys") || "0");
      const expiredKeys = parseInt(getVal(statsLines, "expired_keys") || "0");

      return {
        usedMemory: `${(usedBytes / 1024 / 1024).toFixed(2)} MB`,
        maxMemory: `${(maxBytes / 1024 / 1024).toFixed(2)} MB`,
        usedPercent:
          maxBytes > 0 ? Math.round((usedBytes / maxBytes) * 100) : undefined,
        evictedKeys,
        expiredKeys,
      };
    } catch (error: any) {
      console.error("[Redis] Error getting memory stats:", error.message);
      throw error;
    }
  }
}

let instance: RedisManager | null = null;

export const getRedisManager = (): RedisManager => {
  if (!instance) {
    instance = new RedisManager();
  }
  return instance;
};
