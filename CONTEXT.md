# HomeServer — the demo store

One line: a fake McMaster-Carr-style storefront whose checkout has a
Hidden/Protected toggle, built to demo why you can't trust the browser.

## Structure

| Path | Job |
|---|---|
| `public/` | The product: the deployed site (Vercel outputDirectory) |
| `assets/` | The factory: source artwork, committed, never deployed |
| `schema.sql` | Supabase `products`, `orders_vuln`, `orders` tables |
| `build-config.js` | Build step: writes `public/config.js` from Vercel env vars |
| `config.example.js` | Setup template for forkers (real keys stay out of git) |
| `DEMO-SCRIPT.md` | Talk runbook for the live demo |
| `research/` | Public source-backed research companion (GitHub only; not deployed) |
| `docs/` | Local presenter preparation (gitignored; not deployed) |

Factory (stable): `assets/`, `schema.sql`, `config.example.js`.
Product (the deploy): `public/`, live at https://homeserverstore.vercel.app/

## Contracts

- `public/CONTEXT.md` — the site's inputs, runtime deps, and checks.
- `assets/CONTEXT.md` — art source → deployed copies pipeline.
