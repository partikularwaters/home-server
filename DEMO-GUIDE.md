# HomeServer presenter guide

Two demonstrations share the storefront: **Security** teaches browser input versus
server checks; **Back Office** teaches payment notifications and scheduled work.
This guide matches the desktop interface reviewed on **2026-10-16**.

For the Back Office talk, use the [public research](research/webhooks/README.md),
[browser slides](public/webhooks-slides.html), and [slide-by-slide speaking notes](research/webhooks/presenter-notes.md).
The original [security research](research/README.md) and [security slides](public/slides.html)
remain separate.

## Start here

From the repository root:

```sh
node scripts/serve-demo.js
```

Open <http://127.0.0.1:8080/>. Present in a full-screen desktop browser, ideally
1920 × 1080. The layout also adapts to smaller desktop windows. The sun/moon
icon changes the theme and remembers your choice in this browser.

The navbar contains Store, Security, and Back Office. In Store, **Cart** is
beside the product heading; **Checkout** is inside the cart summary. Checkout's
**Edit cart** returns to that cart. Confirmation's **Continue shopping** starts
the next shopping flow with the cart retained.

The navbar's Back Office link opens the full admin view. For the audience,
use the smaller Back Office panel beside the store and checkout.

## Security: what changed

The layout, theme, navigation, button accessibility, and placement of controls
changed. Server View now stays visible beside checkout. The order submission,
hidden total, table selection, and database price check were not changed by
this UI revision.

Security uses the Supabase catalog and these original tables:

- **Hidden** → `orders_vuln`: accepts the browser's claimed total without the
  protected table's catalog-total trigger.
- **Protected** → `orders`: the supplied database trigger rejects a price mismatch.

This is a specific price-validation lesson. It does not demonstrate a complete
production checkout or buyer isolation. See the [security implementation analysis](research/homeserver-demo.md).
The Security page's “Charged” wording records a demo order, not a card charge.

### Security rehearsal: honest order, tampered order, rejected order

1. Add one RTX 4090 in Store. Choose **Security in the navbar**, rather than
   Checkout in the cart. Confirm the item and total; the seeded price is $1,599.00.
2. Enter a sample name and email. Select **Hidden**, and press **Place order**.
   Point to the new row in Server View.
3. Open DevTools → Elements. Find `<input type="hidden" id="order_total">`,
   and edit its value from `1599.00` to `1.00`.
4. Submit again. The vulnerable table stores the claimed dollar. Server View
   identifies the mismatch against its loaded catalog.
5. Select **Protected**. The form and altered hidden value remain in place.
   Submit again: expect a server rejection and no new insertion for that attempt.

Say: “The browser sent the same altered price. The database made a different
choice because it checked the store's prices.”

Security requires the configured Supabase project and installed schema. A
network failure is not proof that the price rule rejected a request. The
Back Office reset does not clear these security tables.

## Make Live: two scenarios, four beats

S1: Instant fulfillment is the webhook receiver and callback. S2: Scheduled
engine performs context → live-mode filter → polling → reconciliation → stock
condition → delivery retries. The four demo beats below are behaviors, not
four separate Make scenarios.

In Make Live, **Run scheduled checks** starts all of S2. If that optional API
integration is unavailable, use **Run once in S2: Scheduled engine** in Make.
The current account's actual schedule runs roughly every 15 minutes. The
30/60/20-second browser intervals are for Local Sim and are hidden in Make Live.
See the [step-by-step Make guide and sanitized exports](make/README.md).

For each beat below, individual Run poller, Run reconciliation, and Run stock
check buttons refer to **Local Sim**. In **Make Live**, run S2 instead. Its
switches determine which checks can act; one execution can add several log entries.

## Back Office: prepare once

1. Open **Settings** in the side panel, select **Local Sim**, and press
   **Reset active demo**. Reset preserves the cart, so check its quantity separately.
2. Keep the defaults: polling every **30 seconds**, reconciliation every
   **60 seconds**, paid-age threshold **10 seconds**, and stock checks every
   **20 seconds**. Close Settings.
3. In **Orders**, confirm **Webhook On**, **Polling On**, and **Recovery On**.
4. Add one GPU. Open Cart → Checkout. Review the saved sample contact/delivery
   details and masked card. **Edit details** changes the local sample details.

Local Sim runs in this browser while a demo page is open. Keep the presentation
tab active for predictable timing. **Pay** creates a demo order, then authorizes
and captures automatically. No real card is submitted. Contact/delivery edits
stay in tab storage and are not sent to the payment API.

### Read the evidence

On the left, follow the customer's receipt. On the right, follow the selected
order's payment, fulfillment source, delivery attempts, invoice count, and activity.
The order dropdown can inspect an earlier order. A new checkout shows **Next order**.

- **Webhook** controls notification delivery; Off does not prevent payment.
- **Polling** checks newly paid orders using a moving cursor.
- **Recovery** runs reconciliation for paid, unfulfilled orders old enough to qualify.
- **Inspect records** opens the complete order/event tables if someone asks for detail.

Local manual run buttons respect their corresponding On/Off switches. In live
S2, polling is evaluated before reconciliation, then stock and retries follow. Poll and
reconciliation results count eligible orders across the active rehearsal,
not only the selected order. Other unfulfilled orders can therefore change the
result. Start with a reset when you want the clean four-beat story below.

## Beat 1: Speed

**Do:** Leave all three switches On. Press **Pay** once. After confirmation,
press **Run poller** in Local Sim, or run **S2** in Make Live.

**Show:** Fulfilled by webhook; one invoice; the later poll finds zero eligible
paid orders in this clean rehearsal.

**Say:** “The notification got here first. The scheduled check ran and found
nothing left to fulfill.”

Local capture and fulfillment can share a timestamp. Do not turn that simulated
result into a claim about real network latency.

## Beat 2: Twice

**Do:** On that completed order, press **Resend webhook**.

**Show:** Delivery attempts increase; activity reports Duplicate webhook ignored;
Invoices issued remains **1**, and the invoice ID stays unchanged.

**Say:** “Delivery happened twice. Fulfillment happened once.”

A second invoice download is another copy of the same invoice, not another issuance.

## Beat 3: Never

**Do:** Turn **Webhook Off** and **Polling Off**. Leave **Recovery On**.
Choose Continue shopping → Cart → Checkout, and pay for another order.

**Show first:** Payment received, awaiting fulfillment, and zero invoices.
Failed deliveries retry after approximately 1, 2, and 4 seconds, with four
attempts in total. Browser scheduling can delay these attempts.

**Then:** Wait until the new payment is at least **10 seconds old**, and press
**Run reconciliation** in Local Sim, or run **S2** in Make Live. You can also
wait for the actual schedule. The same customer confirmation
updates, the fulfillment source becomes reconciliation, and one invoice appears.
A scheduled recovery run may already have handled it before your manual click.

**Say:** “The payment succeeded, but the notification did not reach fulfillment.
The recovery check found the unfinished paid order.”

Polling is Off to keep this recovery beat distinct. Running reconciliation
before the age threshold correctly finds zero. Repeated eligible runs must not
create another invoice.

## Beat 4: A condition without a payment event

**Do:** Switch to **Inventory**. Keep **Scheduled check On**, and turn
**Reorder alert On**. In Settings, confirm stock **3** and threshold **5**.
Press **Run stock check** in Local Sim, or run **S2** in Make Live. Observe
the scheduled result instead if it fired first.

**Show:** Stock is below the threshold, and the alert count is **1**. Run the
check again: the same condition produces no second alert. Turn Reorder alert
Off, then On to arm another episode.

**Say:** “Nothing pushed a payment notification for this. The clock checked
stock and found a condition that needed attention.”

This creates an internal alert record. It sends no email, supplier order, or shipment.

## Local Sim versus Make Live

Local Sim executes the shared model in the browser and stores rehearsal state
locally. Make Live uses the API, isolated Supabase rehearsal data, and Make
scenarios. Both simulate payment; neither is a Stripe integration.

Follow [Make setup and acceptance checks](make/README.md) before using Make Live.
It requires server configuration, a presenter connection, matching session and
generation, and the two configured scenarios. The panel's scheduled-engine run
needs Make API access and `MAKE_SCHEDULED_SCENARIO_ID`; otherwise use Run once
in S2 from Make. Live retry timing depends
on the actual schedules. Local tests do not establish live wiring or latency.

## Recover during rehearsal

- **Wrong flow:** Security is the navbar link; payment checkout is inside Cart.
- **Empty or wrong cart:** cart storage is browser-specific and survives reset.
  Return to Store, adjust the items, and open Checkout again.
- **Paid but pending:** check the three switches and selected order. Recovery
  needs the age threshold; the manual button also needs Recovery On.
- **Zero-result run:** the order may be too young or already fulfilled. Read
  fulfillment source and activity before repeating the action.
- **No inventory alert:** Scheduled check and Reorder alert must be On, and
  stock must be strictly below the threshold. Re-arm after a handled condition.
- **Make Live unavailable:** use Local Sim for rehearsal and check the Make guide.
- **Security rejects an honest price:** check its catalog/configuration and
  installed trigger. Its backend is separate from Local Sim.

Before another talk, reset the active Back Office rehearsal, check cart quantity,
and rehearse all four beats. That reset preserves the other mode's dataset and
the original security tables.

## Verification boundary

```sh
node --test tests/backoffice.test.js tests/backoffice-view.test.js tests/make-blueprints.test.js
```

The current suite has 23 checks for lifecycle behavior, evidence projections,
and the API with a fake provider. This is separate from a deployed Make/Supabase
acceptance run. The browser walkthrough was exercised locally on 2026-10-16;
rehearse again in the actual presentation browser.


Production rehearsal on 2026-10-16 verified S1 fulfillment and duplicate handling,
S2 reconciliation after a missed notification, and one stock alert across repeated
S2 runs. The approximately 15-minute live schedule differs from local timing.
The optional panel API trigger still requires account-level configuration and
acceptance; readiness is configuration detection, not an entitlement check.
