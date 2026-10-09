# Browser Input, Server Checks, and Checkout Security

A public research companion to HomeServer, an educational storefront and
simulated checkout. This edition summarizes published guidance, documented
incidents, and the implementation supplied in this repository.

Reviewed **2026-10-09**. The review covers source material and local code;
it is not a security certification or a live payment test.

## Reading guide

| Document | Question it addresses |
|---|---|
| [Browser trust](browser-trust.md) | What should a website check beyond the browser? |
| [Documented incidents](documented-incidents.md) | What do the public records establish about the examples? |
| [Checkout services](checkout-services.md) | How do established payment integrations handle orders and payment confirmation? |
| [Illustrative scenarios](illustrative-scenarios.md) | How might related failures arise, under stated assumptions? |
| [HomeServer demo](homeserver-demo.md) | What does the supplied implementation demonstrate, and where does its protection stop? |
| [Sources](sources.md) | Which sources support the summaries, and what are their limits? |

## Findings and scope

The reviewed guidance separates input validation, authorization, business
rules, and payment confirmation. A price displayed or hidden on a page is
not sufficient authority for an order. Established checkout integrations
provide documented ways to create orders and confirm payments beyond the
browser, while the merchant retains responsibility for its own pricing
and access rules. Supporting references are linked in each chapter.

The incidents illustrate different mechanisms. GitHub's report concerns
unauthorized attribute changes; the Steam disclosure concerns ambiguity
in signed payment data. Pinduoduo is included as reported business context
with an undisclosed technical cause. They are not presented as three
instances of the same checkout bug.

## How to read the evidence

- **Documented guidance or behavior:** supported by an official technical
  source or a primary incident disclosure. Product documentation describes
  an integration, not every merchant using the product.
- **Reported event:** attributed to journalism when no primary technical
  disclosure was reviewed.
- **Code-derived conclusion:** follows from the supplied implementation.
  It does not establish deployed configuration or executed behavior.
- **Hypothetical illustration:** a stated example with explicit conditions;
  it is not an observed incident or a tested exploit.

No prevalence estimate, merchant-wide assessment, or guarantee that online
checkouts are universally safe is made. Sources can change; review dates
record when their relevant content was read. Summaries are paraphrases,
not copies of the source publications.
