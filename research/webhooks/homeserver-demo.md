# What HomeServer's Back Office demonstrates

Code reviewed on **2026-10-16**:
[domain model](../../public/demo-core.js), [browser adapter](../../public/backoffice.js),
[evidence projection](../../public/backoffice-view.js), [API](../../api/backoffice.js),
[database migration](../../backoffice.sql), and [Make contracts](../../make/README.md).

## Flow and identity

The browser cart contains catalog IDs and quantities. The model computes prices
from its fixed catalog. One Pay action creates an order with a stable retry ID,
authorizes, captures, and queues a `payment.succeeded` notification. This event
name belongs to the mock gateway; it is not a claim to implement Stripe's event API.
The same checkout retry ID refers to the same intended creation. A new checkout
can deliberately buy identical items as a new order.

State progresses from created to paid to fulfilled. Authorization is recorded
separately; capture establishes paid state. Webhook, poll, and reconciliation
all call the same fulfillment rule, which only changes an order currently paid.
The invoice is a deterministic field on that order. This model has no real
fund transfer, email, stock shipment, or external invoice issuance.

## Local and live execution

Local Sim serializes updates with Web Locks and persists the rehearsal in browser
storage. Browser timers advance retries and schedules while a demo page is open.
Background throttling and closing pages affect timing.

Make Live calls a server route that checks caller role, active rehearsal session,
and generation. The server uses versioned state updates with compare-and-swap
retries in Supabase. Make uses two scenarios: S1 receives payment notifications, and S2 runs the
ordered context → live-mode filter → poll → reconciliation → condition → retry
chain. A paused poll does not prevent the later recovery step from acting.
An HTTP error can stop the chain before later modules execute.
Tokens and server configuration are not part of the static browser build.
Switching mode and resetting changes the generation to reject stale callbacks.
The full live setup is in the [Make guide](../../make/README.md).

Both modes share the mock payment model. Live means external workflow execution
and persistence, not real card processing. The migration and tests do not
establish that an arbitrary deployment has configured its scenarios correctly.

## Four beats and their evidence

1. **Speed:** webhook claims fulfillment first; a subsequent poll in the clean
   rehearsal finds zero eligible paid orders.
2. **Twice:** the same webhook event reaches an already fulfilled order; the
   event is ignored for fulfillment, and the invoice remains unchanged.
3. **Never:** delivery and polling are disabled. The payment remains paid until
   reconciliation finds it old enough to claim.
4. **Condition:** an armed stock rule issues one internal alert per episode.

The retry model makes four attempts, with 1-, 2-, and 4-second gaps after failures.
The regular poll uses an inclusive timestamp boundary and advances its cursor.
Reconciliation separately scans paid orders beyond its age threshold. Default
intervals are 30 seconds, 60 seconds, and 20 seconds for poll, reconciliation,
and stock checks; the paid-age threshold is 10 seconds. These are presentation
settings, not production recommendations.

## Reading the interface honestly

Order metrics are selected-order evidence. Scheduler result counts cover the
active rehearsal. The bounded activity view preserves important payment and
fulfillment entries; Inspect records exposes the fuller history. A zero-result
run alone does not prove why no work was eligible.

Invoices issued is derived from whether the selected order has an invoice field.
It is not an audit of an external invoicing service. Local payment/fulfillment
can share a timestamp. This does not establish network delivery latency.

## Checks and remaining limits

The 23 automated checks cover domain paths, retries, stale generations, cursor
boundaries, competing claims, the live API with a fake provider, and evidence
projection. Run them with:

```sh
node --test tests/backoffice.test.js tests/backoffice-view.test.js tests/make-blueprints.test.js
```

The four beats were also exercised in the local browser during UI work on
2026-10-16. A separate production rehearsal on that date verified webhook fulfillment,
duplicate handling, reconciliation, and once-per-condition alerts through the
existing two Make scenarios. It did not enable or validate the optional Make
API launch from the panel. The scheduled engine ran roughly every 15 minutes.
No general exactly-once transport guarantee follows from these checks.
Real integrations also need authenticated provider messages, durable processing,
provider-specific histories, and safe external side effects. HomeServer does
not implement a production payment provider's signature verification or full
refund, dispute, delayed-payment, or out-of-order lifecycle.


## Two scenarios in the presentation interface

Local Sim retains individual check buttons and short browser intervals. Make
Live shows one Run scheduled checks action, which starts all enabled work in
S2 when the optional API connection is configured. Otherwise, a visible note
points to Run once inside S2 in Make. Short local intervals are hidden in live
mode. The 15-minute live note describes the verified account, not a schedule
read dynamically from Make.

The sanitized [S1](<../../make/S1- Instant fulfillment.blueprint.json>) and
[S2](<../../make/S2- Scheduled engine.blueprint.json>) exports preserve modules
and mapping expressions but require private credentials, a deployment URL,
a session UUID, and a reconnected webhook when imported. They do not create
four independent scenarios or configure an account automatically.
