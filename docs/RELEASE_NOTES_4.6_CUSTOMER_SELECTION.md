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

The same consolidation now covers a recognized item lookup. The observed
`Sortera efter Nr` sequence selecting item 136 becomes **Välj artikel "136".**
Focus-only updates for direct-delivery vendor and tour number are omitted. The
next genuine input becomes **Ange "500" i "Antal".**

Recorder privacy masking now respects the explicit customer, vendor and item
settings. Quantities and dates are retained because no product setting requests
their removal; secrets, email addresses, configured master-data identifiers and
amounts remain protected. Values already stored as `[antal]` cannot be recovered,
so an older recording must be repeated to display its original quantity.
