// Moves a page to a new handle, keeping its content and edit token.
// Usage: node --env-file=.env.local scripts/rename.mjs <old> <new>
import { redis } from "./redis.mjs";

const [from, to] = process.argv.slice(2);
if (!from || !to) {
  console.error("Usage: scripts/rename.mjs <old> <new>");
  process.exit(1);
}
// RENAMENX on the owner key is the atomic claim: it fails if <new> is taken.
const moved = await redis.renamenx(`owner:${from}`, `owner:${to}`).catch((e) => {
  console.error(`Cannot rename: ${e.message}`);
  process.exit(1);
});
if (!moved) {
  console.error(`"${to}" is already taken.`);
  process.exit(1);
}
await redis.rename(`page:${from}`, `page:${to}`);
await redis.rename(`meta:${from}`, `meta:${to}`);

const base = process.env.SITE_URL ?? "https://linkmi.ar";
const res = await fetch(`${base}/api/revalidate?h=${encodeURIComponent(from)}`, {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.ADMIN_SECRET ?? ""}` },
});
console.log(`Moved "${from}" to "${to}". Old cache purge: ${res.ok ? "ok" : `failed (${res.status})`}.`);
console.log(`Edit link: ${base}/editor?h=${to}#k=<same token as before>`);
