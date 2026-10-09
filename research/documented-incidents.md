# Documented incidents and reported context

These examples have different evidence strengths and mechanisms. Their
relationship to browser trust is an interpretation of the cited records,
not a claim that they share one implementation flaw.

## GitHub — March 4, 2012

**Primary source:** [GitHub's incident report](https://github.blog/news-insights/the-library/public-key-security-vulnerability-and-mitigation/).

GitHub reported that a user exploited its public-key update form to attach
their key to the Rails organization, then pushed a new file. Its
investigation identified three compromised accounts. GitHub attributed
the flaw to insufficient checks on incoming form parameters, describing
it as mass assignment, and reported deploying a fix that morning.

The publication does not supply the exact injected field or complete
request. Those details are not reconstructed here. The case shows an
unauthorized change through accepted input. [OWASP's mass-assignment guidance](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)
describes field restrictions and authorization as relevant controls.

## Steam / Smart2Pay — August 2021

**Primary source:** [HackerOne report #1295844](https://hackerone.com/reports/1295844),
containing the researcher's disclosure and Valve's replies.

The researcher described changing fields in a browser payment request
while preserving the combined text used for its signature. Field names
and values could be rearranged so that the signed text remained the same
but the parsed amount changed. Valve confirmed the reported behavior,
announced a production fix, and marked the report resolved on August 10,
2021. The report was submitted on August 9.

**Interpretation:** this concerns an ambiguous representation of signed
fields. It does not demonstrate that encryption or signatures are
inherently ineffective, nor that the problem was merely a hidden checkout
total. The published request uses PLN; it should not be restated as an
exact dollar transaction. The record does not establish losses from
unrelated attackers. Its replies describe mitigation without publishing
a complete replacement implementation.

## Pinduoduo — January 2019

**Secondary reporting:** [Sixth Tone, January 23](https://www.sixthtone.com/news/1003483)
and [TechNode, January 22](https://technode.com/2019/01/22/pinduoduo-voucher-theft/).

The reports describe widespread redemption of 100-yuan coupons and
attribute statements about fixes to the company. Sixth Tone reports
company-attributed losses of tens of millions of yuan; TechNode reports
about 10 million yuan in vouchers. These are differently attributed
figures, not a verified loss range.

Neither source establishes the request-level technical cause. This case
is included as reported context for business-rule failures, not proof of
missing server-side price checks or a particular coupon-limit bug. No
primary technical disclosure was reviewed.

## Comparison

| Example | Supported mechanism or context | Limit |
|---|---|---|
| GitHub | Unauthorized attribute change; vendor identifies mass assignment | Complete request not disclosed in the reviewed report |
| Steam | Researcher-described signed-field ambiguity; Valve confirms behavior | Complete mitigation and broader losses not established |
| Pinduoduo | Reported coupon abuse | Technical cause not established |
