"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { normalizeConfig, type PageConfig } from "@/lib/config";
import { handleError, normalizeHandle } from "@/lib/handles";
import { allow } from "@/lib/ratelimit";
import { claimPage, getPage, isTaken, pageTag, redis, updatePage } from "@/lib/store";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

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
  if (!redis) return UNAVAILABLE;
  const handle = normalizeHandle(raw);
  const error = handleError(handle);
  if (error) return { ok: false, error };
  if (!(await allow("publish", await headers()))) {
    return { ok: false, error: "demasiadas publicaciones, probá en un rato" };
  }
  const token = await claimPage(handle, normalizeConfig(input));
  if (!token) return { ok: false, error: "ese nombre ya está tomado" };
  updateTag(pageTag(handle));
  return { ok: true, handle, token };
}

export async function savePage(raw: string, token: string, input: unknown): Promise<Result> {
  if (!redis) return UNAVAILABLE;
  const handle = normalizeHandle(raw);
  if (handleError(handle)) return { ok: false, error: "nombre inválido" };
  if (!(await allow("save", await headers()))) {
    return { ok: false, error: "demasiados cambios seguidos, probá en un rato" };
  }
  if (!(await updatePage(handle, token, normalizeConfig(input)))) {
    return { ok: false, error: "el link de edición no es válido para esta página" };
  }
  updateTag(pageTag(handle));
  return { ok: true };
}
