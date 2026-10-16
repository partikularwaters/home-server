# Make Live: two scenarios, four demo beats

HomeServer uses **two Make scenarios**:

1. **S1: Instant fulfillment** receives payment events immediately.
2. **S2: Scheduled engine** runs polling, reconciliation, stock checks, and retries.

The four presentation beats are Speed, Twice, Never, and Condition. They are
four tests of these two workflows, not four separate scenarios. This matches
the supplied exports and the account's two-active-scenario limit.

## 1. Understand the responsibilities

A Make **scenario** is a workflow. Its **modules** perform steps such as receiving
a webhook or making an HTTP request. **Mapping** passes one module's output to
the next, and a **filter** decides whether the following module may run.

In this demo, Make starts work; HomeServer's server validates and applies it;
Supabase stores the rehearsal state. Make does not independently generate
invoices. All fulfillment paths use the same server rule, so a repeated event
cannot assign a second invoice to the same order.

See [Make's webhook guide](https://help.make.com/webhooks) and
[scheduling guide](https://help.make.com/schedule-a-scenario).

## 2. Read or import the sanitized exports

- [S1 blueprint](<S1- Instant fulfillment.blueprint.json>): webhook → HTTP callback.
- [S2 blueprint](<S2- Scheduled engine.blueprint.json>): context → live-mode filter
  → poll → reconciliation → condition → retry.
- [Request examples](requests.json): module bodies for reference, not an importable blueprint.

The blueprints are readable JSON exported from the actual two workflows and
sanitized for sharing. Authorization values, deployment URLs, and the fixed
rehearsal session are placeholders. S1's account-specific webhook reference
is set to `0`; select or create your own webhook after importing.

**Importing is optional for the existing account.** Its scenarios already
worked in the production rehearsal. Inspect those rather than creating extra
copies, which would confuse the active-scenario limit.

For a new account or deployment, import each blueprint in Make's scenario editor,
then configure these fields before activating it:

- Every HTTP module URL: `https://YOUR-DEPLOYMENT/api/backoffice`.
- Every HTTP Authorization header: `Bearer YOUR_MAKE_AUTOMATION_TOKEN`, supplied
  privately with the same automation token configured on the server.
- Every S2 body: replace `YOUR_COCKPIT_SESSION_UUID` with the fixed rehearsal UUID.
- S1: choose a Custom webhook and put its generated URL in the server's
  `MAKE_PAYMENT_WEBHOOK_URL`.

Keep the mapped expressions intact. JSON bodies containing unquoted numeric
mappings, such as `{{1.data.generation}}`, are Make templates; they become valid
request JSON when Make inserts the numeric result. Do not quote the generation.

The exported metadata identifies the EU1 zone. Reconnect the imported modules
in the destination account. An export is not proof of the scenario's active
status, current schedule, subscription entitlement, or successful execution.

## 3. Prepare the HomeServer server

1. Install the original `schema.sql` and additive `backoffice.sql` migration.
   The latter does not alter the original security-demo tables.
2. Configure the required server values from
   [the environment template](../.env.backoffice.example). Keep server keys,
   automation tokens, and Make API tokens out of `public/` and Git.
3. Use one fixed `MAKE_DEMO_SESSION_ID` in the server and every S2 module.
   The production readiness endpoint supplies this UUID to the panel.
4. Deploy through the existing Vercel workflow. The static root is `public/`;
   the server boundary is `api/backoffice.js`.
5. In HomeServer, open Settings → Connection settings, enter the presenter
   token privately, click Connect, and select Make Live.

The **presenter token** authorizes the browser's rehearsal controls. The
**automation token** authorizes callbacks from Make. They have different roles:
Make can read context, process a payment notification, run checks, and service
retries; it cannot create orders, reset the rehearsal, or switch execution modes.
Tokens stay out of URLs. The browser retains its presenter connection in tab
session storage.

For a local server/API preview, export the required server variables and run
`node scripts/serve-demo.js`. The helper does not automatically read `.env` files.
Local Sim needs none of those server values.

## 4. Trace S1: Instant fulfillment

S1 has two modules:

1. **Custom webhook** receives `demo_id`, `generation`, `type`, `order_id`, and
   `event_id` after the mock gateway captures payment.
2. **HTTP request** posts the mapped fields to HomeServer with `action=webhook`.

S1 uses immediate webhook processing. Verify this in Make rather than assigning
it S2's recurring schedule. HomeServer validates the event and captured order,
then claims fulfillment and assigns its one invoice.

A webhook acknowledgment means the notification reached Make. Fulfillment
requires the HTTP callback to complete as well. The event log distinguishes
transport delivery from the verified webhook receipt.

For Twice, resend the same event. Preserve the incoming event ID; do not generate
a new one in Make. The callback records `duplicate_ignored` for an already
fulfilled order while leaving the invoice unchanged.

## 5. Trace S2: Scheduled engine

S2 uses five HTTP modules in this exact order:

1. **Context:** POST `action=context` and the fixed `demo_id`. The response includes
   the current execution mode, generation, and settings.
2. **Polling:** the connection from context to this module has the filter
   `{{1.data.mode}} = live`. POST `action=poll`, the fixed session, and
   `generation={{1.data.generation}}` as a number. The server scans newly paid
   orders using its cursor; Polling Off records a paused check.
3. **Reconciliation:** POST `action=reconciliation` with the same session and
   mapped generation. The server finds paid, unfinished orders at least as old
   as the configured threshold. Recovery Off records a paused check.
4. **Condition:** POST `action=condition` with the same session and generation.
   With Scheduled check On and Reorder alert armed, stock below the threshold
   produces one internal alert for the episode. Repeated checks do not alert again.
5. **Retry:** POST `action=retry` with the same session and generation to service
   due notification deliveries.

All HTTP modules parse their response and stop on HTTP errors. A failed module
can therefore prevent later modules from running: inspect the failed execution
in Make before assuming the subsequent checks completed.

The live-mode filter stops the scheduled chain when the server is not in Make
Live. Reading generation from context prevents stale callbacks after a reset
or mode switch. Never hard-code that number.

The sequence affects attribution. Polling gets the first opportunity to fulfill
an eligible order. For the recovery beat, turn Polling Off and leave Recovery
On before paying. Reconciliation can then take the claim. Retries happen last,
so a later delivered webhook is a harmless duplicate of an already fulfilled order.

## 6. Set a presentation pace that the account supports

The supplied account permits two active scenarios. Its live S2 execution history
shows approximately **15 minutes between scheduled runs**. Make publishes two
active scenarios and a 15-minute minimum scheduled interval for its Free plan;
check current account entitlements before changing a schedule.
[Make pricing](https://www.make.com/en/pricing).

For a presentation, use **Run once in S2: Scheduled engine** after explaining each
beat. One click runs all enabled checks in sequence. You do not need separate
S3 or S4 scenarios, and you should not wait 15 minutes on stage.

The panel hides the short interval inputs in Make Live because they control
Local Sim only. The actual live schedule is configured in Make. The panel's
15-minute note describes the verified rehearsal; it does not read the current
schedule from Make.

## 7. Optional: trigger S2 from the Back Office panel

Make Live shows one **Run scheduled checks** button in Orders and Inventory.
It launches the entire S2 workflow, not only the currently visible view's check.
The switches still control which steps can act.

The button requires both account access to Make's API and these server values:

```text
MAKE_API_BASE_URL=https://eu1.make.com/api/v2
MAKE_API_TOKEN=your-private-make-api-token
MAKE_SCHEDULED_SCENARIO_ID=the-numeric-id-of-S2
```

Use the actual zone and active S2 ID. Check your plan's API entitlement before
creating a token. Follow [Make's token documentation](https://developers.make.com/api-documentation/authentication/create-authentication-token)
and [scenario-run API documentation](https://developers.make.com/api-documentation/api-reference/scenarios)
for required permissions. The presenter and automation tokens are not Make API tokens.

The server calls `/scenarios/{id}/run` with `responsive=false`. A requested run
is not yet a completed check: wait for the real S2 callbacks and inspect activity.
Without these values, the button stays disabled and a visible instruction points
to Run once in Make. Normal webhook processing, scheduled execution, and Run once
continue to work without the optional API setup.

Older `MAKE_POLL_SCENARIO_ID`, `MAKE_RECONCILIATION_SCENARIO_ID`, and
`MAKE_CONDITION_SCENARIO_ID` settings are no longer used. Do not map three buttons
to one workflow while pretending they start different jobs.

## 8. Rehearse the four beats with two scenarios

1. **Speed:** Webhook, Polling, and Recovery On. Pay once; S1 fulfills the order.
   Run S2 once; polling finds zero eligible paid orders in a clean rehearsal.
2. **Twice:** Resend webhook on that order. S1 receives the same event; delivery
   attempts increase, but the invoice remains unchanged.
3. **Never:** Webhook Off, Polling Off, Recovery On. Pay for a new order, wait
   at least the paid-age threshold, and run S2 once. Show reconciliation
   fulfillment and the same customer confirmation updating.
4. **Condition:** Inventory → Scheduled check On → Reorder alert On; stock 3
   below threshold 5. Run S2 once. Show one alert. Run S2 again and show no
   second alert for that episode.

Local Sim offers individual Run poller, Run reconciliation, and Run stock check
controls for convenient rehearsal. In Make Live, all three operations belong
to S2. Use [the presenter guide](../DEMO-GUIDE.md) for customer-side steps.

## Retry, reset, and acceptance boundaries

Delivery failures make at most four attempts, with minimum gaps of 1, 2, and
4 seconds. Local Sim services deadlines in the browser; live retries are serviced
at the end of S2, so the real schedule or Run once determines when they happen.
A delivery lease reduces competing sends; an expired lease can redeliver safely.

Changing execution mode or resetting changes the rehearsal generation. Switching
out of Make Live requires a server acknowledgment. Reset clears only the active
rehearsal; it preserves the cart, the other mode's dataset, and original security
tables. Do not reset production data merely to demonstrate the revised instructions.

Both modes simulate payment. No real card, email, supplier order, or shipment is
processed. Blueprint import, local tests, and the public readiness flag do not
prove a new account's complete live setup. Verify the actual four beats there.

```sh
node --test tests/backoffice.test.js tests/backoffice-view.test.js tests/make-blueprints.test.js
```

Production rehearsal on 2026-10-16 confirmed fresh webhook fulfillment, duplicate
handling, reconciliation, and a once-per-condition stock alert using the two
existing scenarios. Optional panel-to-Make API runs were not configured in that
rehearsal. The API path is covered locally with a fake provider; it still needs
account-level acceptance if enabled.
