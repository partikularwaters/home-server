# Back Office speaking notes

Use with the [eight-slide browser deck](../../public/webhooks-slides.html).
Allow about **12–15 minutes**, including a **5–7 minute** four-beat demo and
brief transitions. This assumes Local Sim or manually paced S2 runs in Make.
Waiting for the live 15-minute schedule would exceed that estimate.

Use arrows, Space, Previous/Next, or slide dots to navigate. Home/End selects
the first/last slide; F requests fullscreen. `#slide-7` opens the demo handoff.
The in-app preview may decline the fullscreen request; use your browser’s
normal fullscreen control for presentation. The slide diagrams are static teaching illustrations; only the HomeServer
page runs the demo. Theme choice is shared with the application.

## 1. The customer paid. Did the business finish? — 45 seconds

**Purpose:** Separate the fact of payment, delivery of a notification, and the
business action. Point along the three stages rather than reading every label.

**Say:** “The customer sees payment succeed. Our business still has to learn
about it and finish the order. What happens if the message between those
steps repeats or never arrives?”

**Transition:** “There are two ways to discover work.”

## 2. Send a notification, or check on a schedule — 60 seconds

**Purpose:** Explain push and scheduled queries in plain language.

**Say:** “A webhook is like a doorbell: an event sends us a message. A poll is
like a checklist: on a schedule, we ask what changed. With a 30-second check,
a payment just after the check waits for the next run.”

The 30-second example describes Local Sim. The verified live Make account
runs its combined scheduled engine roughly every 15 minutes. For presentation,
use Run once in S2, or the optional panel action if configured.

The timing example assumes successful checks. Do not describe it as a
measured provider response time. Neither method alone guarantees completion.

## 3. Repeat the message. Keep the business effect once. — 60 seconds

**Purpose:** Explain idempotency through visible business evidence.

**Say:** “If a response is lost, the sender may try again even if we already
acted. We need to recognize the same operation and preserve its completed
result. In our demo, two deliveries still leave one invoice.”

A new checkout with the same GPU is an intended new purchase. It must not be
mistaken for a retry of the old order. The demo invoice is a field on the
order, not an external billing service.

## 4. Payment can succeed while notification fails — 60 seconds

**Purpose:** Introduce recovery as a separate question: what remains unfinished?

**Say:** “A failed message does not undo the payment. Recovery looks for paid
orders that still need work. In this demo we wait until a payment is old
enough, then check it again.”

HomeServer's 10-second threshold is chosen for presentation. Production
thresholds depend on the workflow and the provider's actual data access.

## 5. Check the provider's delivery contract — 60 seconds

**Purpose:** Ground the concepts in three published operational contracts.

**Say:** “These services do not all retry the same way. Read the provider's
contract, then decide how your receiver handles repeats and missed work.”

The slide links primary documentation. These are documented examples, not
three outage case studies. Refer questions about exact service details to
[documented behavior](documented-behavior.md).

## 6. Some work starts with a question — 45 seconds

**Purpose:** Show a business use for schedules beyond recovering payment events.

**Say:** “Sometimes we simply need to ask whether a condition is true. Here,
stock is three and the threshold is five. One armed episode should produce
one alert, even when the clock checks again.”

Real inventory can also publish events. This example does not assert the absence
of inventory webhooks, and the demo alert does not contact a supplier.

## Two workflows behind the four beats

S1 is the two-module payment webhook workflow. S2 is one five-module engine:
context → live-mode filter → poll → reconciliation → condition → retry.
The filter is between the first two HTTP modules, not an extra scenario.
Explain this before opening the live demo. Several activity entries can come
from one S2 execution. Polling Off is necessary when demonstrating recovery
because polling runs before reconciliation.

## 7. Follow the customer and the Back Office — 5–7 minutes

**Before presenting:** Start the local server and prepare Local Sim using the
[presenter guide](../../DEMO-GUIDE.md#back-office-prepare-once). Use the
Open HomeServer link, which opens a separate tab so the deck stays on this slide.
Check that the prepared cart contains one GPU and the active rehearsal is reset.

The default walkthrough uses Local Sim. For Make Live, replace each individual
check button below with Run once in **S2: Scheduled engine**, or **Run scheduled
checks** if optional panel API access is configured. Both start the same full
S2 sequence; use the switches to isolate the beat.

Run these beats using the guide's exact steps:

1. **Speed:** Pay with Webhook, Polling, and Recovery On. Show webhook
   fulfillment and invoice 1. Run poller; show zero eligible orders.
2. **Twice:** Resend webhook on that order. Show more attempts and the same invoice.
3. **Never:** Webhook Off, Polling Off, Recovery On. Use Continue shopping →
   Cart → Checkout to create a new order. Show paid/pending, wait at least
   10 seconds, then run reconciliation. The same confirmation updates.
4. **Condition:** Inventory → Scheduled check On → Reorder alert On →
   stock 3 below 5 → Run stock check. Show one alert and no second alert on recheck.

If an automatic run happens first, use its activity entry as the evidence.
Do not click repeatedly to force a preferred narrative. Inspect records is
available for questions; keep Settings closed during the main demonstration.

**Return to the deck:** “We have seen speed, safe repetition, recovery, and
scheduled condition checks. Those are different jobs within one workflow.”

## 8. React quickly. Handle repeats safely. Recover what was missed. — 45 seconds

**Purpose:** Close on the design questions the audience can reuse.

**Say:** “Use the notification to start quickly. Make the shared business action
safe to repeat. Check for unfinished work. Then ask: what if this arrives
twice, or never arrives?”

Invite questions. Do not promise exactly-once transport or production payment
safety based on this simulation. Keep [the implementation limits](homeserver-demo.md)
ready for technical discussion.

## Local deck review · 2026-10-16

All eight slides were checked at 1920 × 1080 and 1366 × 768 with no main-area
overflow. Forward/backward controls, Home navigation, and theme switching were
exercised. The in-app browser declined the fullscreen request; fullscreen
acceptance in the presentation browser remains a rehearsal check. Repository
links, local slide assets, and inline JavaScript syntax were checked, and the
18 existing domain/API/evidence tests passed. No live service acceptance was
performed for this documentation revision.


## Two-scenario reconciliation review · 2026-10-16

The supplied exports confirm the existing S1/S2 structure. Polling,
reconciliation, condition, and retry are modules inside S2. The current guide
and slide handoff use two scenarios throughout. The optional S2 API launch is
locally tested against a fake provider, not claimed as enabled in production.
