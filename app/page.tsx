import Link from "next/link";
import ShaderCanvas from "@/components/ShaderCanvas";
import LinkPage from "@/components/LinkPage";
import { normalizeConfig } from "@/lib/config";
import { SHADERS } from "@/lib/shaders";
import siteConfig from "@/linkmi.config.json";

export default function Home() {
  // Self-hosted forks serve their own page at the root instead of the landing.
  if (process.env.LINKMI_MODE === "single") {
    return <LinkPage config={normalizeConfig(siteConfig)} />;
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <ShaderCanvas shader="micelio" colors={SHADERS.micelio.palette} className="fixed inset-0 h-full w-full" />

      <main className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-8 sm:px-8">
        <nav className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
          <span>linkmi</span>
          <Link href="/sofiferro" className="transition-colors hover:text-white">
            ejemplo ↗
          </Link>
        </nav>

        <section className="my-auto py-20">
          <h1 className="lp-rise font-serif text-6xl leading-[0.95] tracking-tight sm:text-8xl">
            tus links,
            <br />
            <em className="text-[#d9c4ff]">vivos.</em>
          </h1>
          <p
            className="lp-rise mt-6 max-w-md text-[15px] leading-relaxed text-white/65"
            style={{ animationDelay: "80ms" }}
          >
            Una página de links gratuita con fondos en shaders, tipografía cuidada y cero cuentas.
            Tu configuración vive en el link: nada se guarda en ningún servidor.
          </p>
          <div className="lp-rise mt-10 flex flex-wrap gap-3" style={{ animationDelay: "160ms" }}>
            <Link
              href="/editor"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform active:scale-[0.97]"
            >
              crear mi página
            </Link>
            <Link
              href="/sofiferro"
              className="lp-glass rounded-full px-6 py-3 text-sm text-white [--ink:255_255_255]"
            >
              ver un ejemplo
            </Link>
          </div>
        </section>

        <footer className="grid grid-cols-2 gap-6 border-t border-white/10 pt-6 font-mono text-[11px] leading-relaxed text-white/45 sm:grid-cols-4">
          {["5 shaders WebGL", "4 tipografías", "importá tu Linktree", "gratis, sin login"].map((t, i) => (
            <span key={t}>
              <span className="text-white/25">{String(i + 1).padStart(2, "0")} </span>
              {t}
            </span>
          ))}
        </footer>
      </main>
    </div>
  );
}
