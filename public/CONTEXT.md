# public — the deployed site

One job: the static site Vercel serves as root. Do not move this folder
or reference anything outside it from the pages.

## Inputs

- Build: `../build-config.js` writes `config.js` from `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` env vars (locally: gitignored `config.js` from
  `../config.example.js`).
- Runtime: Supabase (`products` table for the catalog; `orders_vuln` /
  `orders` for the demo).
- Art: `thumbs/*.webp` are deployed copies of `../assets/thumbnails/`.

## Pages

- `index.html` — storefront + cart.
- `checkout.html` — the demo: Hidden/Protected toggle, order form, server view.
- `slides.html` — talk slides (Eric 1–4, Madrid 5–6).

Do NOT load: `../assets/` source files when editing pages — edit the art
source, re-copy to the deployed location, then reload.

## Human check

After changes: serve this folder (`python3 -m http.server`), flip the
toggle, place one order per mode, confirm the server view updates.
