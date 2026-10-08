# DEMO-SCRIPT — HomeServer live hack

Rehearse twice. Each beat is one action and one line. Total: ~7 minutes.

Setup before class: cart cleared, checkout open, toggle on **Hidden**,
server view collapsed. Slides at slide 5 (the demo slide).

---

## Beat 1 — The honest order (30s)

Add an RTX 4090. Open the cart, note the total: $1,599.00. Go to checkout.

> "A normal checkout. Name, email, total, place order. Watch the server view."

Submit. Expand server view. One row, PROTECTED? No — HIDDEN badge, status ok.

> "The order landed in the database with the real price. Nothing surprising yet."

## Beat 2 — Open the hood (45s)

> "Now let's look at what the page is actually sending."

DevTools → Elements. Find `<input type="hidden" id="order_total" value="1599.00">`.

> "The total lives in a hidden field. Hidden from sight, not from the customer.
> Everything in the browser is theirs: HTML, the field, the JavaScript, the request."

## Beat 3 — The $1 GPU (90s)

Double-click the value, change `1599.00` to `1.00`. Submit.

> "Order recorded. Charged one dollar."

Expand server view. The new row: HIDDEN badge, total $1.00, status **TAMPERED (real: $1,599.00)**.

> "The fraud didn't just display wrong. It is in the database. The server
> believed the browser, because nobody told the server to check."

Let that sit for two seconds.

## Beat 4 — Flip the toggle (30s)

> "Same store, same page, same hack. One difference."

Click **Protected** on the demo bar. The form is exactly as you left it: same cart, same tampered total still sitting in the hidden field. Sending an order only sends; nothing re-rendered.

## Beat 5 — The hack fails (90s)

Same DevTools edit: total to `1.00`. Submit.

Red box: "Rejected by the server. price mismatch: claimed 1.00, actual 1599.00. Nothing was written."

Refresh the server view. No new row.

> "The browser lied exactly the same way. This time the database re-checked
> the price itself, inside Postgres, where the browser cannot reach — and
> refused. The fraud never arrived."

## Close (30s)

Back to slides, slide 6.

> "Hidden is not protected. For anything that matters — prices, permissions,
> features — ask two questions: does the browser enforce it, or does the
> server re-check it? Only the second one counts."

---

## If something goes wrong

- **Supabase unreachable:** the page shows what failed. Check network, check the project isn't paused (free tier pauses after inactivity — wake it in the dashboard).
- **Tampered order accepted in Protected mode:** the trigger isn't installed — re-run `schema.sql`, all of it.
- **Honest order rejected in Protected mode:** prices drifted between page load and submit (they can't — the page reads the same table), or a stale `config.js` points at a different project.
- **Cart empty on arrival:** localStorage is per-browser. Build the cart in the presenting browser.
