import { createClient, type RedisClientType } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// redisClient.connect().catch(console.error);

export default redisClient;

let client: RedisClientType | null = null;

export const initializeRedis = async () => {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    client.on("error", (error) => {
      console.error("Redis Client Error", error);
    });
    client.on("connect", () => {
      console.log("Redis connected");
    });
    await client.connect();
  }
  return client;
};
