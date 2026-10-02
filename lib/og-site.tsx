import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { PageConfig } from "./config";
import { OG_SIZE } from "./og";

const asset = (...p: string[]) => readFile(join(process.cwd(), ...p));

/** Share card for single-page forks: brand fonts, dot grid, avatar, and a linkmi credit. */
export async function siteCard(config: PageConfig, url: string) {
  const [serif, mono, avatar] = await Promise.all([
    asset("assets/og/serif.ttf"),
    asset("assets/og/mono.ttf"),
    config.avatar.startsWith("/") ? asset("public", config.avatar).catch(() => null) : null,
  ]);
  const [bg, , ink] = config.colors;
  const src = avatar ? `data:image/jpeg;base64,${avatar.toString("base64")}` : config.avatar || null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#fafafa",
          backgroundColor: bg,
          backgroundImage: "radial-gradient(#525252 1.3px, transparent 1.3px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "mono", fontSize: 24, color: ink }}>
          <span>{url}</span>
          <span>LINKS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- satori renders plain img
            <img src={src} width={200} height={200} style={{ borderRadius: 999, border: "2px solid #3a3a3a" }} alt="" />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
            <div style={{ display: "flex", fontFamily: "serif", fontSize: 104, lineHeight: 1, letterSpacing: -2 }}>
              {config.name}
            </div>
            {config.bio ? (
              <div style={{ display: "flex", fontFamily: "mono", fontSize: 26, lineHeight: 1.5, color: ink }}>
                {config.bio}
              </div>
            ) : null}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: "1px solid #262626",
            fontFamily: "mono",
            fontSize: 22,
            color: "#737373",
          }}
        >
          <span>hecho con linkmi</span>
          <span>github.com/sofiaferro/linkmi</span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "serif", data: serif, style: "normal", weight: 400 },
        { name: "mono", data: mono, style: "normal", weight: 400 },
      ],
    },
  );
}
