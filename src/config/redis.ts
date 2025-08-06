import Redis from "ioredis";
import dotenv from "dotenv";
import { databaseConfig } from './db';

dotenv.config();

const { redis_host, redis_port , redis_auth } = databaseConfig.config;

console.log(`Redis Host:`, redis_host);
console.log(`Redis Port:`, redis_port);

const redis = new Redis({
  host: redis_host,
  port: redis_port,
  password: redis_auth
});

redis.on("connect", () => {
  console.log("✅ Connected to Redis successfully!");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

export default redis;