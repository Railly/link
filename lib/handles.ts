const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{1,29}$/;

/** Route segments and words people should not be able to claim. */
const RESERVED = new Set([
  "editor", "api", "p", "admin", "login", "logout", "signup", "about", "help", "terms", "privacy",
  "settings", "static", "public", "assets", "www", "app", "micelio", "favicon.ico", "robots.txt",
  "sitemap.xml", "_next", "new", "edit", "explore", "report", "support", "root", "null", "undefined",
]);

export const normalizeHandle = (raw: string) => raw.trim().toLowerCase().replace(/^@/, "");

/** Returns an error message, or null when the handle is valid. */
export function handleError(handle: string): string | null {
  if (!HANDLE_RE.test(handle)) return "2–30 caracteres: letras, números, punto, guion o guion bajo";
  if (RESERVED.has(handle)) return "ese nombre está reservado";
  return null;
}
