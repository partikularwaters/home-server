# HomeServer presenter guide

Two demonstrations share the storefront: **Security** teaches browser input versus
server checks; **Back Office** teaches payment notifications and scheduled work.
This guide matches the desktop interface reviewed on **2026-10-16**.
The Back Office instructions incorporate the guided Make Live rehearsal
completed with the presenter on **2026-10-17**.

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

## Back Office: a guided Make Live demonstration

This walkthrough explains each action before moving to the next. Use the
customer checkout and compact Back Office panel together, with Make open in
another tab. The navbar's Back Office link opens the full admin view; the
compact panel is easier for an audience to follow.

Both modes simulate payment. No real card is charged, and no shipment, email,
or supplier order is sent. In this demo, fulfillment means updating the order
record and assigning its invoice.

### Understand the three parts

**HomeServer** is the store, its server API, and the Back Office interface.
Its API validates actions and saves the rehearsal records in **Supabase**.
**Make** runs the connected automation workflows.

**Make Live** is our name for a HomeServer execution mode. It is not a Make
product or module. Selecting it tells HomeServer to use the connected Make
workflows and saved Supabase rehearsal data. **Local Sim** runs the demo model
in the browser with a separate, locally stored dataset.

There are two Make scenarios:

- **S1: Instant fulfillment** receives a payment notification and calls
  HomeServer to handle fulfillment.
- **S2: Scheduled engine** reads the rehearsal context, checks that Make Live
  is active, and then requests polling, reconciliation, a stock condition check,
  and notification retries, in that order.

Make starts the work. HomeServer checks and applies it. The Back Office panel
reads the saved results and displays them.

### Prepare the presentation

If Make Live is already connected and the checkout is ready, begin at step 1.
For initial server and scenario configuration, follow [the Make setup guide](make/README.md).

1. Open the deployed HomeServer site in the presenting browser.
2. In the Back Office panel, open **Settings → Connection settings**, enter
   the presenter token privately, and click **Connect**.
3. Select **Make Live**, and confirm that the panel's mode badge says Make Live.
   Connecting the token and selecting the executor are separate actions.
4. In Make, confirm S1 is active with immediate webhook processing. Have
   **S2: Scheduled engine** ready to run manually.
5. In Orders, set **Webhook On**, **Polling On**, and **Recovery On**.
6. Add an item, open **Cart → Checkout**, and review the sample order.

Keep the same HomeServer tab for the walkthrough. The presenter token is kept
in tab session storage. If you open another tab and it asks for a token,
connect that tab too.

For a fresh rehearsal, **Reset active demo** clears the selected mode's
rehearsal records and restores its controls. It preserves the cart, the other
mode's dataset, and the original security-demo records. Do not reset in the
middle of this walkthrough: keep the earlier orders as evidence. Other pending
orders can affect the totals returned by scheduled checks.

The supplied scenario rehearsal previously ran S2 approximately every 15
minutes. Check its current schedule in Make. For the presentation, use
**Run once in S2** to control the pace. An automatic run may complete work
before your manual click.

The optional **Run scheduled checks** button starts the same entire S2 workflow
when the server's Make API integration is configured. If disabled, use Run once
in Make. The browser's short simulation intervals do not control Make's schedule.

### Step 1: Pay and observe instant fulfillment

**Do**

1. Confirm Webhook, Polling, and Recovery are On.
2. Click **Pay** once.
3. Watch the customer confirmation and the selected order in Back Office.
4. Open S1's latest execution in Make and inspect its two modules.

**Expect**

The activity shows **Payment captured**, followed by **Order fulfilled by
webhook**. The order has **one invoice**. Payment and fulfillment are separate
steps, so the customer may briefly see Payment received before confirmation.

**Understand what happened**

HomeServer creates the order if necessary, authorizes the simulated payment,
and captures it. It then sends a payment-success notification to Make. Payment
has already succeeded; HomeServer is not asking Make to charge the customer.

S1's first module receives that notification. Its second module sends the
order and event details to HomeServer's `/api/backoffice` endpoint with
`action: "webhook"`. HomeServer checks the caller's authorization, the rehearsal,
and the event against the captured order. It loads the saved state from
Supabase and, if fulfillment is still needed, records fulfillment by webhook
and assigns one invoice.

The Back Office panel then reads that updated state. While in Make Live, its
browser JavaScript checks HomeServer approximately once a second when it is
not busy. This display polling is not a Make module, and it does not fulfill
orders. S2's polling can fulfill orders; the browser's polling updates the screen.

**Say**

> “HomeServer captured the payment and notified Make. Make called HomeServer
> back, and HomeServer fulfilled the order and issued one invoice.”

**Hypothetical business example**

A hotel receives notification that a guest has paid. Its automation immediately
asks the booking system to confirm the reservation. In a larger store workflow,
the notification could also start accounting, warehouse, and customer-message
steps. Our demo keeps the workflow small so its effects are visible.

**Pause:** confirm Fulfilled by webhook and one invoice before continuing.
If the order remains pending, inspect whether S1 received the notification and
whether its HTTP module succeeded. Refresh the same order if needed; do not
create a replacement merely to retry a captured payment.

### Understand requests, responses, JSON, and bundles

An **HTTP request** is a message one system initiates to another system's
endpoint. It can announce an event or ask for an action. The **HTTP response**
is the receiving endpoint's reply to that particular request.

Our flow contains two separate exchanges:

```text
Exchange 1
HomeServer → Make webhook: “Payment succeeded; start the configured workflow.”
HomeServer ← Make webhook: acknowledgment of that request.

Inside Make
Module #1 → Module #2: received event data passed as a bundle.

Exchange 2
Make Module #2 → HomeServer API: “Handle this payment event.”
Make Module #2 ← HomeServer API: success or failure, with the result.
```

The data passed between Make modules is not the first HTTP response. A
**bundle** is Make's internal unit of data. Module #2 maps fields from that
bundle into a new outgoing HTTP request.

That request contains a method (`POST`), a destination URL, headers, and a
body. The **JSON body** carries the event data. Headers identify the JSON
format and authorize the caller. “Request body” is the name for this part of
an HTTP request regardless of its format; using JSON does not itself require POST.

For the second exchange, Make is the **HTTP client** because it initiates the
request, and HomeServer's API is the **HTTP server** because it receives it.
A client does not have to be a browser. HomeServer returns its response to
Module #2 even though that is the last module. On success, our API returns
HTTP 200 and the updated rehearsal state; Module #2 parses the response and
finishes. Inspect its execution details to see the result.

These terms are also described in Make's [mapping documentation](https://help.make.com/mapping)
and [HTTP module documentation](https://apps.make.com/http).

### Step 2: Check after the webhook has already done the work

**Do**

1. Leave Polling On and keep the completed order selected.
2. In Make, open **S2: Scheduled engine** and click **Run once**.
3. Return to HomeServer. Read Order activity, or open **Inspect records**.

**Expect**

Polling finds **zero eligible unfinished paid orders** in a rehearsal with no
other pending work. The selected order keeps its existing invoice. A later
reconciliation check may also find zero.

Zero does not mean there are no paid orders in the database. It means no paid
orders qualified for work during that check. Order activity is a summary;
Inspect records contains the full event history. Repeated empty scheduled runs
do not all remain visible in the summary.

S2 first reads context, including mode, generation, and settings. Its live-mode
filter allows the chain to continue. Polling then checks newly paid, unfinished
orders using a moving cursor. Reconciliation checks paid, unfinished orders
old enough to meet the recovery threshold. Stock and retries follow. A failed
HTTP module can stop later steps, so inspect failures in Make.

**Say**

> “The notification got here first. The scheduled check ran and found nothing
> left to fulfill.”

**Hypothetical business example**

The hotel employee checks paid bookings each morning. This booking is already
confirmed, so the employee takes no further action.

**Pause:** verify the zero-result check and the unchanged invoice.

### Step 3: Deliver the same event twice

**Do**

1. Keep the completed order selected and Webhook On.
2. Click **Resend webhook**. The full admin view calls this **Fire last webhook again**.
3. Inspect S1's new execution, then return to Order activity.

**Expect**

Delivery attempts increase, activity reports **Duplicate webhook ignored**,
and the invoice count remains **1** with the same invoice ID.

The resend preserves the payment event ID. HomeServer checks the saved order,
sees that it is already fulfilled, and keeps its existing invoice. Downloading
the invoice twice also gives two copies of the same invoice, not two issuances.

**Say**

> “Delivery happened twice. Fulfillment happened once.”

**Hypothetical business example**

The hotel receives the same payment notification twice. It keeps the existing
confirmed booking rather than creating a second reservation.

**Pause:** verify Duplicate webhook ignored and one unchanged invoice.

### Step 4: Recover a payment whose notification failed

Use a **new order** for this step. The previous order is already fulfilled.

**Prepare**

1. In Orders, set **Webhook Off** and **Polling Off**. Leave **Recovery On**.
2. In Settings, confirm **Paid for at least**. The default threshold is **10 seconds**.
3. Choose **Continue shopping → Cart → Checkout**, and click **Pay** once.
4. Do not manually run S2 yet. First show the unfinished state.

**Expect before recovery**

The customer sees **Payment received**. Back Office shows **Paid · Awaiting
fulfillment**, **zero invoices**, and a failed webhook delivery.

Payment succeeded independently of notification delivery. Wait until the
panel says **Paid-age threshold reached. Reconciliation can recover this order.**
If an automatic S2 run handles it first, use the activity to explain what happened.

**Run recovery**

1. In Make, run S2 once.
2. Return to the new order.
3. Show **poll · paused**, **Reconciliation completed · 1 paid order found**
   when this is the only eligible order, **Fulfilled by reconciliation**, and
   **Invoices issued: 1**.
4. Run S2 again. Reconciliation should find zero remaining eligible orders,
   and the order should retain the same invoice.

Polling is Off because S2 runs it before reconciliation. If enabled, polling
could fulfill the order first and prevent you from demonstrating recovery's claim.
Running reconciliation before the age threshold correctly finds zero.

**Say**

> “The payment succeeded, but its notification failed. Our recovery check
> found the unfinished order and issued one invoice. Repeating the check
> does not repeat fulfillment.”

**Hypothetical business example**

The guest paid, but the hotel's notification did not arrive. An employee
checks payment records, finds the unconfirmed paid booking, and confirms it.
The next check finds that the booking has already been handled.

**Pause:** verify reconciliation fulfillment and one invoice before continuing.

### What the switches and delivery records mean

The switches belong to HomeServer. They do not deactivate S1 or S2 in Make.

- **Webhook Off:** HomeServer skips the outgoing HTTP POST to Make. The demo
  still records simulated failed delivery attempts and schedules retries.
- **Polling Off:** S2's polling request still reaches HomeServer, but HomeServer
  skips the scan and records that the poller is paused.
- **Recovery Off:** S2's reconciliation request still arrives, but HomeServer
  skips recovery and records the paused check.

**Delivery** means delivering the payment notification to Make. It does not
mean shipping the item, fulfilling the order, or issuing an invoice.

Capture queues a delivery job and attempts it immediately. A failed attempt
schedules another attempt. In Make Live, S2's final Retry step services due
deliveries. The panel totals attempts across the selected order's delivery jobs;
Resend webhook creates another job for the same payment event.

Each job has a maximum of **four attempts: the first attempt plus three retries**.
Minimum gaps are 1, 2, and 4 seconds, but Make Live waits for actual S2 runs to
service them. Do not describe those minimum gaps as guaranteed live retry times.

A delivery acknowledgment means Make accepted the notification; fulfillment
also requires S1's callback to succeed. Conversely, reconciliation may fulfill
an order before a failed notification is retried. A later delivery failure
does not reverse that fulfillment or remove its invoice.

The record **“Retry limit reached; polling remains the safety net.”** means
that this delivery job has exhausted its automatic attempts. Its wording does
not guarantee Polling is On. Enabled polling or recovery checks can still
handle an unfinished paid order. If recovery already fulfilled the order,
the delivery retry limit does not undo that success.

### Step 5: Check stock without a payment event

Keep the order switches as they are. No new checkout is needed.

**Prepare**

1. Select **Inventory** in the compact Back Office panel.
2. Set **Scheduled check On** and **Reorder alert On**. The alert should read **Armed**.
3. In Settings, set **Stock = 3** and **Stock threshold = 5**, then close Settings.
4. Show **Waiting for scheduled check** and **Alerts this condition: 0**.

An earlier “No armed condition met” activity entry describes an earlier run;
it does not override the current settings. In the full admin view, these
controls are under **Clock, no event**.

**Run the check**

1. In Make, run S2 once.
2. Return to Inventory. Show **Reorder alert issued** and **Alerts this condition: 1**.
3. Run S2 again without changing any settings.
4. Show **Condition already handled; no second alert.** The count remains **1**.

S2 asks HomeServer to evaluate inventory. Stock is below the threshold, the
check is enabled, and the alert is armed, so HomeServer saves one internal
alert. It remembers that this condition has been handled and avoids another
alert on subsequent runs. To demonstrate a new episode, turn Reorder alert
Off, then On to re-arm it. No supplier order or email is sent.

**Say**

> “The scheduled check found low stock without a payment event. We keep
> checking, but we do not repeatedly alert about the same situation.”

**Hypothetical business example**

A café checks its milk supply each morning. With three cartons remaining and
a minimum of five, it flags that restocking is needed. Another check finds the
same shortage but does not create a second alert for the same episode.

### Close the demonstration

You have shown four behaviors using two Make scenarios: fast webhook
fulfillment, duplicate protection, recovery after failed notification delivery,
and a scheduled business condition. The extra S2 run after successful webhook
fulfillment shows that the scheduled check can correctly find no work.

**Say**

> “Notifications let us act quickly. Scheduled checks find unfinished work
> and conditions that need attention. Duplicate protection keeps repeated
> deliveries and checks from repeating the result.”

Leave the records in place as rehearsal evidence. Before a future presentation,
reset the selected rehearsal only if you want a clean start, check the retained
cart quantity, and restore the switches needed for step 1.

### Recover during rehearsal

- **Wrong flow:** use Cart → Checkout for this demo. Security in the navbar
  opens the separate browser-security exercise.
- **Paid but pending:** confirm the selected order, Make Live mode, S1's
  execution, and the switch settings. Recovery requires the paid-age threshold.
- **Zero-result check:** the order may be too young, already fulfilled, or
  outside polling's current window. Read its status and activity first.
- **Unexpected scheduled totals:** poll and reconciliation counts cover the
  active rehearsal, not only the selected order.
- **No inventory alert:** confirm Scheduled check On, Reorder alert Armed,
  and stock strictly below the threshold. Re-arm a previously handled episode.
- **Run scheduled checks disabled:** use Run once in S2. Optional panel-triggered
  runs require separate Make API configuration and account access.
- **No later S2 steps:** inspect the earliest failed module in Make; an HTTP
  error can stop subsequent steps.

For Local Sim rehearsal, run `node scripts/serve-demo.js`, open
<http://127.0.0.1:8080/>, and select Local Sim. Individual Run poller,
Run reconciliation, and Run stock check controls replace manual S2 runs.
Local browser timers use the configured intervals; they do not run Make.

## Verification boundary

During the guided rehearsal on 2026-10-17, the presenter confirmed webhook
fulfillment, later zero-result checks, reconciliation fulfillment after a
failed notification, an unchanged invoice on repeated recovery, and one stock
alert across repeated condition checks. The supplied Order activity screenshot
also showed a duplicate webhook ignored with the existing invoice unchanged.
These observations apply to that rehearsal, not to every future deployment.

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
