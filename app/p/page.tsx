"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LinkPage from "@/components/LinkPage";
import { decodeConfig, type PageConfig } from "@/lib/config";

/** Shared pages: the whole config lives in the URL hash, so nothing is stored server-side. */
export default function SharedPage() {
  const [config, setConfig] = useState<PageConfig | null | "invalid">(null);

  useEffect(() => {
    const read = () => {
      const c = decodeConfig(window.location.hash.slice(1));
      setConfig(c ?? "invalid");
      if (c) document.title = c.name;
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (config === null) return null;
  if (config === "invalid") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-serif text-3xl italic">este link no funciona</p>
        <Link href="/editor" className="font-mono text-xs uppercase tracking-widest opacity-60 hover:opacity-100">
          crear tu página →
        </Link>
      </main>
    );
  }
  return <LinkPage config={config} />;
}
