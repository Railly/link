import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./store";

/** Per-IP limits; null when the deploy has no Redis (those features are off there anyway). */
export const limiters = redis
  ? {
      publish: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "rl:publish" }),
      save: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 h"), prefix: "rl:save" }),
      upload: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:upload" }),
      import: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 h"), prefix: "rl:import" }),
    }
  : null;

/** Vercel sets x-real-ip itself, so clients cannot spoof it. */
export const clientIp = (h: Headers) =>
  h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";

/** True when the request may proceed; always true without Redis. */
export async function allow(kind: keyof NonNullable<typeof limiters>, h: Headers) {
  return limiters ? (await limiters[kind].limit(clientIp(h))).success : true;
}
