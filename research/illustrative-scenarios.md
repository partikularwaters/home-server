# Illustrative scenarios

All examples below are **hypothetical**. Field names and amounts are
teaching examples, not requests captured from an incident. HomeServer
implements neither account registration nor payment/currency processing.

## A submitted role becomes a privilege

Suppose an ordinary registration request contains `role=admin`. A
privilege escalation requires the server to accept that protected
attribute and use it to grant access. Changing the field alone is not
enough. Restricting writable attributes and separately authorizing role
changes address distinct parts of this scenario.
[Source: OWASP mass assignment](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html).

## A negative quantity becomes a negative total

Suppose a paid-sale cart accepts quantity `-1` for an item priced at 100.
Ordinary multiplication yields `-100`. This becomes a refund or credit
exploit only if other payment, ledger, or fulfillment rules wrongly treat
that result as an entitlement. No such consequence follows from arithmetic
alone.

Checking the accepted quantity range is separate from recalculating the
price. Zero-price offers and refunds need explicit rules of their own.
[Sources: OWASP input validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
and [business logic](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html).

## A currency changes while the number stays the same

Suppose a system accepts the numeric amount `1599` in JPY for a cart it
intended to bill in USD. Underpayment requires it to accept that different
billing instruction and fulfill without checking the intended amount and
currency. There is no exchange-rate calculation or tested processor
behavior in this example.

The merchant should bind amount and currency to the order and reconcile
them with confirmed payment. Processor-specific units matter: PayPal
lists JPY as a currency that does not support decimals.
[Sources: OWASP payment integration](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html)
and [PayPal currency codes](https://developer.paypal.com/api/codes/currency/).

## A one-time offer is redeemed twice

Suppose two requests check an unused offer before either records its use.
Both could succeed if the check and update are not coordinated. A single
successful check is therefore insufficient to enforce one redemption.
This is a concurrency illustration, not a diagnosis of the Pinduoduo
incident. [Source: OWASP business logic](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html).
