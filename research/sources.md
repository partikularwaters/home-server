# Sources and verification boundaries

Relevant content was re-read on **2026-10-09** for this public edition.
A successful read is not a guarantee of future availability. Links are
provided for independent checking; publications are summarized, not archived.

## Technical guidance and product documentation

| Source | What it supports | Scope |
|---|---|---|
| [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) | Server validation; format/range checks; authorization is separate | Guidance, not incident evidence |
| [OWASP Mass Assignment](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html) | Restricting writable attributes and authorizing changes | Guidance; not a complete GitHub request reconstruction |
| [OWASP TLS](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html) | Transport confidentiality, integrity, and server authentication | Application authorization remains separate |
| [OWASP Object Access](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html) | Permission checks for referenced records | Guidance, not evidence of a particular store's flaw |
| [OWASP Business Logic](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html) | Authoritative pricing, offer reuse, and concurrency controls | Guidance; hypothetical scenarios remain illustrations |
| [OWASP Payment Integration](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Payment_Gateway_Integration_Cheat_Sheet.html) | Cart validation, payment reconciliation, authenticated callbacks, repeat handling | Merchant integration responsibilities |
| [Stripe Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create) | Authenticated session creation with price and quantity | Documented API pattern |
| [Stripe hosted Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted) | Payment-state checks, webhooks, delayed outcomes, fulfillment handling | Documented integration; no merchant test |
| [PayPal Checkout integration](https://developer.paypal.com/platforms/checkout/standard/integrate) | Backend order creation and capture | Platform/partner guide; not every PayPal integration |
| [PayPal currency codes](https://developer.paypal.com/api/codes/currency/) | JPY does not support decimal amounts in the documented API | No exchange-rate evidence |
| [PostgreSQL 18 row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) | Role scope, policies, privileges, and bypass | Version-pinned reference; deployed version not checked |
| [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys) | Application versus user identity; public versus elevated keys | Documentation; installed permissions not inspected |

All entries above were read through the web retrieval tool. The initial
Input Validation retrieval failed; a subsequent read returned its content.

## Incident records

| Source | Authority | Verified publication content and limits |
|---|---|---|
| [GitHub: Public Key Security Vulnerability and Mitigation](https://github.blog/news-insights/the-library/public-key-security-vulnerability-and-mitigation/) | Primary vendor account, March 4, 2012 | Key addition, project push, affected accounts, cause and fix; no complete request |
| [HackerOne #1295844](https://hackerone.com/reports/1295844) | Primary researcher disclosure with Valve replies, August 2021 | Signed-field ambiguity and confirmed behavior; no complete replacement implementation or broader loss figure |
| [Sixth Tone coupon reporting](https://www.sixthtone.com/news/1003483) | Secondary journalism, January 23, 2019 | Reported coupon abuse and attributed losses; technical cause unspecified |
| [TechNode coupon briefing](https://technode.com/2019/01/22/pinduoduo-voucher-theft/) | Secondary journalism, January 22, 2019; updated June 8, 2020 | Reported vouchers and company response; no technical diagnosis |

GitHub and TechNode were read through web retrieval. HackerOne's text
response returned a JavaScript notice; its disclosure and replies were
read in a browser. Sixth Tone's text retrieval timed out; its article was
also read in a browser. These limitations do not mean the publications
were unavailable or unverified, and are not inferred HTTP status codes.
The company post linked by Sixth Tone was not independently re-read.

## Repository evidence

| Source | Claims derived from it |
|---|---|
| [schema.sql](../schema.sql) | Tables, seeds, price trigger, item/quantity limits, policy definitions |
| [checkout.html](../public/checkout.html) | Hidden input, destination selection, SDK insertion, readback and display calculations |
| [index.html](../public/index.html) | Catalog retrieval and local cart |
| [slides.html](../public/slides.html) | Static teaching illustrations and demo links |
| [build-config.js](../build-config.js) | Conditional configuration generation |
| [vercel.json](../vercel.json) | Build command and deploy output directory |
| [.gitignore](../.gitignore) | Configuration-file ignore rules |

These files were read directly. The code-derived edge cases were not
executed in PostgreSQL. No live Supabase schema, grants, catalog, order
history, or deployed parity was inspected. No secret values were read.

## Inclusion rules

Incident summaries stay within the reviewed records. An unknown mechanism
is left unknown; hypothetical remedies are not attributed to a historical
company without evidence. No anonymous checkout story, unsupported report
identifier, market-share estimate, or universal safety conclusion is
included. Product guides establish supported patterns, not adoption or
correct implementation rates.
