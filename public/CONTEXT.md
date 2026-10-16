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
- `payment.html` — sample checkout form; one Pay action authorizes and captures in place.
- `order-success.html` — order number, pending/fulfilled state, and demo invoice.
- `admin.html` — full setup controls, order history, and raw event log.
- `backoffice.js` / `backoffice.css` — persistent Orders/Inventory presentation, customer
  display, Settings and record-inspection dialogs, and full admin controls.
- `backoffice-view.js` — pure projections for selected-order metrics, bounded relevant
  activity, and descriptions that distinguish rehearsal-wide runs from order events.
- `workspace.js` / `workspace.css` — shared navigation behavior, persistent dark/light theme,
  and fluid desktop split. Essential text stays readable; short windows use
  contained scrolling, and narrow windows stack the panels.
- `theme.css` — local snapshot of Supabase’s official semantic colors and dark/light
  themes (source URLs and retrieval date are recorded in its header).
- `demo-core.js` — shared pure domain logic, also required by the live server.
- `webhooks-slides.html` — eight Back Office talk slides, with source links,
  static diagrams, and a demo handoff. Uses local theme CSS and shared theme
  behavior; it never loads the order model or changes the cart. Speaking notes
  are in `../research/webhooks/presenter-notes.md`.
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

Back Office: `node --test tests/backoffice.test.js tests/backoffice-view.test.js tests/make-blueprints.test.js` from the repo root, then
`node scripts/serve-demo.js`. Rehearse all four beats from
`../docs/DEMO-SCRIPT.md`. Local Sim needs no credentials or network. Make Live
requires `../backoffice.sql`, server environment setup, and the two scenarios
in `../make/README.md`; API tests use a fake provider and do not prove live
account wiring. Reset must not touch the security-demo tables or cart.

Presentation checks: rehearse the four beats at 1920 × 1080, 1440 × 900,
and 1366 × 768. Verify the pay/action areas stay accessible, body scrolling
is absent in the desktop split, and event text stays 18px. At a narrow or
zoomed viewport, verify the stacked fallback without changing the cart or
the security form’s hidden total. Reset remains scoped to the active rehearsal.

Shopping navigation: Cart is beside the customer catalog heading; Checkout is
in its cart summary. Edit cart in payment returns to `index.html#cart`. These
actions are absent from the global navbar, which stays identical across pages.

Back Office slide checks: navigate all eight slides forward and backward,
verify hash links, theme toggle, fullscreen control, and demo link, and inspect
fit at 1920 × 1080 and 1366 × 768. Public research and the versioned operating
guide live at `../research/webhooks/` and `../DEMO-GUIDE.md`.


Make Live uses S1 (payment webhook) and S2 (context, live-mode filter, poll,
reconciliation, condition, retry). The live panel's Run scheduled checks launches
only S2 through the server if optional Make API access is configured; otherwise
it visibly directs presenters to Run once in Make. Individual job buttons and
short interval inputs are Local Sim controls. The live 15-minute note records
the observed rehearsal schedule rather than querying Make's schedule API.

Live evidence scrolls as one contained area in short desktop windows, reserving
the S2 instruction and action buttons below it. Local Sim retains individual
check buttons and its existing evidence behavior.
