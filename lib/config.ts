import type { ShaderId } from "./shaders";

export type FontId = "editorial" | "mono" | "grotesk" | "syne";
export type ButtonStyle = "glass" | "solid" | "outline" | "line";
export type Ink = "light" | "dark";

export type LinkItem = { id: string; title: string; url: string };

export type PageConfig = {
  name: string;
  bio: string;
  avatar: string;
  links: LinkItem[];
  shader: ShaderId;
  colors: [string, string, string];
  speed: number;
  font: FontId;
  button: ButtonStyle;
  radius: number;
  ink: Ink;
  showIndex: boolean;
};

export const FONTS: Record<FontId, { label: string; display: string; body: string; italic: boolean }> = {
  editorial: { label: "Editorial", display: "var(--font-instrument)", body: "var(--font-geist-mono)", italic: true },
  mono: { label: "Terminal", display: "var(--font-geist-mono)", body: "var(--font-geist-mono)", italic: false },
  grotesk: { label: "Grotesk", display: "var(--font-space)", body: "var(--font-space)", italic: false },
  syne: { label: "Syne", display: "var(--font-syne)", body: "var(--font-geist)", italic: false },
};

export const BUTTONS: Record<ButtonStyle, string> = {
  glass: "Vidrio",
  solid: "Sólido",
  outline: "Contorno",
  line: "Lista",
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_CONFIG: PageConfig = {
  name: "tu nombre",
  bio: "una línea sobre vos",
  avatar: "",
  links: [
    { id: "a", title: "portfolio", url: "https://example.com" },
    { id: "b", title: "instagram", url: "https://instagram.com" },
  ],
  shader: "micelio",
  colors: ["#07060b", "#3b1d5e", "#c9a7ff"],
  speed: 1,
  font: "editorial",
  button: "glass",
  radius: 14,
  ink: "light",
  showIndex: true,
};

const SAFE_SCHEMES = ["http:", "https:", "mailto:", "tel:"];

/** Only allow http(s)/mailto/tel so shared configs cannot inject javascript: URLs. */
export function sanitizeUrl(raw: string, schemes = SAFE_SCHEMES): string {
  const value = raw.trim();
  if (!value) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return schemes.includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Same-origin paths ("/me.png") stay relative; anything else must be an http(s) URL. */
function sanitizeAvatar(raw: string): string {
  const value = raw.trim();
  if (/^\/(?!\/)/.test(value)) return value;
  return sanitizeUrl(value, ["http:", "https:"]);
}

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const str = (v: unknown, max: number, fallback = "") =>
  typeof v === "string" ? v.slice(0, max) : fallback;
const oneOf = <T extends string>(v: unknown, opts: readonly T[], fallback: T): T =>
  opts.includes(v as T) ? (v as T) : fallback;

export function normalizeConfig(input: unknown): PageConfig {
  const c = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_CONFIG;
  const colors = Array.isArray(c.colors) && c.colors.length === 3 && c.colors.every(isHex)
    ? (c.colors as [string, string, string])
    : d.colors;
  const links = Array.isArray(c.links)
    ? c.links.slice(0, 50).map((l: Record<string, unknown>) => ({
        id: str(l?.id, 20) || uid(),
        title: str(l?.title, 120),
        url: str(l?.url, 2000),
      }))
    : d.links;
  return {
    name: str(c.name, 80, d.name),
    bio: str(c.bio, 300, d.bio),
    avatar: sanitizeAvatar(str(c.avatar, 2000)),
    links,
    shader: oneOf(c.shader, ["micelio", "aurora", "liquid", "mesh", "halftone"] as const, d.shader),
    colors,
    speed: typeof c.speed === "number" ? Math.min(3, Math.max(0, c.speed)) : d.speed,
    font: oneOf(c.font, Object.keys(FONTS) as FontId[], d.font),
    button: oneOf(c.button, Object.keys(BUTTONS) as ButtonStyle[], d.button),
    radius: typeof c.radius === "number" ? Math.min(32, Math.max(0, c.radius)) : d.radius,
    ink: oneOf(c.ink, ["light", "dark"] as const, d.ink),
    showIndex: typeof c.showIndex === "boolean" ? c.showIndex : d.showIndex,
  };
}

export function encodeConfig(config: PageConfig): string {
  const bytes = new TextEncoder().encode(JSON.stringify(config));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeConfig(data: string): PageConfig | null {
  try {
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return normalizeConfig(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
