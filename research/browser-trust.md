# Browser input and server checks

The browser runs on the visitor's device. A visitor can modify page state
or send a request without using the intended interface. Consequently,
page-only checks cannot establish that submitted values satisfy the
application's rules. OWASP describes this limitation in its
[input-validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).

## Different questions require different checks

| Question | Check described by the reviewed guidance |
|---|---|
| Is the input in an acceptable format and range? | Validate its structure and meaning. |
| May this person access this record? | Check permission for that object and operation. |
| May this person change an account's role? | Restrict writable fields and authorize the change. |
| What does this cart cost? | Calculate the price using authoritative records. |
| May this offer be used again? | Enforce the offer's eligibility and reuse rules. |

These are separate decisions. A well-formed identifier does not grant
access, and successful integer conversion does not establish an acceptable
quantity. Sources: [OWASP input validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html),
[object access](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html),
[mass assignment](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html), and
[business logic](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html).

## Hidden fields

Hiding a field changes its presentation. It does not prevent its value
from being read or changed on the device. In HomeServer, the checkout code
reads the hidden `order_total` value when creating the order; the database
check determines whether a mismatched total is accepted. See the
[implementation summary](homeserver-demo.md) and
[checkout source](../public/checkout.html).

## What HTTPS establishes

Properly configured TLS protects confidentiality and integrity between
endpoints and lets the client authenticate the server. It does not decide
whether a price or permission supplied by an endpoint is legitimate. A
client can originate a request containing an inappropriate value without
breaking encryption. This is a distinction between transport protection
and application decisions, based on [OWASP's TLS guidance](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)
and the validation and authorization guidance above.

The server is also capable of implementing a rule incorrectly. Moving a
calculation there does not, by itself, validate every item or permission;
HomeServer's [trigger limits](homeserver-demo.md#limits-of-the-price-check)
provide a concrete code-derived example.
