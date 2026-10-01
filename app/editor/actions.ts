"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { Ratelimit } from "@upstash/ratelimit";
import { normalizeConfig, type PageConfig } from "@/lib/config";
import { handleError, normalizeHandle } from "@/lib/handles";
import { claimPage, getPage, isTaken, pageTag, redis, updatePage } from "@/lib/store";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const limiters = redis
  ? {
      publish: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 h"), prefix: "rl:publish" }),
      save: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 h"), prefix: "rl:save" }),
    }
  : null;

async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
}

const UNAVAILABLE = { ok: false, error: "publicar no está disponible en este deploy" } as const;

export async function checkHandle(raw: string): Promise<Result> {
  if (!redis) return UNAVAILABLE;
  const handle = normalizeHandle(raw);
  const error = handleError(handle);
  if (error) return { ok: false, error };
  return (await isTaken(handle)) ? { ok: false, error: "ese nombre ya está tomado" } : { ok: true };
}

export async function loadPage(raw: string): Promise<PageConfig | null> {
  const handle = normalizeHandle(raw);
  return handleError(handle) ? null : getPage(handle);
}

export async function publishPage(raw: string, input: unknown): Promise<Result<{ handle: string; token: string }>> {
  if (!limiters) return UNAVAILABLE;
  const handle = normalizeHandle(raw);
  const error = handleError(handle);
  if (error) return { ok: false, error };
  if (!(await limiters.publish.limit(await clientIp())).success) {
    return { ok: false, error: "demasiadas publicaciones, probá en un rato" };
  }
  const token = await claimPage(handle, normalizeConfig(input));
  if (!token) return { ok: false, error: "ese nombre ya está tomado" };
  updateTag(pageTag(handle));
  return { ok: true, handle, token };
}

export async function savePage(raw: string, token: string, input: unknown): Promise<Result> {
  if (!limiters) return UNAVAILABLE;
  const handle = normalizeHandle(raw);
  if (handleError(handle)) return { ok: false, error: "nombre inválido" };
  if (!(await limiters.save.limit(await clientIp())).success) {
    return { ok: false, error: "demasiados cambios seguidos, probá en un rato" };
  }
  if (!(await updatePage(handle, token, normalizeConfig(input)))) {
    return { ok: false, error: "el link de edición no es válido para esta página" };
  }
  updateTag(pageTag(handle));
  return { ok: true };
}
