import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "linkmi: tus links, vivos";

export default function Image() {
  return ogCard({
    title: "tus links, vivos.",
    subtitle: "una página de links, sin cuentas ni contraseñas",
    url: "linkmi.ar",
    colors: ["#0a0a0a", "#1d2a06", "#d4ff3a"],
    font: "editorial",
  });
}
