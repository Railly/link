import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { pageTag } from "@/lib/store";

/** Admin-only cache purge, used by scripts/takedown.mjs after deleting a page. */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const handle = new URL(request.url).searchParams.get("h");
  if (!handle) return NextResponse.json({ error: "missing h" }, { status: 400 });
  revalidateTag(pageTag(handle), { expire: 0 });
  return NextResponse.json({ ok: true });
}
