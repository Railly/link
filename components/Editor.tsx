"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { checkHandle, loadPage, publishPage, savePage } from "@/app/editor/actions";
import { normalizeHandle } from "@/lib/handles";
import LinkPage from "@/components/LinkPage";
import {
  BUTTONS,
  DEFAULT_CONFIG,
  FONTS,
  encodeConfig,
  normalizeConfig,
  uid,
  type ButtonStyle,
  type FontId,
  type PageConfig,
} from "@/lib/config";
import { SHADERS, type ShaderId } from "@/lib/shaders";

const DRAFT_KEY = "linkmi:draft";
const OWNED_KEY = "linkmi:owned";
// Pre-rename keys, read once so existing drafts and edit access survive.
const LEGACY_KEYS: Record<string, string> = { [DRAFT_KEY]: "micelio:draft", [OWNED_KEY]: "micelio:owned" };
const readKey = (key: string) => localStorage.getItem(key) ?? localStorage.getItem(LEGACY_KEYS[key]);

type Owned = { handle: string; token: string };

/** An edit link (`/editor?h=handle#k=token`) wins over what this browser remembers. */
function loadOwned(): Owned | null {
  const handle = new URLSearchParams(window.location.search).get("h");
  const token = new URLSearchParams(window.location.hash.slice(1)).get("k");
  if (handle && token) return { handle: normalizeHandle(handle), token };
  try {
    const saved = JSON.parse(readKey(OWNED_KEY) ?? "null");
    if (saved?.handle && saved?.token) return saved;
  } catch {}
  return null;
}

const label = "font-mono text-[10px] uppercase tracking-[0.18em] text-white/45";
// text-base on phones: iOS Safari zooms into inputs smaller than 16px.
const input =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-base text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/35 lg:text-sm";
const chip = (on: boolean) =>
  `rounded-lg border px-3 py-2 text-xs transition-colors ${
    on ? "border-white/60 bg-white/10 text-white" : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"
  }`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-white/[0.07] py-6">
      <h2 className={label}>{title}</h2>
      {children}
    </section>
  );
}

/** Stable comparison key, so key order or defaults filled in by the server don't count as edits. */
const fingerprint = (c: PageConfig) => JSON.stringify(normalizeConfig(c));

function loadDraft(): PageConfig {
  try {
    const saved = readKey(DRAFT_KEY);
    if (saved) return normalizeConfig(JSON.parse(saved));
  } catch {}
  return DEFAULT_CONFIG;
}

/** Client-only (reads localStorage on first render); mounted via next/dynamic with ssr: false. */
export default function Editor({ canPublish, canUpload }: { canPublish: boolean; canUpload: boolean }) {
  const [config, setConfig] = useState<PageConfig>(loadDraft);
  const [owned, setOwned] = useState<Owned | null>(() => (canPublish ? loadOwned() : null));
  // `?claim=name` comes from the 404 of a free handle.
  const [handle, setHandle] = useState(() => normalizeHandle(new URLSearchParams(window.location.search).get("claim") ?? ""));
  const [handleStatus, setHandleStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [justPublished, setJustPublished] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Phones show one pane at a time; desktop always shows both side by side.
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [lt, setLt] = useState("");
  const [importState, setImportState] = useState<"idle" | "loading" | string>("idle");
  // What the published page currently holds; null until known.
  const [savedPrint, setSavedPrint] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ link: PageConfig["links"][number]; index: number } | null>(null);
  const dirty = owned !== null && savedPrint !== null && fingerprint(config) !== savedPrint;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!removed) return;
    const id = setTimeout(() => setRemoved(null), 5000);
    return () => clearTimeout(id);
  }, [removed]);

  const removeLink = (i: number) => {
    setRemoved({ link: config.links[i], index: i });
    set("links", config.links.filter((_, j) => j !== i));
  };

  const undoRemove = () => {
    if (!removed) return;
    const next = [...config.links];
    next.splice(Math.min(removed.index, next.length), 0, removed.link);
    set("links", next);
    setRemoved(null);
  };

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
    } catch {}
  }, [config]);

  const set = <K extends keyof PageConfig>(key: K, value: PageConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const setLink = (id: string, patch: Partial<{ title: string; url: string }>) =>
    set("links", config.links.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const moveLink = (i: number, dir: -1 | 1) => {
    const next = [...config.links];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("links", next);
  };

  // Persist ownership, load the published version and drop the token from the address bar.
  useEffect(() => {
    if (!owned) return;
    try {
      localStorage.setItem(OWNED_KEY, JSON.stringify(owned));
    } catch {}
    // Opening an edit link loads the published page; otherwise keep the local draft and only compare.
    const fromLink = window.location.hash.includes("k=");
    if (fromLink) window.history.replaceState(null, "", `/editor?h=${owned.handle}`);
    loadPage(owned.handle).then((published) => {
      if (!published) return;
      if (fromLink) setConfig(published);
      setSavedPrint(fingerprint(published));
    });
  }, [owned]);

  // Debounced availability check while typing a handle.
  useEffect(() => {
    if (!canPublish || owned || !handle) return;
    const id = setTimeout(async () => {
      const res = await checkHandle(handle);
      setHandleStatus(res.ok ? { ok: true, msg: "disponible" } : { ok: false, msg: res.error });
    }, 400);
    return () => clearTimeout(id);
  }, [handle, canPublish, owned]);

  const origin = () => window.location.origin;
  const encodedUrl = () => `${origin()}/p#${encodeConfig(config)}`;
  const publicUrl = (o: Owned) => `${origin()}/${o.handle}`;
  const editUrl = (o: Owned) => `${origin()}/editor?h=${o.handle}#k=${o.token}`;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const publish = async () => {
    if (!handle) {
      setNotice({ ok: false, msg: "elegí un nombre para tu página" });
      return;
    }
    setBusy(true);
    setNotice(null);
    const res = await publishPage(handle, config);
    setBusy(false);
    if (!res.ok) return setNotice({ ok: false, msg: res.error });
    setSavedPrint(fingerprint(config));
    setOwned({ handle: res.handle, token: res.token });
    setJustPublished(true);
  };

  const save = async () => {
    if (!owned) return;
    setBusy(true);
    setNotice(null);
    const res = await savePage(owned.handle, owned.token, config);
    setBusy(false);
    if (res.ok) setSavedPrint(fingerprint(config));
    setNotice(res.ok ? { ok: true, msg: "cambios guardados" } : { ok: false, msg: res.error });
  };

  const forget = () => {
    try {
      localStorage.removeItem(OWNED_KEY);
      localStorage.removeItem(LEGACY_KEYS[OWNED_KEY]);
    } catch {}
    window.history.replaceState(null, "", "/editor");
    setOwned(null);
    setSavedPrint(null);
    setJustPublished(false);
  };

  const uploadAvatar = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) return setNotice({ ok: false, msg: "la foto tiene que pesar menos de 2 MB" });
    setUploading(true);
    try {
      const blob = await upload(`avatars/${file.name}`, file, { access: "public", handleUploadUrl: "/api/upload" });
      set("avatar", blob.url);
    } catch {
      setNotice({ ok: false, msg: "no se pudo subir la foto" });
    }
    setUploading(false);
  };

  const downloadConfig = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }));
    a.download = "linkmi.config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importLinktree = async () => {
    const u = lt.trim().replace(/^https?:\/\/(www\.)?linktr\.ee\//, "").replace(/\/$/, "");
    if (!u) return;
    setImportState("loading");
    try {
      const res = await fetch(`/api/import?u=${encodeURIComponent(u)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfig((c) => normalizeConfig({ ...c, ...data, links: data.links.map((l: object) => ({ ...l, id: uid() })) }));
      setImportState("idle");
    } catch (e) {
      setImportState(e instanceof Error ? e.message : "error");
    }
  };

  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-[440px_1fr]">
      {/* preview */}
      <div
        className={`${mobileView === "preview" ? "fixed inset-x-0 top-0 bottom-20" : "hidden"} overflow-hidden lg:relative lg:inset-auto lg:order-2 lg:block lg:h-full`}
      >
        <LinkPage config={config} contained footer={false} />
      </div>

      {/* controls */}
      <aside
        className={`${mobileView === "edit" ? "" : "hidden"} relative border-white/[0.07] bg-[#0b0a10] px-5 pb-32 lg:order-1 lg:block lg:overflow-y-auto lg:border-r`}
      >
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="font-serif text-2xl italic">
            linkmi
          </Link>
          <span className={label}>{owned ? `editando /${owned.handle}` : "editor"}</span>
        </header>

        <Section title={owned ? "Tu página" : "Publicar"}>
          {canPublish && owned ? (
            <>
              <a href={publicUrl(owned)} target="_blank" className="truncate text-sm text-white underline-offset-4 hover:underline">
                {publicUrl(owned).replace(/^https?:\/\//, "")} ↗
              </a>
              {justPublished ? (
                <div className="rounded-xl border border-amber-200/25 bg-amber-200/[0.06] p-3 text-xs leading-relaxed text-amber-100/90">
                  Guardá tu <strong>link de edición</strong>: es la única forma de editar esta página desde otro
                  dispositivo. No lo compartas.
                </div>
              ) : null}
              <div className="flex gap-2">
                <button className={chip(false)} onClick={() => copy(editUrl(owned), "edit")}>
                  {copied === "edit" ? "¡copiado!" : "copiar link de edición"}
                </button>
                <button className={chip(false)} onClick={forget}>
                  crear otra
                </button>
              </div>
            </>
          ) : canPublish ? (
            <>
              <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.04] pl-3 text-base lg:text-sm focus-within:border-white/35">
                <span className="text-white/35">{typeof window !== "undefined" ? window.location.host : ""}/</span>
                <input
                  className="w-full bg-transparent py-2 pr-3 text-white outline-none placeholder:text-white/25"
                  placeholder="tunombre"
                  value={handle}
                  onChange={(e) => {
                    setHandle(normalizeHandle(e.target.value));
                    setHandleStatus(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && publish()}
                />
              </div>
              {handleStatus ? (
                <p className={`text-xs ${handleStatus.ok ? "text-emerald-300/80" : "text-red-300/80"}`}>{handleStatus.msg}</p>
              ) : null}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-white/45">
              Este deploy no tiene base de datos: compartí tu página con el link codificado o descargá la config para tu
              propio deploy.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button className={chip(false)} onClick={() => copy(encodedUrl(), "encoded")}>
              {copied === "encoded" ? "¡copiado!" : "link sin cuenta"}
            </button>
            <button className={chip(false)} onClick={downloadConfig}>
              descargar config
            </button>
          </div>
        </Section>

        <Section title="Importar de Linktree">
          <div className="flex gap-2">
            <input
              className={input}
              placeholder="usuario o linktr.ee/usuario"
              value={lt}
              onChange={(e) => setLt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && importLinktree()}
            />
            <button onClick={importLinktree} className={chip(false)} disabled={importState === "loading"}>
              {importState === "loading" ? "…" : "importar"}
            </button>
          </div>
          {importState !== "idle" && importState !== "loading" ? (
            <p className="text-xs text-red-300/80">{importState}</p>
          ) : null}
        </Section>

        <Section title="Perfil">
          <input className={input} placeholder="nombre" value={config.name} onChange={(e) => set("name", e.target.value)} />
          <textarea
            className={`${input} min-h-16 resize-none`}
            placeholder="bio"
            value={config.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className={input}
              placeholder="URL de tu foto (https://…)"
              value={config.avatar}
              onChange={(e) => set("avatar", e.target.value)}
            />
            {canUpload ? (
              <>
                <button className={chip(false)} onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? "…" : "subir"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                  hidden
                  onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                />
              </>
            ) : null}
          </div>
        </Section>

        <Section title="Links">
          <ul className="flex flex-col gap-2">
            {config.links.map((l, i) => (
              <li key={l.id} className="flex gap-2 rounded-xl border border-white/[0.07] p-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <input className={input} placeholder="título" value={l.title} onChange={(e) => setLink(l.id, { title: e.target.value })} />
                  <input className={input} placeholder="https://" value={l.url} onChange={(e) => setLink(l.id, { url: e.target.value })} />
                </div>
                <div className="flex flex-col justify-between text-white/40">
                  <div className="flex flex-col">
                    <button aria-label="subir" className="px-1.5 py-0.5 hover:text-white" onClick={() => moveLink(i, -1)}>↑</button>
                    <button aria-label="bajar" className="px-1.5 py-0.5 hover:text-white" onClick={() => moveLink(i, 1)}>↓</button>
                  </div>
                  <button aria-label="eliminar" className="px-1.5 py-0.5 hover:text-red-300" onClick={() => removeLink(i)}>
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            className="rounded-xl border border-dashed border-white/15 py-3 text-xs text-white/55 transition-colors hover:border-white/35 hover:text-white"
            onClick={() => set("links", [...config.links, { id: uid(), title: "", url: "" }])}
          >
            + agregar link
          </button>
        </Section>

        <Section title="Fondo">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(SHADERS) as ShaderId[]).map((id) => (
              <button
                key={id}
                className={`${chip(config.shader === id)} flex flex-col gap-1.5 text-left`}
                onClick={() => setConfig((c) => ({ ...c, shader: id, colors: SHADERS[id].palette }))}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${SHADERS[id].palette.join(", ")})` }}
                />
                {SHADERS[id].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            {config.colors.map((c, i) => (
              <label key={i} className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full ring-1 ring-white/20">
                <input
                  type="color"
                  value={c}
                  aria-label={`color ${i + 1}`}
                  className="absolute -inset-2 h-14 w-14 cursor-pointer"
                  onChange={(e) => {
                    const next = [...config.colors] as PageConfig["colors"];
                    next[i] = e.target.value;
                    set("colors", next);
                  }}
                />
              </label>
            ))}
            <span className="ml-auto text-xs text-white/40">velocidad</span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={config.speed}
              onChange={(e) => set("speed", Number(e.target.value))}
              className="w-24 accent-white"
            />
          </div>
        </Section>

        <Section title="Tipografía">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(FONTS) as FontId[]).map((id) => (
              <button
                key={id}
                className={`${chip(config.font === id)} text-base`}
                style={{ fontFamily: FONTS[id].display, fontStyle: FONTS[id].italic ? "italic" : "normal" }}
                onClick={() => set("font", id)}
              >
                {FONTS[id].label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Botones">
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(BUTTONS) as ButtonStyle[]).map((id) => (
              <button key={id} className={chip(config.button === id)} onClick={() => set("button", id)}>
                {BUTTONS[id]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">bordes</span>
            <input
              type="range"
              min={0}
              max={32}
              value={config.radius}
              onChange={(e) => set("radius", Number(e.target.value))}
              className="flex-1 accent-white"
            />
          </div>
          <div className="flex gap-2">
            <button className={chip(config.ink === "light")} onClick={() => set("ink", "light")}>texto claro</button>
            <button className={chip(config.ink === "dark")} onClick={() => set("ink", "dark")}>texto oscuro</button>
            <button className={chip(config.showIndex)} onClick={() => set("showIndex", !config.showIndex)}>01 02 03</button>
          </div>
        </Section>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-2 border-t border-white/[0.07] bg-[#0b0a10]/90 p-4 backdrop-blur lg:w-[440px]">
        {removed ? (
          <p role="status" className="flex items-center gap-3 text-xs text-white/70">
            link eliminado
            <button onClick={undoRemove} className="underline underline-offset-4 hover:text-white">
              deshacer
            </button>
          </p>
        ) : notice && !(notice.ok && dirty) ? (
          <p role="status" className={`text-xs ${notice.ok ? "text-emerald-300/80" : "text-red-300/80"}`}>
            {notice.msg}
          </p>
        ) : dirty ? (
          <p role="status" className="text-xs text-amber-200/80">
            cambios sin guardar
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            onClick={() => setMobileView((v) => (v === "edit" ? "preview" : "edit"))}
            className="rounded-xl border border-white/15 px-4 text-sm text-white/80 transition-colors hover:border-white/40 lg:hidden"
          >
            {mobileView === "edit" ? "vista previa" : "editar"}
          </button>
          <button
            onClick={canPublish ? (owned ? save : publish) : () => copy(encodedUrl(), "main")}
            disabled={busy || (owned !== null && savedPrint !== null && !dirty)}
            className="flex-1 rounded-xl bg-white py-3 text-sm font-medium text-black transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {busy
              ? "…"
              : canPublish
                ? owned
                  ? savedPrint !== null && !dirty
                    ? "guardado ✓"
                    : "guardar cambios"
                  : "publicar"
                : copied === "main"
                  ? "¡copiado!"
                  : "copiar mi link"}
          </button>
          <button
            onClick={() => window.open(owned ? publicUrl(owned) : encodedUrl(), "_blank", "noopener")}
            aria-label="abrir página publicada"
            className="rounded-xl border border-white/15 px-4 text-sm text-white/80 transition-colors hover:border-white/40"
          >
            ↗
          </button>
        </div>
      </div>
    </div>
  );
}
