# Business Central Document Lifecycles

## Purpose

Document Lifecycle knowledge describes how Business Central documents, actions,
and states may relate within a process. It prevents recording analysis from
treating every page as an unrelated screen. Definitions are configuration, not
rendering instructions and not a claim that every tenant follows one mandatory
path.

```text
Process Taxonomy document IDs
            ↓
Document Lifecycle + configuration variant
            ↓
Process Recognition evidence
```

## Model

The schema contains lifecycle identity, related BC Process IDs, document/action/
state stages, optionality, typed transitions, permitted variants, document-state
models, metadata, and future fields.

Supported relationships are `creates`, `derivedFrom`, `postedAs`, `fulfilledBy`,
`consumedBy`, `produces`, `reverses`, and `returns`.

The representative catalog includes Sales, Purchase, Production, and Transfer
lifecycles. It uses stable Process Taxonomy document IDs and definitions for
quotes, posted invoices, posted warehouse receipts, and production-order states.

## Variants and optionality

Built-in variants are No Warehouse Handling, Basic Warehouse, Advanced
Warehouse, Direct Shipment, Drop Shipment, Make to Stock, and Make to Order.
Each lifecycle selects its applicable subset and path.

Advanced sales warehouse handling can include Sales Order → Warehouse Shipment
→ Warehouse Pick → Posted Shipment. Basic handling does not require Warehouse
Pick. No Warehouse Handling may proceed from order to invoice. Drop Shipment has
an explicit linked Purchase Order branch. Every path may stop early.

`match` returns ranked lifecycle/variant candidates, matched stages, typed
transitions, partial status, confidence, and readable explanations. It never
modifies a recording.

## Document states

State models remain separate from document creation flow. The Sales Order model
supports `Open → Released → Reopened → Released → Posted`. Only observed semantic
state evidence is applied; page visits do not imply document state.

## Recognition integration

Process Recognition matches each BC Process candidate against applicable
lifecycle variants. A verified Warehouse Shipment `fulfilledBy` Warehouse Pick
transition is strong evidence for outbound fulfilment. Caption or screenshot
similarity cannot create that transition. Lifecycle confidence is one component
of the overall recognition score and remains independently explainable.

Partner and customer lifecycle packs can be injected without changing rendering,
Canonical Recording, or the core catalog.
