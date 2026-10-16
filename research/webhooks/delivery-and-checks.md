# Delivery and scheduled checks

## Separate the business fact from the message

Payment and fulfillment are different steps. A paid order can still be waiting
for a receipt, stock allocation, or service access. In HomeServer, fulfillment
means changing one paid order to fulfilled and assigning its demo invoice.
That definition does not imply goods have shipped.

A **webhook** sends an HTTP notification when a subscribed event occurs. A
**poll** asks for changes on a schedule. A **reconciliation** check compares
unfinished work with authoritative state so missed work can be recovered.
Shopify documents both webhook subscriptions and reconciliation queries.
[Shopify: About webhooks](https://shopify.dev/docs/apps/build/webhooks).

HomeServer distinguishes the last two operationally: Polling scans a moving
payment-time window; Recovery scans old enough paid orders still unfulfilled.
These are this demo's definitions, not universal API terminology.

## Why combine them?

An event can reduce the wait until the next scheduled query. A schedule can
also find work when no usable notification arrives. Neither transport choice
alone makes a business action safe to repeat. The receiver needs a durable
rule for whether the work has already been done.

For an ideal fixed 30-second poll, a change just after a check waits almost
30 seconds for detection; a change just before the next check waits almost
none. This is an illustrative timing calculation, assuming successful queries
and negligible processing time, not a latency benchmark or guarantee.

## Repeating a message versus repeating work

A retry asks again because an earlier attempt may have failed or its response
may have been lost. **Idempotency** means repeated execution of the same logical
operation does not add another business effect. Identity and atomic state
changes matter: a unique-looking invoice label alone does not prevent two
external emails or shipments. AWS explains caller-supplied request IDs and
atomic changes as tools for safe retries.
[AWS Builders' Library](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

For HomeServer, all three paths compete for the same paid-to-fulfilled transition.
The first claim assigns an invoice; later attempts leave it alone. This is a
bounded model with a single state update, not a general exactly-once delivery promise.

## When a schedule is the business rule

The Inventory beat asks whether stock is below a threshold. A clock can evaluate
that condition even without a payment event. This is a design choice in the demo;
real inventory systems can also publish stock-change events. The point is that
scheduled evaluation remains useful, rather than that inventory cannot use webhooks.
