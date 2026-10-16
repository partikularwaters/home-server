# Webhooks, polling, and reliable fulfillment

A public companion to HomeServer's Back Office talk. Reviewed **2026-10-16**
against primary documentation and the repository's supplied implementation.

The live implementation uses **two Make scenarios**: S1 for payment webhooks,
and S2 for scheduled checks. Speed, Twice, Never, and Condition are the four
presentation beats, not separate scenarios.

The central question: **How does a business finish the work after a payment,
even when notifications repeat or fail?**

## Reading guide

- [Delivery and scheduled checks](delivery-and-checks.md): the concepts and tradeoffs.
- [Documented service behavior](documented-behavior.md): Stripe, Shopify, GitHub,
  and AWS examples, with the limits of each comparison.
- [Illustrative scenarios](illustrative-scenarios.md): assumptions behind three
  business examples; these are not incident reports.
- [HomeServer implementation](homeserver-demo.md): what the demo proves and omits.
- [Sources](sources.md): primary references, review date, and evidence boundaries.
- [Presenter notes](presenter-notes.md): slide purpose, speaking cues, and demo handoff.

For operation, use the [presenter guide](../../DEMO-GUIDE.md). The
[browser deck](../../public/webhooks-slides.html) is served at
`/webhooks-slides.html`. The [security research](../README.md) covers a separate lesson.

## Evidence conventions

**Documented behavior** describes what a provider's published guidance says.
**Code-derived** describes this repository. **Locally exercised** identifies a
rehearsal or automated check. **Illustrative** means an example with stated
assumptions. None of these establishes an untested production deployment.

The documented examples are integration contracts and engineering guidance,
not claimed outages. HomeServer uses a mock gateway; mentioning Stripe or
Shopify does not mean it integrates with either service.

The research is available in the Git repository. Only the slide deck and its
local assets are within the deployed `public/` directory. No deployment is
performed by creating these files.
