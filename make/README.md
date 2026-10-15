# Back Office: Make Live setup

Local Sim is the default and needs no account, network, or configuration.
Make Live is an integration path, with the same domain logic executed by the
server. These instructions and the request contracts are supplied; no scenario
has been created or activated in a Make account by this repository.

## Prepare the server

1. Run `schema.sql` for the original demo, then `backoffice.sql` for the additive
   Back Office migration. The new tables and views do not change the original
   security-demo tables. Anonymous clients cannot access the new records.
2. Set the server environment values from `.env.backoffice.example` in Vercel.
   Keep the service-role key, Make API token, presenter token, and automation
   token out of `public/config.js`. The build step exports only the original
   browser-safe Supabase configuration.
3. Deploy the repository through its existing Vercel workflow. The static output
   remains `public/`; the Node handler is `api/backoffice.js` at repository root.
4. Open the cockpit, enter the presenter token, and select **Connect**, then
   **Make Live**. The displayed live session UUID comes from the server's
   `MAKE_DEMO_SESSION_ID`; use the same fixed UUID in S2, S3, and S4. Requests
   for a different session are rejected. This session has its own
   rehearsal data, separate from Local Sim. Tokens stay in the current tab's
   session storage; they never go into URLs or logs.

For a local API preview, export server variables in your terminal, then run
`node scripts/serve-demo.js`. The helper does not load `.env` files implicitly.
Visit `http://127.0.0.1:8080/`. No variables are required for Local Sim.

## Shared HTTP contract

Make HTTP modules POST JSON to `https://YOUR-DEPLOYMENT/api/backoffice` with:

```text
Content-Type: application/json
Authorization: Bearer YOUR_MAKE_AUTOMATION_TOKEN
```

Use a Make connection or private credential field for authorization. Do not
share exports containing a filled token. JSON examples are in `requests.json`.
The automation token can only read execution context, receive a payment event,
run the three scheduled jobs, and retry deliveries. It cannot create orders,
change settings, reset a demo, or switch modes.

## S1: Instant fulfillment

1. Create **Webhooks → Custom webhook** with immediate processing. Store its
   URL in the server's `MAKE_PAYMENT_WEBHOOK_URL`.
2. The gateway sends `demo_id`, `generation`, `type`, `order_id`, and `event_id`.
   Add an HTTP request to the server with those fields plus `action=webhook`.
   Do not generate a new event ID in Make. The server validates the type and
   captured payment, then atomically claims fulfillment and issues one invoice.
3. Keep the receiver work short. The default webhook acknowledgment accepts
   the gateway delivery; fulfillment happens in the following HTTP module.
   A transport acknowledgment is not proof of fulfillment. The log separates
   `delivery` acknowledgment from the verified `webhook` receipt.
4. Activate S1. Re-delivery returns a successful `duplicate_ignored` receipt,
   so it does not create another invoice or trigger an error retry loop.

## S2: Scheduled poll fulfillment

Create an independently scheduled scenario; it has no webhook trigger.

1. HTTP POST `action=context` with the cockpit's fixed `demo_id`.
2. Filter: `mode` must equal `live`. Map the returned `generation` into all
   following requests. Do not hard-code it: reset and mode changes increment it.
3. HTTP POST `action=poll`, with that `demo_id` and `generation`.
4. HTTP POST `action=retry`, with the same values, to service due gateway
   retries. Polling goes first so a paid order this job finds is visibly claimed
   by `poll`. A later webhook is a harmless duplicate.

The server queries paid orders at or after its stored cursor, fulfills them,
advances the cursor in the same atomic update, and logs the run even if empty.
Make owns the schedule, while Supabase owns the cursor and fulfillment claim.
The boundary is inclusive so orders sharing a timestamp cannot be skipped.

## S3: Scheduled reconciliation

Use S2's context request and `mode=live` filter, but call
`action=reconciliation`, then `action=retry`. Keep this a separate scenario with
a slower schedule. It queries all unfulfilled paid orders older than the
cockpit threshold, independently of the polling cursor, and records
`fulfilled_by=reconciliation`. The cursor cannot hide a stranded payment.

For Beat 3, disable **Poller enabled** in the cockpit, leave reconciliation
enabled, and turn webhook delivery off. After capture, wait at least the
displayed paid-age threshold, then run S3. Do not call S2 and expect a
reconciliation attribution: S2 correctly records `poll`.

## S4: Scheduled condition check

Use the same context request and mode filter, then HTTP POST `action=condition`.
No incoming webhook, payment payload, or event ID is used. The server reads the
armed stock condition, issues one simulated reorder alert per arming, and logs
empty or already-handled checks. Re-arm, or change stock/threshold, to start a
new condition episode. This is an alert record only; no email or supplier order
leaves the demonstration.

## Cockpit Run now buttons

S2, S3, and S4 can also be launched by the cockpit through Make's scenario-run
API. Set `MAKE_API_BASE_URL` to your Make zone's `/api/v2` URL, add a private
`MAKE_API_TOKEN` with the scenario read/write/run scopes, and set the three
scenario IDs from `.env.backoffice.example`. Keep these scheduled scenarios
active. The API sends `responsive=false`, so the button reports a requested
run and waits for the real scenario callback in the admin display.

The scenarios use a fixed rehearsal session UUID, so they do not require
scenario inputs or an on-demand-only schedule. Configure all three for the
session shown in the cockpit. If Make API access is unavailable, the buttons
are disabled with an explanation; use **Run once** inside Make. No browser
simulation is substituted for a live Make run.

Intervals displayed in the cockpit govern Local Sim timers. In Make Live they
are rehearsal labels: set the corresponding actual schedules in Make and match
the displayed values. Account scheduling limits depend on the selected plan;
check your account rather than assuming the local 30/60/20-second defaults can
run there. For a manually paced talk, use Run once.

## Retry, mode, and reset semantics

- A failed gateway delivery has durable retry deadlines: at least 1, 2, and 4
  seconds after the preceding failure, with four total attempts. Local Sim
  services them on its clock. Make Live services due retries when S2/S3 runs,
  so real retry spacing is bounded by those schedules as well.
- A delivery lease reduces overlapping sends. Expired leases can redeliver;
  payment-event validation and the atomic order claim make that safe.
- Switching away from Make Live first disables that session's live executor.
  Its generation changes, so in-flight old callbacks cannot fulfill an order.
  Browser timers never execute a live job. Selecting Local Sim requires the
  live server to acknowledge that transition; an offline server cannot be
  silently bypassed.
- Reset clears only the active rehearsal's orders, attempts, logs, cursor, and
  settings, and increments its generation. The cart, other sessions, other
  mode's data, original orders, and catalog remain intact. The active mode
  remains selected. Scheduled Make jobs read fresh context on their next run.
- If a capture response times out, refresh the existing order. Its state and
  event ID are stable, so replaying capture cannot create a second charge event.

## Verification before presenting live

1. Confirm the Supabase migration, server environment, and all four active Make
   scenarios. Verify the fixed session UUID and actual schedules.
2. Run the four beats from `docs/DEMO-SCRIPT.md` in Make Live. Measure capture to
   fulfillment for Beat 1; the under-two-second target is unverified until this
   succeeds against your deployment.
3. Reset, then replay a saved old callback: it must return 409 and create no
   order or invoice. Switch to Local Sim and confirm scheduled live jobs stop.
4. Check API authorization: no token gives 401; an automation token cannot
   reset, switch modes, or change settings. The database service key never
   appears in the generated browser configuration.

## Local verification commands

Run the dependency-free lifecycle and API suite:

```sh
node --test tests/backoffice.test.js
```

An optional isolated PostgreSQL check uses PGlite from the npm registry, outside
the project. It verifies migration syntax, repeated setup, atomic version
claims, SQL views, role restrictions, and preservation of the original records:

```sh
npm install --prefix /tmp/home-server-db-check --no-package-lock --no-audit --no-fund @electric-sql/pglite
node tests/check-backoffice-db.cjs /tmp/home-server-db-check/node_modules/@electric-sql/pglite
```

This validates the SQL in a local PostgreSQL runtime. It does not establish that
the migration has been applied to your actual Supabase project or that deployed
PostgREST role grants match the test fixture.

## Implementation references

- [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
  documents the server handler boundary.
- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
  documents RPC functions and access controls. The supplied RPCs use invoker
  privileges, an empty search path, and grants only to the server role.
- [Make webhooks](https://help.make.com/webhooks) explains instant webhook
  processing and acknowledgments.
- [Make scenario schedules](https://help.make.com/schedule-a-scenario) and
  [Make's scenario API](https://developers.make.com/api-documentation/api-reference/scenarios)
  document schedules, active scenarios, and nonresponsive run requests.
