# Product dogfooding baseline plan

## Scope

Run 24–30 sanitized recordings in real Business Central sandboxes. Store no
customer secrets in the repository. Fixture IDs and aggregate metrics may be
committed; screenshots, URLs, tenant/company/user names, document numbers, and
business values remain in approved local evidence storage.

The existing 20-sample screenshot metadata corpus is an engine-validation
baseline, not a substitute for this product dogfooding run. Its current result is
14/17 eligible automatic choices before targeted rules and 17/17 after, with one
capture failure, one ambiguous case, and one manual-override case.

## Recording matrix

| IDs | Count | Required coverage |
|---|---:|---|
| STD-SHORT-01..04 | 4 | Short standard BC list/card processes |
| STD-LONG-01..03 | 3 | Long multi-page processes |
| LOOKUP-01..03 | 3 | Customer, item, vendor lookups |
| VALUE-01..03 | 3 | Quantity, date, checkbox |
| DIALOG-01..02 | 2 | Confirmation and validation dialogs |
| POST-01..02 | 2 | Posting with resulting navigation |
| WHSE-01..02 | 2 | Warehouse list/card/action flow |
| PROD-01..02 | 2 | Production flow |
| APTEAN-01..02 | 2 | Aptean extension behavior |
| REACT-01..02 | 2 | React/control add-in, including nested frame |
| LANG-SV-01..02 | 2 | Swedish UI |
| LANG-EN-01..02 | 2 | English UI |
| LANG-OTHER-01 | 1 | One additional available UI language |

Coverage overlaps by design, producing 30 slots if every row is filled. At least
24 must be completed; no category may be omitted.

## Per-recording worksheet

Record these raw counts, never an opaque quality score:

- fixture ID, date, tester, browser/version, BC version, language, process class;
- captured expected interactions / expected observable interactions;
- correctly normalized interactions / normalized interactions sampled;
- correctly bounded Step Groups / Step Groups sampled;
- generated steps and steps accepted without text edit;
- eligible screenshot steps and screenshots accepted without replacement;
- manual text edits, manual screenshot replacements, and hidden/merge/split
  operations;
- exported documents and Word post-export corrections;
- categorized capture, normalization, grouping, semantic, screenshot, renderer,
  or environment defects; sanitized defect reference.

## Core product KPI formulas

- Generated-step acceptance = accepted without edit / generated steps.
- Screenshot acceptance = accepted without replacement / eligible screenshot steps.
- Manual edits per 10 steps = manual text edits / generated steps × 10.
- Word corrections per document = post-export corrections / exported documents.
- Capture completeness = captured expected interactions / expected observable interactions.

Report numerator, denominator, and percentage/rate. Missing capture is not a
screenshot-selection failure. Manual overrides and ambiguous evidence are
reported separately. Do not mix engine corpus results with product KPIs.

## Current product baseline

No 24–30-recording product run has yet been executed. Product KPI values are
therefore **not established**; reporting zeros or inferred percentages would be
misleading. This plan, matrix, and formulas are the baseline instrument. The next
milestone should execute it and publish sanitized aggregate results plus defect
references.

## Freeze list

The following mature foundations should receive no speculative refactoring
without a demonstrated defect: Semantic Document, Document Planner, Document
Components, Presentation Grammar, Word Adapter, Document Workspace foundation,
and Document Library foundation. This is architectural guidance, not a technical
lock; evidenced defects and necessary compatibility changes remain permitted.

## Exit criteria and remaining risks

Complete at least 24 recordings with all coverage categories represented,
reconcile totals, classify every failure, and retain reproducible sanitized
references. Remaining risks before execution are capture timing in real add-ins,
multi-frame Chrome behavior, language fallback coverage, long-process Review
ergonomics, and Word corrections that unit tests cannot reveal.
