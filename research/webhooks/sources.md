# Sources and verification boundaries

Primary pages read on **2026-10-16**. Summaries are paraphrases. Review dates
record a read, not permanent availability or future service guarantees.

- [Stripe: Receive events in your webhook endpoint](https://docs.stripe.com/webhooks).
  Supports the Stripe-specific retry, duplicate, and ordering discussion.
  Does not establish HomeServer integration or universal webhook behavior.
- [Stripe: Fulfill orders, hosted Checkout](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted).
  Supports payment-status checks and repeated/concurrent fulfillment handling.
  The hosted parameter was used because the generic route returned a short index.
- [Shopify: About webhooks](https://shopify.dev/docs/apps/build/webhooks).
  Supports event subscriptions, missed-delivery risk, and reconciliation guidance.
  It does not prescribe HomeServer's thresholds or intervals.
- [GitHub: Handling failed webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries).
  Supports the difference in GitHub's failed-delivery/redelivery contract.
  This is documented operation, not a historical outage report.
- [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).
  Supports intent identifiers and atomic operations for safe retries.
  The article does not certify HomeServer or promise exactly-once transport.

## Repository evidence

The [implementation chapter](homeserver-demo.md) links the actual model,
adapters, database migration, and setup contracts. The [presenter guide](../../DEMO-GUIDE.md)
records the current controls and local verification boundary. The
[slide deck](../../public/webhooks-slides.html) contains teaching diagrams and
links to these primary sources. It does not execute the order model.

No provider account was queried for this research. No real transaction, live
Make acceptance test, latency benchmark, or historic incident reproduction was
performed. The illustrative scenarios are explicitly separate from source facts.


## Make implementation references · reviewed 2026-10-16

- [Make webhooks](https://help.make.com/webhooks): event-triggered scenario processing.
- [Make scheduling](https://help.make.com/schedule-a-scenario): schedules and manual runs.
- [Make pricing](https://www.make.com/en/pricing): current plan limits; the account
  constraint is two active scenarios, with an observed 15-minute live schedule.
- [Make scenario API](https://developers.make.com/api-documentation/api-reference/scenarios):
  active-scenario launch and asynchronous `responsive=false` requests.
- [Make authentication](https://developers.make.com/api-documentation/authentication/create-authentication-token):
  private API token setup, conditional on the account's available access.

The sanitized blueprints in `make/` are repository evidence for the actual module
order. The schedule note is based on observed callbacks, not an inference from
the blueprint's missing schedule or an account-wide API entitlement test.
