import { siGithub, siInstagram, siSubstack, siTiktok, siV0, siX, siYoutube } from "simple-icons";

const BY_HOST: Record<string, string> = {
  "youtube.com": siYoutube.path,
  "instagram.com": siInstagram.path,
  "x.com": siX.path,
  "twitter.com": siX.path,
  "tiktok.com": siTiktok.path,
  "github.com": siGithub.path,
  "v0.app": siV0.path,
  "substack.com": siSubstack.path,
};

/** Brand glyph for well-known hosts; null when the link has no recognisable icon. */
export function LinkIcon({ href }: { href: string }) {
  let host = "";
  let mail = false;
  try {
    const url = new URL(href);
    mail = url.protocol === "mailto:";
    host = url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const key = Object.keys(BY_HOST).find((h) => host === h || host.endsWith(`.${h}`));
  const box = "h-4 w-4 shrink-0 opacity-70";
  if (key) {
    return (
      <svg viewBox="0 0 24 24" className={box} fill="currentColor" aria-hidden>
        <path d={BY_HOST[key]} />
      </svg>
    );
  }
  if (host === "linkedin.com") {
    return <span aria-hidden className={`${box} text-center font-bold leading-4 text-[11px]`}>in</span>;
  }
  if (mail) {
    return (
      <svg viewBox="0 0 24 24" className={box} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="m3.5 6 8.5 7 8.5-7" />
      </svg>
    );
  }
  return null;
}
