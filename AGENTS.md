# HomeServer — agent entry

A demo storefront for a web-security talk (Mayerfeld AI Operations practicum).
Static site (Vercel) + Supabase backend. Not a real store.

## Where things live

- `public/` — the deployed site. Vercel serves this directory as root.
  `index.html` (storefront), `checkout.html` (the demo), `slides.html` (talk slides).
- Back Office: `public/payment.html`, `public/order-success.html`, and
  `public/admin.html`; shared logic in `public/demo-core.js` and cockpit in
  `public/backoffice.js`. Live boundary: `api/backoffice.js`, additive database
  migration: `backoffice.sql`, and Make setup: `make/README.md`.
- `assets/` — source artwork (factory). Never deployed; `public/thumbs/`
  holds the deployed copies.
- `schema.sql` — Supabase tables. `config.example.js` — setup template
  (real keys live in gitignored `public/config.js` or Vercel env vars).
- `docs/DEMO-SCRIPT.md` — the talk runbook (internal). `README.md` — human setup guide.
- `docs/` — the talk's knowledge base (theory, examples, demo internals).
  Reference for presenters; not deployed.

## Task routing

- Change the site → edit `public/`. Keep the working copy in sync; verify
  parity after edits.
- Change product art → edit `assets/`, then copy the web-ready files
  into `public/thumbs/`.
- Change the demo flow → `checkout.html` + `docs/DEMO-SCRIPT.md` together.
- Deploy → push to main; Vercel builds (`node build-config.js`) and
  deploys automatically.

## Rules

- Never commit `public/config.js` (gitignored; holds the Supabase anon key).
- Never put Back Office server keys or Make tokens in `public/` or build output.
- Back Office reset is scoped to its active rehearsal; never delete original
  `orders`, `orders_vuln`, or `products`. Test with
  `node --test tests/backoffice.test.js tests/backoffice-view.test.js tests/make-blueprints.test.js`; preview with `node scripts/serve-demo.js`.
- `public/` is the deploy root: don't move it, don't reference anything
  outside it from the pages.
- Keep the `CONTEXT.md` files current when the structure changes.
