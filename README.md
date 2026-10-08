# HomeServer — "Hidden Is Not Protected"

A tiny demo store for a web security class. It teaches one lesson: **the
browser is the user's computer, so anything enforced only in the browser is
not enforced at all.**

Live demo: `https://homeserverstore.vercel.app/` (checkout page has the demo controls)

## The lesson in 30 seconds

The checkout page has a **Hidden / Protected** toggle (a demo control, not a
store feature). It picks which database table the order is written to:

- **Hidden** → `orders_vuln`. Accepts whatever total the browser sends.
  Change the price in DevTools, submit, and the tampered order lands in the
  database. The server view proves it.
- **Protected** → `orders`. A `BEFORE INSERT` trigger recomputes the total
  from the products table inside Postgres, where the browser cannot reach.
  A tampered total is rejected and nothing is written.

The rule: *hidden is not protected.* For any feature, price, or permission,
ask two questions: does the browser enforce it (cosmetic), or does the
server re-check it (real)?

## Setup — use your own keys

This repo ships with **no keys**. Fork it, clone it, then wire up your own
Supabase project. Ten minutes:

1. **Create a Supabase project** (free tier is fine). Keep "Enable Data API"
   and "Automatically expose new tables" checked; our tables are created
   after the project and need API privileges.
2. **Run the schema.** In the Supabase SQL Editor, paste `schema.sql` and
   run it. It creates `products`, `orders_vuln`, `orders`, the price-check
   trigger, and demo-only access policies.
3. **Configure keys locally.** Copy `config.example.js` to
   `public/config.js` and fill in your project's URL and **anon public**
   key (Project Settings → API). `public/config.js` is gitignored.
4. **Serve locally** to rehearse: `cd public && python3 -m http.server`
5. **Deploy.** Import the repo in Vercel with project name `home-server`.
   Add two environment variables: `SUPABASE_URL` and
   `SUPABASE_ANON_KEY`. The build step (`build-config.js`) writes
   `public/config.js` from them, so your keys stay out of git.

Key rules: the **anon** key is public by design (it ships in frontend code;
the access policies are the real protection). The **service_role** key
bypasses everything — never put it in a browser, a repo, or a chat.

## Running the hack (rehearsal)

Full beats in `DEMO-SCRIPT.md`. The short version:

1. Add an RTX 4090 to the cart, go to checkout. Toggle is on **Hidden**.
2. DevTools → Elements → find `<input type="hidden" id="order_total">`,
   change `value` from `1599.00` to `1.00`.
3. Submit. Order recorded, charged $1.00. Expand **Server view**: the row is
   there, flagged TAMPERED with the real price beside it.
4. Flip the toggle to **Protected**. Repeat the edit. Submit.
5. Rejected: "price mismatch: claimed 1.00, actual 1599.00". Server view
   shows nothing new — the fraud never arrived.

## How it works

```
browser (theirs)                    server (ours: Supabase Postgres)
─────────────────                   ───────────────────────────────
product grid  ←── products table (read-only, real prices)
cart          ←── localStorage (theirs entirely)
hidden field  ──→ orders_vuln  (no check: trusts the claim)
              ──→ orders       (BEFORE INSERT trigger re-checks)
server view   ←── SELECT on both tables
```

The trigger (`enforce_real_price()` in `schema.sql`) joins the submitted
items against `products` and raises on any mismatch. Honest totals pass
through untouched, so the protected checkout works normally for real
customers.

## For instructors

- The **demo toggle** and **server view** are teaching controls, styled to
  never read as store features. Leave them in for class; strip them if you
  reuse the storefront for anything else.
- `slides.html` is a 6-slide deck (arrow keys / click to advance) covering
  the two-computer model, what's editable in the browser, a real September
  2026 checkout-tampering case with a bias callout, the demo setup, and the
  rule. Presenter is labeled per slide (Eric: 1–4, Madrid: 5–6).
- MIT licensed. Fork it, change the products, break it in new ways.

## Security notes (read before reusing)

- The access policies are **deliberately permissive** (open insert/select)
  so a classroom can run this without auth. This is a teaching demo, not a
  production pattern.
- The protected table's trigger is a stand-in for real server logic. In
  production the price check would live in your API, with authenticated
  users and orders tied to identities.
- Prices are `numeric(10,2)`; the frontend rounds to cents before sending.
  The trigger compares exact decimals, so honest checkouts never false-fail.
