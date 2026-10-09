# Established checkout services and merchant responsibilities

The reviewed Stripe and PayPal documentation describes order and payment
operations beyond the browser. It supports particular integration
patterns, not a claim that every site using those brands is secure.

## Order creation

Stripe's [Checkout Session creation API](https://docs.stripe.com/api/checkout/sessions/create)
shows an authenticated request supplying a Price ID and quantity. The
merchant's backend can select the authorized price when creating the
session rather than accepting a shopper's proposed total.

PayPal's [Checkout integration guide](https://developer.paypal.com/platforms/checkout/standard/integrate)
describes creating the order and capturing its payment on the backend.
This reference is a platform/partner integration guide; its example does
not establish the behavior of every PayPal product or merchant.

**Design conclusion:** when the merchant derives the bill from trusted
records and uses these server operations correctly, editing a displayed
price does not change that bill. A backend that accepts an untrusted price
can still create the wrong order. This responsibility split is consistent
with [OWASP's payment integration guidance](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html).

## Payment confirmation and fulfillment

Stripe's [fulfillment guide](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted)
describes retrieving the Checkout Session, checking payment status,
verifying webhook signatures, and recording fulfillment so repeated or
concurrent calls do not fulfill twice. Delayed payment methods need their
later payment outcome. A checkout return page alone is insufficient.

OWASP advises confirming payment with the gateway on the server, matching
the expected amount, currency, and order identifier, authenticating
callbacks, and handling repeats safely. It also requires backend cart
validation and recalculation from trusted data. These checks connect the
payment to the order that the merchant intended to sell.
[Source: OWASP payment integration](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html).

## Rules outside payment handling

A website still needs permission checks for private records. Changing an
order identifier must not grant access to another customer's order.
[Source: OWASP object access](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html).

Custom offers and credits also need eligibility, reuse, and concurrency
controls. A payment service does not automatically enforce the merchant's
unrelated workflows. [Source: OWASP business logic](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html).

## What this review does not establish

No merchant deployment or live payment was tested. The sources do not
establish how many websites use correct integrations or how common price
tampering is today. Payment documentation also does not establish a
merchant's honesty, protection against phishing, or security of every
account and website feature.
