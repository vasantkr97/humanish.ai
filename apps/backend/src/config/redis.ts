import { connection } from "@humanish/shared/queues";

export async function configureRedis(): Promise<void> {
  try {
    await connection.config("SET", "maxmemory", "512mb");
    await connection.config("SET", "maxmemory-policy", "volatile-lru");

    console.log("Redis memory configuration applied successfully");
  } catch (error) {
    console.error("Failed to configure Redis:", error);
    throw error;
  }
}
