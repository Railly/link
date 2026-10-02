import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Space_Grotesk, Syne } from "next/font/google";
import siteConfig from "@/linkmi.config.json";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["400", "700"] });

const single = process.env.LINKMI_MODE === "single";
const siteTitle = `${siteConfig.name} · Links`;
const siteDescription = `${siteConfig.bio} Hecho con linkmi.`;

export const metadata: Metadata = single
  ? {
      metadataBase: new URL(process.env.SITE_URL ?? "https://linkmi.ar"),
      title: siteTitle,
      description: siteDescription,
      authors: [{ name: siteConfig.name }],
      generator: "linkmi (github.com/sofiaferro/linkmi)",
      other: { credits: "Built with linkmi by Sofía Ferro: https://github.com/sofiaferro/linkmi" },
      openGraph: { title: siteTitle, description: siteDescription, siteName: siteTitle, locale: "es_AR", type: "profile" },
      twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription },
    }
  : {
      metadataBase: new URL(process.env.SITE_URL ?? "https://linkmi.ar"),
      title: "linkmi",
      description: "Tu página de links.",
      openGraph: { siteName: "linkmi", locale: "es_AR", type: "website" },
      twitter: { card: "summary_large_image" },
    };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable} ${space.variable} ${syne.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
