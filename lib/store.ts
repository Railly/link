import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";
import { cacheLife, cacheTag } from "next/cache";
import { normalizeConfig, type PageConfig } from "./config";

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

/** Null when the deploy has no Redis (e.g. a self-hosted single-page fork). */
export const redis = url && token ? new Redis({ url, token }) : null;
export const storeEnabled = redis !== null;

const keys = {
  page: (h: string) => `page:${h}`,
  owner: (h: string) => `owner:${h}`,
  meta: (h: string) => `meta:${h}`,
};

export const pageTag = (handle: string) => `page:${handle}`;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function getPage(handle: string): Promise<PageConfig | null> {
  "use cache";
  cacheTag(pageTag(handle));
  cacheLife("days");
  if (!redis) return null;
  const raw = await redis.get(keys.page(handle));
  return raw ? normalizeConfig(raw) : null;
}

export async function isTaken(handle: string): Promise<boolean> {
  if (!redis) return true;
  return (await redis.exists(keys.owner(handle))) === 1;
}

/** Atomically claims a handle. Returns the plain edit token once, or null if already taken. */
export async function claimPage(handle: string, config: PageConfig): Promise<string | null> {
  if (!redis) return null;
  const editToken = randomBytes(24).toString("base64url");
  const claimed = await redis.set(keys.owner(handle), sha256(editToken), { nx: true });
  if (!claimed) return null;
  const now = Date.now();
  await redis.mset({
    [keys.page(handle)]: config,
    [keys.meta(handle)]: { createdAt: now, updatedAt: now },
  });
  return editToken;
}

export async function verifyOwner(handle: string, editToken: string): Promise<boolean> {
  if (!redis || !editToken) return false;
  const stored = await redis.get<string>(keys.owner(handle));
  if (!stored) return false;
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(sha256(editToken), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function updatePage(handle: string, editToken: string, config: PageConfig): Promise<boolean> {
  if (!(await verifyOwner(handle, editToken))) return false;
  const meta = (await redis!.get<{ createdAt: number }>(keys.meta(handle))) ?? { createdAt: Date.now() };
  await redis!.mset({
    [keys.page(handle)]: config,
    [keys.meta(handle)]: { ...meta, updatedAt: Date.now() },
  });
  return true;
}
