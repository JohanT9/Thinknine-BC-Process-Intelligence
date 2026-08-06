# Documentation Excellence 4.6 — Consolidated customer selection

Business Central can emit several technical events while a consultant selects a
single customer. These events are now interpreted as one business operation.

The observed sequence for customer 1033 previously produced five steps covering
the customer field, lookup helper, row selection and resulting field updates. It
now produces one instruction: **Välj kund "1033".** The consolidated task keeps
all source-event references and the final relevant screenshot. Original session
events and screenshots are never modified.

The rule is deliberately narrow. It starts only from a recognized customer
field/action and stops before the next unrelated task. Generic record and item
selections outside an active customer lookup remain unchanged.
