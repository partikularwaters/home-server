# Illustrative scenarios

These are hypothetical design exercises. They are not observed incidents,
provider commitments, or claims about HomeServer's external capabilities.

## A membership payment arrives twice

Assume a verified payment ID maps to one membership grant. Two copies of the
notification arrive concurrently. If each handler independently adds 30 days,
the member could receive 60 days. A durable claim tied to that payment must
control the grant. Merely hiding the second message in the UI would not help.

HomeServer's equivalent is one invoice for the same paid order in Twice.
It does not implement membership access.

## A receipt service is temporarily unavailable

Assume a payment provider has recorded a payment but the merchant's receiver
cannot accept notifications. A scheduled reconciliation retrieves paid items,
compares them with merchant fulfillment records, and retries unfinished work.
This requires an accessible authoritative history and correct pagination,
identifiers, and time boundaries. A scheduled job cannot recover facts it
cannot obtain.

HomeServer simplifies this into one shared simulated ledger and an age-gated
scan. It does not prove independent provider reconciliation.

## Stock stays low across several checks

Assume an alert should fire once per armed low-stock episode. Each scheduled
check observes stock 3 below threshold 5. The first alerts, and the next checks
observe that the episode is already handled. The system needs an explicit
rule for when a new episode begins.

HomeServer re-arms through the Reorder alert control. Changing stock or its
threshold also clears its handled-condition flag. Its alert is an internal
record, not a purchase order.
