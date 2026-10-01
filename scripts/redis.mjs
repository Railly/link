import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("Missing Redis env vars. Run with: node --env-file=.env.local scripts/<script>.mjs");
  process.exit(1);
}

export const redis = new Redis({ url, token });
