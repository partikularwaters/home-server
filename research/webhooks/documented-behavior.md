# Documented service behavior

These are primary documentation examples, not reconstructed customer incidents.
Relevant content was read on **2026-10-16**. Providers have different contracts.

## Stripe: repeated events and fulfillment

Stripe documents automatic live-mode delivery retries for up to three days,
possible duplicate events, and no event-order guarantee. It advises tracking
processed event IDs, with additional object/type handling for separately
created duplicate events. These details belong to Stripe's documented service;
HomeServer's short retry sequence is its own teaching model.
[Stripe: Webhooks](https://docs.stripe.com/webhooks).

Stripe's Checkout fulfillment guide says a landing-page visit is insufficient:
a customer can pay and lose connectivity before returning. It calls for payment
status checks and fulfillment that tolerates repeated, concurrent calls.
[Stripe: Fulfill orders](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted).

**Connection to the talk:** Twice tests duplicate handling; the confirmation
screen displays state rather than proving that a payment provider was contacted.

## Shopify: reconcile when notifications are missed

Shopify explicitly recommends reconciliation jobs because webhook delivery
and handling can fail. Its guide describes periodic API reads and filters for
objects updated since a prior run.
[Shopify: About webhooks](https://shopify.dev/docs/apps/build/webhooks).

**Connection to the talk:** Never leaves a paid order unfinished, then recovers
it through a scheduled check. HomeServer queries its simulated paid ledger;
it does not query Shopify or an independent payment provider.

## GitHub: automatic retries are not universal

GitHub says failed webhook deliveries are not automatically redelivered. Its
recovery guidance includes a scheduled script that finds failed deliveries
and requests redelivery.
[GitHub: Handling failed webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries).

**Connection to the talk:** Check the actual provider contract. HomeServer's
four attempts must not be described as how every webhook service works.

## AWS: retry identity expresses intent

AWS describes caller-provided request IDs that distinguish a retry from a
second intended operation. Recording identity and applying changes together
avoids a gap where work succeeds but the duplicate record does not.
[AWS: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

**Connection to the talk:** Repeat the same event for the same order in Twice.
Buying the same GPU in a new checkout creates a different intended order.
