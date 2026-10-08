# HomeServer — agent entry

A demo storefront for a web-security talk (Mayerfeld AI Operations practicum).
Static site (Vercel) + Supabase backend. Not a real store.

## Where things live

- `public/` — the deployed site. Vercel serves this directory as root.
  `index.html` (storefront), `checkout.html` (the demo), `slides.html` (talk slides).
- `assets/` — source artwork (factory). Never deployed; `public/thumbs/`
  holds the deployed copies.
- `schema.sql` — Supabase tables. `config.example.js` — setup template
  (real keys live in gitignored `public/config.js` or Vercel env vars).
- `DEMO-SCRIPT.md` — the talk runbook. `README.md` — human setup guide.

## Task routing

- Change the site → edit `public/`. Keep the working copy in sync; verify
  parity after edits.
- Change product art → edit `assets/`, then copy the web-ready files
  into `public/thumbs/`.
- Change the demo flow → `checkout.html` + `DEMO-SCRIPT.md` together.
- Deploy → push to main; Vercel builds (`node build-config.js`) and
  deploys automatically.

## Rules

- Never commit `public/config.js` (gitignored; holds the Supabase anon key).
- `public/` is the deploy root: don't move it, don't reference anything
  outside it from the pages.
- Keep the `CONTEXT.md` files current when the structure changes.
