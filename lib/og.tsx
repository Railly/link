import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import type { FontId } from "./config";

export const OG_SIZE = { width: 1200, height: 630 };

/** Google Fonts family + axis query for each page font's display face. */
const DISPLAY: Record<FontId, { family: string; query: string; style: "normal" | "italic"; weight: 400 | 700 }> = {
  editorial: { family: "Instrument Serif", query: "ital@1", style: "italic", weight: 400 },
  mono: { family: "Geist Mono", query: "wght@400", style: "normal", weight: 400 },
  grotesk: { family: "Space Grotesk", query: "wght@500", style: "normal", weight: 400 },
  syne: { family: "Syne", query: "wght@700", style: "normal", weight: 700 },
};

/** Fetches a TTF subset with only the glyphs in `text`. Throws on failure so a miss is never cached. */
async function fetchFont(family: string, query: string, text: string): Promise<ArrayBuffer> {
  "use cache";
  cacheLife("max");
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${query}&text=${encodeURIComponent(text)}`)
  ).text();
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error(`no font file for ${family}`);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`font download failed for ${family}`);
  return res.arrayBuffer();
}

/** Null if Google Fonts is unreachable; the card then falls back to the default face. */
const loadFont = (family: string, query: string, text: string) =>
  fetchFont(family, query, text).catch(() => null);

type Card = { title: string; subtitle?: string; url: string; colors: [string, string, string]; font: FontId };

/** Share card: the page's palette as a soft mesh, its name in the page's display face. */
export async function ogCard({ title, subtitle, url, colors, font }: Card) {
  const [bg, mid, accent] = colors;
  const display = DISPLAY[font];
  const [displayData, monoData] = await Promise.all([
    loadFont(display.family, display.query, title),
    loadFont("Geist Mono", "wght@400", `${subtitle ?? ""}${url}`),
  ]);
  const fonts = [
    displayData && { name: "display", data: displayData, style: display.style, weight: display.weight },
    monoData && { name: "mono", data: monoData, style: "normal" as const, weight: 400 as const },
  ].filter((f) => f !== null);

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
          color: "#fff",
          backgroundColor: bg,
          backgroundImage: `radial-gradient(circle at 18% 22%, ${mid} 0%, transparent 55%), radial-gradient(circle at 85% 80%, ${accent}66 0%, transparent 50%)`,
        }}
      >
        <div style={{ display: "flex", fontFamily: "mono", fontSize: 26, letterSpacing: 4, opacity: 0.6 }}>LINKMI</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "display",
              fontStyle: display.style,
              fontWeight: display.weight,
              fontSize: title.length > 18 ? 96 : 132,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", fontFamily: "mono", fontSize: 30, opacity: 0.7 }}>{subtitle}</div>
          ) : null}
        </div>
        <div style={{ display: "flex", fontFamily: "mono", fontSize: 30, color: accent }}>{url}</div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
