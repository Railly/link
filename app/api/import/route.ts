import { NextResponse } from "next/server";

/** Import a public Linktree profile so people can migrate in one click. */
export async function GET(req: Request) {
  const username = new URL(req.url).searchParams.get("u")?.trim().replace(/^@/, "") ?? "";
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(username)) {
    return NextResponse.json({ error: "usuario inválido" }, { status: 400 });
  }

  const res = await fetch(`https://linktr.ee/${encodeURIComponent(username)}`, {
    headers: { "user-agent": "Mozilla/5.0 (linkmi importer)" },
    next: { revalidate: 300 },
  });
  if (!res.ok) return NextResponse.json({ error: "no encontramos ese perfil" }, { status: 404 });

  const html = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return NextResponse.json({ error: "no pudimos leer el perfil" }, { status: 502 });

  try {
    const props = JSON.parse(match[1]).props.pageProps;
    const account = props.account ?? {};
    const links = (props.links ?? [])
      .filter((l: { url?: string; title?: string }) => l.url && l.title)
      .map((l: { title: string; url: string }, i: number) => ({ id: String(i), title: l.title, url: l.url }));
    return NextResponse.json({
      name: account.pageTitle?.replace(/^@/, "") || username,
      bio: account.description ?? "",
      avatar: account.profilePictureUrl ?? "",
      links,
    });
  } catch {
    return NextResponse.json({ error: "no pudimos leer el perfil" }, { status: 502 });
  }
}
