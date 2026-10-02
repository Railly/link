import { normalizeConfig } from "@/lib/config";
import { OG_SIZE, ogCard } from "@/lib/og";
import { siteCard } from "@/lib/og-site";
import siteConfig from "@/linkmi.config.json";

export const size = OG_SIZE;
export const contentType = "image/png";
const single = process.env.LINKMI_MODE === "single";
export const alt = single ? `${siteConfig.name}: links` : "linkmi: tus links, vivos";

export default function Image() {
  if (single) {
    const host = new URL(process.env.SITE_URL ?? "https://linkmi.ar").host;
    return siteCard(normalizeConfig(siteConfig), host);
  }
  return ogCard({
    title: "tus links, vivos.",
    subtitle: "una página de links, sin cuentas ni contraseñas",
    url: "linkmi.ar",
    colors: ["#0a0a0a", "#1d2a06", "#d4ff3a"],
    font: "editorial",
  });
}
