# linkmicelio

A free link-in-bio page with hand-written WebGL shader backgrounds, careful typography and no accounts.

**Live:** [linkmicelio.vercel.app](https://linkmicelio.vercel.app) · **Example:** [linkmicelio.vercel.app/sofiaferro](https://linkmicelio.vercel.app/sofiaferro)

- 5 shaders (micelio, aurora, liquid chrome, mesh gradient, halftone) with custom colours and speed
- 4 type pairings, 4 button styles, adjustable corners
- One-click import from a public Linktree profile
- Editing without accounts: publishing gives you a secret edit link

## Three ways to use it

1. **Hosted page** — open [`/editor`](https://linkmicelio.vercel.app/editor), pick a name and publish. You get `linkmicelio.vercel.app/yourname` plus a private edit link. Keep the edit link safe: it is the only way to edit the page.
2. **Encoded link** — "link sin cuenta" in the editor puts the whole page inside the URL (`/p#…`). Nothing is stored anywhere.
3. **Your own deploy** — fork it and serve a single page from `micelio.config.json`, with no database:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsofiaferro%2Flinkmicelio&env=MICELIO_MODE&envDescription=Set%20to%20%22single%22%20to%20serve%20only%20your%20own%20page&project-name=my-links)

   Set `MICELIO_MODE=single`, design your page in `/editor`, click "descargar config" and replace `micelio.config.json` with the downloaded file.

## Stack

Next.js 16 (App Router, Cache Components) on Vercel · Upstash Redis for hosted pages · Vercel Blob for avatar uploads · raw WebGL, no 3D libraries.

## Running locally

```bash
npm install
vercel link && vercel env pull   # optional: only needed for hosted pages and uploads
npm run dev
```

Without Redis env vars the app still runs: the editor offers encoded links and config download instead of publishing.

## Environment

| Variable | Purpose |
| --- | --- |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis (hosted pages) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (avatar uploads, public store) |
| `ADMIN_SECRET` | Authorises cache purges from `scripts/takedown.mjs` |
| `MICELIO_MODE` | `single` serves `micelio.config.json` at `/` |
| `MICELIO_REPORT_EMAIL` | Optional: shows a "reportar" link on public pages |

## Admin scripts

```bash
node --env-file=.env.local scripts/seed.mjs sofiaferro        # seed a page, prints its edit link once
node --env-file=.env.local scripts/seed.mjs sofiaferro --rotate  # overwrite and issue a new edit link
node --env-file=.env.local scripts/takedown.mjs <handle>      # remove a page and purge its cache
```

## License

MIT
