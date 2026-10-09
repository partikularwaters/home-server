# HomeServer — "Hidden Is Not Protected"

A tiny demo store for a web security class. It teaches one lesson: **the
browser runs on the user's device, so page-only checks cannot enforce the
store's price or access rules.**

Live demo: `https://homeserverstore.vercel.app/` (checkout page has the demo controls)

Research companion: [Browser Input, Server Checks, and Checkout Security](research/README.md).
It covers published guidance, incident evidence, checkout-service patterns,
and the supplied demo's limits. Internal presenter preparation stays local.

## The lesson in 30 seconds

The checkout page has a **Hidden / Protected** toggle (a demo control, not a
store feature). It picks which database table the order is written to:

- **Hidden** → `orders_vuln`. Accepts whatever total the browser sends.
  The supplied schema has no catalog-total trigger on this table. The
  demo submits the editable hidden total and reads back stored rows.
- **Protected** → `orders`. A `BEFORE INSERT` trigger recomputes the total
  from matching products inside Postgres. A mismatch raises an exception
  and rejects that insertion; this is a narrow price check.

The lesson: *hidden is not protected.* Price, permission, and business rules
need checks beyond the page. The [research](research/README.md) separates
those responsibilities and documents the price trigger's limitations.

## Setup — use your own keys

Configuration files are gitignored; use your own Supabase project. This
ignore convention is not a certification of all repository history:

1. **Create a Supabase project** with the Data API enabled. Ensure the
   browser-facing database role has the table privileges needed for this
   demo; row-security policies alone do not grant SQL privileges. See
   [Supabase's key and access guide](https://supabase.com/docs/guides/getting-started/api-keys).
2. **Run the schema.** In the Supabase SQL Editor, paste `schema.sql` and
   run it. It creates `products`, `orders_vuln`, `orders`, the price-check
   trigger, and demo-only access policies.
3. **Configure keys locally.** Copy `config.example.js` to
   `public/config.js` and fill in your project's URL and a browser-safe
   application key. This demo calls the configuration field
   `supabaseAnonKey`; consult [Supabase's current key guide](https://supabase.com/docs/guides/getting-started/api-keys)
   for publishable and legacy anon keys. `public/config.js` is gitignored.
4. **Serve locally** to rehearse: `cd public && python3 -m http.server`
5. **Deploy.** Import the repo in Vercel with project name `home-server`.
   Add two environment variables: `SUPABASE_URL` and
   `SUPABASE_ANON_KEY`. The build step (`build-config.js`) writes
   `public/config.js` from them, so your keys stay out of git.

Key rules: browser-safe application keys do not identify individual buyers.
Access depends on database grants and row-security policies. Elevated
secret/service-role keys bypass row security and must stay out of browser
code and source control. This does not mean every database constraint or
trigger is bypassed. [Source: Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Running the hack (rehearsal)

Full beats in `DEMO-SCRIPT.md`. The short version:

1. Add an RTX 4090 to the cart, go to checkout. Toggle is on **Hidden**.
2. DevTools → Elements → find `<input type="hidden" id="order_total">`,
   change `value` from `1599.00` to `1.00`.
3. Submit. The demo attempts to record an order with total $1.00; no real
   payment occurs. Expand **Server view** to inspect the readback. Its
   comparison labels are calculated in the browser.
4. Flip the toggle to **Protected**. Repeat the edit. Submit.
5. With the seeded GPU price, the trigger raises
   "price mismatch: claimed 1.00, actual 1599.00" and rejects the insert.
   This expected result assumes the supplied schema and access are installed.

## How it works

```
browser (theirs)                    server (ours: Supabase Postgres)
─────────────────                   ───────────────────────────────
product grid  ←── products table (read-only, real prices)
cart          ←── localStorage (theirs entirely)
hidden field  ──→ orders_vuln  (no catalog-total trigger)
              ──→ orders       (BEFORE INSERT trigger re-checks)
server view   ←── SELECT on both tables
```

The trigger (`enforce_real_price()` in `schema.sql`) joins matching items
against `products` and rejects a total mismatch or zero aggregate. It does
not enforce every item's existence or positive quantity. See
[the implementation analysis](research/homeserver-demo.md) for its scope,
access policies, and source-derived edge cases.

## For instructors

- The **demo toggle** and **server view** are teaching controls, styled to
  never read as store features. Leave them in for class; strip them if you
  reuse the storefront for anything else.
- `slides.html` is a 6-slide deck styled to match the storefront and
  checkout. It includes HomeServer recreations, an interactive hidden-total
  illustration, the documented GitHub 2012 incident, the live demo handoff,
  and checkout-service protections alongside other website rules. Eric
  presents slides 1–4; Madrid presents 5–6. Use arrow keys, Space, the
  navigation buttons, or blank slide space to advance; F toggles fullscreen.
  Direct links use `#slide-1` through `#slide-6`. The illustrations work
  without Supabase and do not submit orders. Spoken prose and technical
  notes remain in local, unpublished presenter preparation.
- MIT licensed. Fork it, change the products, break it in new ways.

## Security notes (read before reusing)

- The access policies are **deliberately permissive** (open insert/select)
  so a classroom can run this without auth. This is a teaching demo, not a
  production pattern.
- The trigger is server-side SQL with a narrow teaching purpose. A
  production design also needs item/quantity validation, buyer access
  controls, and payment/fulfillment rules; these can span API and database
  checks.
- Prices are `numeric(10,2)`; the frontend rounds to cents and the trigger
  compares decimals exactly. A stale browser catalog can still produce a
  mismatch with current database prices.
