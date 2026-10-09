# What the HomeServer demo demonstrates

This chapter is derived from [schema.sql](../schema.sql),
[checkout.html](../public/checkout.html), [index.html](../public/index.html),
[build-config.js](../build-config.js), and [vercel.json](../vercel.json),
read on 2026-10-09. It describes supplied source, not verified production
configuration. No database query, SQL execution, order insertion, or
payment test was performed for this edition.

## Architecture and order flow

The site consists of static pages with a Supabase API/PostgreSQL backend.
The catalog is fetched from `products`. The browser keeps its cart in
local storage and renders a hidden `order_total` input. At submission,
`placeOrder()` reads that value and sends customer, email, items, and total
through the Supabase JavaScript SDK.

The visible teaching toggle selects one of two destinations:

| Mode | Destination | Supplied price check |
|---|---|---|
| Hidden | `orders_vuln` | No catalog-total trigger |
| Protected | `orders` | A trigger checks the catalog-derived total before insertion |

Both order tables retain column constraints. “Vulnerable” here refers to
the missing price comparison, not the absence of every database check.
There is no payment capture or shipping operation in the order flow. The
UI's word “Charged” is demonstration wording, not evidence of a charge.

## The price check

The schema defines three tables, six catalog seed entries, one trigger
function, one trigger, and five row-security policies. It seeds
`rtx4090` at `1599.00`; `ON CONFLICT DO NOTHING` means rerunning the seeds
does not update an existing product's price.

`orders_price_check` runs `enforce_real_price()` before each insertion
into `orders`. The function expands the submitted items, joins matching
product IDs, and sums catalog price multiplied by integer-cast quantity.
It raises an exception if that sum is zero or differs from the claimed
total. It rejects a mismatch; it does not replace the submitted total.

For one seeded GPU with quantity 1, a claim of `1.00` differs from
`1599.00` and reaches the mismatch exception. That is a deduction from
the SQL and seed values, not a newly executed database result.

## Limits of the price check

The SQL's inner join omits unknown product IDs. A mixed order containing
one known GPU and an unknown item can pass the function's explicit checks
when its total equals the known line's total. The function also lacks a
positive-quantity rule: quantity `-1` and claimed total `-1599.00` pass
its nonzero/equality checks for the seeded GPU.

These examples are source-derived. Parsing, type conversion, privileges,
and other constraints can affect execution. The function does not check
stock, every item's existence, duplicates, buyer identity, or payment.
It applies to inserts into `orders`, not updates or `orders_vuln`.

## Access and configuration

The five supplied policies permit product reads and order reads/inserts
without per-buyer conditions. They omit a role clause, which PostgreSQL
interprets as applying to PUBLIC. SQL privileges are also required;
additional policies and privileged-role bypass affect access. The file
contains no grant statements or update/delete policies. These facts do
not establish the installed project's permissions.
[Sources: supplied schema](../schema.sql) and
[PostgreSQL row-security documentation](https://www.postgresql.org/docs/18/ddl-rowsecurity.html).

With suitable grants, the order-read policies permit access to other
orders, including customer and email fields. This is a classroom design,
not buyer isolation. A public application key does not authenticate an
individual buyer, and elevated Supabase keys can bypass row security.
[Source: Supabase API-key documentation](https://supabase.com/docs/guides/getting-started/api-keys).

The build script writes browser configuration when both environment
variables are supplied; otherwise it retains an existing file or warns.
Configuration files are ignored by Git. This convention is not proof
that credentials never appeared in repository history.

## Reading the server-view panel

The checkout queries the newest 15 rows from each order table. Stored rows
come from the backend, while product names, comparison totals, and the
`TAMPERED` label are computed in the browser using cached product data.
The panel can be changed on the device and is not an independent audit
channel. Its refresh occurs at startup, submission, and manual actions;
there is no realtime subscription in this source.

A trigger mismatch rejects the insertion. The UI's blanket error wording
that nothing was written should not be treated as proof after an ambiguous
network or response failure.

The [slides](../public/slides.html) contain static teaching illustrations
and a handoff to checkout. They do not call the backend or change the cart.
