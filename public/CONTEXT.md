# public — the deployed site

One job: the static site Vercel serves as root. Do not move this folder.
Page assets stay inside it; Make Live calls the same-origin `/api/backoffice`
server route declared at repository root.

## Inputs

- Build: `../build-config.js` writes `config.js` from `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` env vars (locally: gitignored `config.js` from
  `../config.example.js`).
- Security checkout runtime: Supabase (`products`, `orders_vuln`, and `orders`).
- Back Office runtime: `demo-core.js` supplies a fixed rehearsal catalog and
  shared state machine. Local Sim persists only `hs_backoffice_*` browser keys,
  uses Web Locks, and runs while a demo page is open. Make Live uses the server
  boundary, isolated Supabase sessions, and real Make schedules. Server-only
  secrets never enter the public build configuration.
- Art: `thumbs/*.webp` are deployed copies of `../assets/thumbnails/`.

## Pages

- `index.html` — storefront + cart.
- `checkout.html` — the demo: Hidden/Protected toggle, order form, server view.
- `payment.html` — Back Office checkout, then authorization and mock capture.
- `order-success.html` — order number, pending/fulfilled state, and demo invoice.
- `admin.html` — presenter cockpit with orders and event log open.
- `backoffice.js` / `backoffice.css` — shared cockpit, customer display, and style.
- `demo-core.js` — shared pure domain logic, also required by the live server.
- `slides.html` — six talk slides (Eric 1–4, Madrid 5–6), matching the
  storefront/checkout style. Self-contained teaching illustrations; no
  backend calls or cart writes. Arrow keys/Space/buttons navigate, F toggles
  fullscreen, and `#slide-N` links directly to a slide.

Do NOT load: `../assets/` source files when editing pages — edit the art
source, re-copy to the deployed location, then reload.

## Human check

Serve this folder (`python3 -m http.server`). For checkout changes: flip
the toggle, place one order per mode, confirm the server view updates.
For slide changes: inspect all six slides, navigate both directions, and
change/reset the illustrated hidden total on slide 3. Check that the
checkout and storefront links on slide 5 point to the deployed pages.

Back Office: `node --test tests/backoffice.test.js` from the repo root, then
`node scripts/serve-demo.js`. Rehearse all four beats from
`../docs/DEMO-SCRIPT.md`. Local Sim needs no credentials or network. Make Live
requires `../backoffice.sql`, server environment setup, and the four scenarios
in `../make/README.md`; API tests use a fake provider and do not prove live
account wiring. Reset must not touch the security-demo tables or cart.
