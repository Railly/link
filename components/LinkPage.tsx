"use client";

import Link from "next/link";
import ShaderCanvas from "./ShaderCanvas";
import { FONTS, sanitizeUrl, type PageConfig } from "@/lib/config";
import { LinkIcon } from "@/lib/icons";

type Props = {
  config: PageConfig;
  /** Render inside a container (editor preview) instead of filling the viewport. */
  contained?: boolean;
  footer?: boolean;
  /** When set, public pages show a discreet "reportar" mailto link. */
  reportEmail?: string;
};

export default function LinkPage({ config, contained = false, footer = true, reportEmail }: Props) {
  const font = FONTS[config.font];
  const light = config.ink === "light";
  const links = config.links
    .map((l) => ({ ...l, href: sanitizeUrl(l.url) }))
    .filter((l) => l.title.trim() && l.href);

  return (
    <div
      data-shader={config.shader}
      className={`${contained ? "absolute" : "fixed"} inset-0 overflow-hidden`}
      style={
        {
          "--ink": light ? "255 255 255" : "12 12 14",
          "--ink-inv": light ? "12 12 14" : "255 255 255",
          "--radius": `${config.radius}px`,
          color: light ? "#fff" : "#0c0c0e",
          fontFamily: font.body,
          // Shown until the shader's first frame, and instead of it without WebGL.
          background: `radial-gradient(circle at 20% 15%, ${config.colors[1]}, transparent 65%), radial-gradient(circle at 85% 90%, color-mix(in srgb, ${config.colors[2]} 35%, transparent), transparent 55%), ${config.colors[0]}`,
        } as React.CSSProperties
      }
    >
      <ShaderCanvas
        shader={config.shader}
        colors={config.colors}
        speed={config.speed}
        className="absolute inset-0 h-full w-full"
      />

      <div className="no-scrollbar absolute inset-0 overflow-y-auto">
      <main className="relative mx-auto flex min-h-full w-full max-w-[34rem] flex-col items-center px-4 pb-10 pt-16 sm:pt-24">
        {config.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary user URLs
          <img
            src={config.avatar}
            alt=""
            className="lp-rise h-24 w-24 rounded-full object-cover ring-1 ring-[rgb(var(--ink)/0.25)] ring-offset-4 ring-offset-transparent"
          />
        ) : null}

        <h1
          className="lp-rise mt-6 text-center text-4xl leading-none tracking-tight sm:text-5xl"
          style={{
            fontFamily: font.display,
            fontStyle: font.italic ? "italic" : "normal",
            fontWeight: config.font === "syne" ? 700 : 400,
            animationDelay: "60ms",
          }}
        >
          {config.name}
        </h1>

        {config.bio ? (
          <p
            className="lp-rise lp-label mt-3 max-w-sm text-balance text-center text-[13px] leading-relaxed text-[rgb(var(--ink)/0.7)]"
            style={{ animationDelay: "110ms" }}
          >
            {config.bio}
          </p>
        ) : null}

        {groupLinks(links).map((section) => (
          <section key={section.key} className="mt-10 w-full">
            {section.title ? (
              <h2 className="lp-rise lp-label mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[rgb(var(--ink)/0.55)]">
                <span className="tabular-nums">{String(section.number).padStart(2, "0")}</span>
                <span aria-hidden>/</span>
                <span>{section.title}</span>
              </h2>
            ) : null}
            <ul className={`flex w-full flex-col ${config.button === "line" ? "gap-0" : "gap-3"}`}>
              {section.items.map(({ link: l, index: i }) => (
                <li key={l.id} className="lp-rise" style={{ animationDelay: `${160 + i * 45}ms` }}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`lp-btn lp-${config.button} group flex min-h-14 items-center gap-4 px-5 py-3 text-[14px]`}
                  >
                    {config.showIndex ? (
                      <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums opacity-50">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    ) : null}
                    <LinkIcon href={l.href} />
                    <span className="flex flex-1 flex-col">
                      <span className="line-clamp-2 text-balance break-words">{l.title}</span>
                      {l.note ? <span className="text-[12px] opacity-55">{l.note}</span> : null}
                    </span>
                    <span aria-hidden className="lp-arrow shrink-0 text-[13px] opacity-50">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {footer ? (
          <div className="mt-auto pt-16 font-mono text-[10px] uppercase tracking-[0.2em]">
            <div className="lp-label flex gap-6">
              <a
                href="https://github.com/sofiaferro/linkmi"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-40 transition-opacity hover:opacity-100"
              >
                linkmi · creá la tuya →
              </a>
              {reportEmail ? (
                <a
                  href={`mailto:${reportEmail}?subject=${encodeURIComponent(`reporte: ${config.name}`)}`}
                  className="opacity-40 transition-opacity hover:opacity-100"
                >
                  reportar
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
      </div>
    </div>
  );
}

type Resolved = PageConfig["links"][number] & { href: string };

/** Splits links into sections: a link with `group` opens a new section that runs until the next one. */
function groupLinks(links: Resolved[]) {
  const sections: { key: string; title?: string; number: number; items: { link: Resolved; index: number }[] }[] = [];
  links.forEach((link, index) => {
    if (link.group || sections.length === 0) {
      sections.push({ key: link.id, title: link.group, number: sections.filter((x) => x.title).length + (link.group ? 1 : 0), items: [] });
    }
    sections[sections.length - 1].items.push({ link, index });
  });
  return sections;
}
