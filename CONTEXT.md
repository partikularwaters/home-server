# HomeServer — the demo store

One line: a fake McMaster-Carr-style storefront with two teaching flows:
webhooks versus polling in Back Office, and Hidden/Protected browser security.

## Structure

| Path | Job |
|---|---|
| `public/` | The product: the deployed site (Vercel outputDirectory) |
| `assets/` | The factory: source artwork, committed, never deployed |
| `schema.sql` | Supabase `products`, `orders_vuln`, `orders` tables |
| `backoffice.sql` | Isolated live rehearsal sessions, atomic updates, and inspection views |
| `api/backoffice.js` | Vercel server boundary for mock payments and Make callbacks |
| `make/` | Four Make scenario contracts, setup, and live acceptance checks |
| `tests/` | Shared lifecycle and live API regression checks |
| `scripts/serve-demo.js` | Dependency-free local static and API preview |
| `build-config.js` | Build step: writes `public/config.js` from Vercel env vars |
| `config.example.js` | Setup template for forkers (real keys stay out of git) |
| `docs/DEMO-SCRIPT.md` | Internal runbook for both teaching flows |
| `research/` | Public source-backed research companion (GitHub only; not deployed) |
| `docs/` | Local presenter preparation (gitignored; not deployed) |

Factory (stable): `assets/`, `schema.sql`, `config.example.js`.
Product (static deploy): `public/`, plus root `api/` for Vercel functions.
Existing deployment: https://homeserverstore.vercel.app/. New Back Office
behavior is local until these changes are deployed and live services configured.

## Contracts

- `public/CONTEXT.md` — the site's inputs, runtime deps, and checks.
- `assets/CONTEXT.md` — art source → deployed copies pipeline.
