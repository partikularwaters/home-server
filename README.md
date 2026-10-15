# HomeServer — Back Office and "Hidden Is Not Protected"

A tiny demo store for two classroom demonstrations: webhooks versus polling,
and browser input versus server-side checks. No real payments, invoices sent
to customers, or goods shipped.

## Back Office: webhooks versus polling

The storefront's **Checkout** opens a mock gateway with separate authorization
and capture, then a conventional order confirmation. The presenter cockpit
below the store shows the order lifecycle, one invoice per order, which path
fulfilled it, and every delivery attempt and scheduled run. **Security demo**
still opens the original Hidden/Protected checkout.

Run `node scripts/serve-demo.js` and open `http://127.0.0.1:8080/`. Local Sim is
the default; it needs no credentials or external service. The storefront uses
the fixed rehearsal catalog in `public/demo-core.js`. The original security
checkout continues to use Supabase's product catalog and price trigger.

Four beats:

1. Capture payment: the webhook fulfills immediately; the next poll finds zero.
2. Fire the webhook again: `duplicate_ignored`, with the same invoice.
3. Pause the regular poller and disable webhook delivery. Capture another
   payment, wait for the paid-age threshold, then run reconciliation. The order
   moves from `paid` to `fulfilled_by=reconciliation`.
4. Arm the stock condition, then run its clock check. One simulated reorder
   alert appears without a payment webhook.

Local schedules run only while a demo page is open. Defaults: poll every 30
seconds, reconciliation every 60 seconds for payments at least 10 seconds old,
and condition checks every 20 seconds. The cockpit exposes these values, job
toggles, manual runs, mode selection, and reset. Local Sim and Make Live have
separate rehearsal data. Reset clears only the active rehearsal, preserving
the cart and original security-demo tables.

**Make Live setup:** see [the four scenario contracts and setup guide](make/README.md),
[`backoffice.sql`](backoffice.sql), and [server-only environment template](.env.backoffice.example).
Live services must be configured and rehearsed before presenting. The code and
request templates do not create Make scenarios or apply the migration for you.
The cockpit does not enable Make Live until its server configuration is present.
Make API configuration is additionally required for cockpit Run now buttons;
otherwise use Run once in Make. Live schedules execute in Make, while the
browser only reads their results.

Verification: `node --test tests/backoffice.test.js`. This tests shared behavior
and the live API against a simulated provider; it does not certify deployed
Supabase permissions, Make scenarios, or live delivery latency.

## Original security demonstration

The browser runs on the user's device, so page-only checks cannot enforce the
store's price or access rules.

Existing deployment: `https://homeserverstore.vercel.app/`. Back Office changes
appear there after deployment; `checkout.html` remains the security exercise.

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

The full runbook is internal presenter preparation. The short version:

1. Add an RTX 4090 to the cart, open **Security demo**. Toggle is on **Hidden**.
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
checkout sum  ←── products table (read-only, real prices)
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

- The original security-demo access policies are **deliberately permissive** (open insert/select)
  so a classroom can run this without auth. This is a teaching demo, not a
  production pattern.
- The trigger is server-side SQL with a narrow teaching purpose. A
  production design also needs item/quantity validation, buyer access
  controls, and payment/fulfillment rules; these can span API and database
  checks.
- Prices are `numeric(10,2)`; the frontend rounds to cents and the trigger
  compares decimals exactly. A stale browser catalog can still produce a
  mismatch with current database prices.
