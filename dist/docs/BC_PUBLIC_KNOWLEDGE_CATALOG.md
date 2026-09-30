# Business Central public knowledge catalog

BC Process Studio bundles a version-scoped catalog of standard Business Central pages from Microsoft Learn. The data is for local identification and review; it is not a tenant connector and does not query a Business Central environment.

## Current snapshot

| Snapshot | Records | Distinct page IDs | Documentation |
| --- | ---: | ---: | --- |
| Business Central 21.0 | 182 | 182 | [Pages with Action Bar Improvements](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-pages-action-bar-improvements) |
| Business Central 28.x | 54 | 54 | Microsoft Learn Base Application page references, each linked on its record |

There are 203 distinct page IDs across both snapshots. The enabled process packs include source-linked observable-action rules for sales and purchasing invoice-line retrieval, return/correction flows, customer/vendor payments, payment reconciliation, project usage, invoicing, time-sheet hand-off, resource-capacity setup, service worksheet/posting, and selected production-order actions. Selected sales and purchase order-line, shipping/receiving, release and posting rules, return/correction, cash/payment, warehouse pick/receipt/put-away, production-journal posting/output/consumption-quantity, production-order status and replan/refresh, sales shipment-line retrieval, purchase receipt/order-line retrieval, project planning/usage/invoicing/time-sheet/resource-capacity, and service worksheet/posting rules now have runtime-tested matching coverage across all eight supported UI locales. Other warehouse rules and the broader inventory, service-management, and core-action rules still have narrower language coverage. Some page IDs appear in both versions, because captions and metadata can change. For example, page 22 is documented as `Customer List` in the BC 21.0 snapshot and `Customers` in the BC 28.x reference. The catalog intentionally returns no version-scoped fact for gaps such as BC 26 when no matching source has been included.

Every imported record retains a Microsoft Learn source ID and URL. BC 21.0 records include page ID, documented caption and page type. BC 28.x records add source table and a short page description where documented. Definitions imported from reference material are marked `declared`; they are not runtime-verified against an installed tenant.

Service Management also distinguishes resource allocation from completed work and repair or order status from warehouse release status. These localized rules cite Microsoft Learn in all eight supported interface languages.

Warehouse receipt and shipment guidance now explains opening and posting as separate, source-backed actions in all eight supported interface languages. The text keeps receipt separate from put-away, and pick separate from shipment posting, because the operational sequence depends on location setup.

## Reviewer editing of explanations

A reviewer can change an explanation for one step and one document language. The edited text is stored on that review step, autosaved, undoable, and used in Word only when the step is opted in. Other language versions and the shared knowledge rule remain unchanged. The export labels reviewer text as edited and retains the matching Microsoft Learn reference as background.

## Newly covered standard workflows

The enabled packs now add **38 sourced action and field rules in ten areas**: intercompany inbox/outbox; assembly creation, partial quantity and posting; separate bank-account reconciliation; workflow request, approval, rejection and delegation; employee records and absence; sustainability inputs, recalculation and posting; outgoing and incoming e-documents; Excel, Teams, OneDrive and Outlook integration; subscription billing proposals, document creation and billing cutoff; and physical inventory and transfer orders. The rules carry 128 Microsoft Learn locale-specific source records and explicit explanatory text for all eight supported UI/document languages. Their caption/runtime fixture covers 350 localized cases, including legacy page identifiers.

Explanations describe the documented action, preserve the observed instruction/value, and do not claim an unobserved posting or successful delivery. Microsoft Learn references describe standard or separately documented functionality; tenant extensions, localization differences, permissions, setup, version changes, payroll, country-specific compliance, and full workflow variants still need validation in the target environment. The catalogue is broadening in measured, source-backed slices; it is not an exhaustive specification of all Business Central modules.

## Regeneration and extension

Run `node scripts/import-microsoft-bc21-pages.js` to regenerate the checked-in JSON packs from the source snapshot in that script. This is a deterministic import of a reviewed source snapshot, not a live scraper. When adding a page, check its current Microsoft Learn reference for page ID, caption, page type, source table, description and canonical URL; give it a BC version scope and add a source record before enabling it in `src/knowledge-packs/index.json`.

Use `npm run knowledge:validate`, `node tests/knowledge-catalog.test.js`, and `npm run test:knowledge-mcp` after updating the catalog. Process-specific action rules must also have locale coverage tests for all supported UI languages when Microsoft Learn publishes the corresponding localized page. Rules can constrain a match to exact Business Central page object IDs with `match.pageObjectIds`; use that when identical captions or actions appear on different page types. The repository rejects invalid source references and checks that version-specific lookups return the corresponding documented entry. Process-specific page mappings carry local Learn provenance so their action rules can resolve only on matching page identities. Some page definitions support separate BC 21 and BC 28 ranges; undocumented gaps such as BC 26 remain unresolved.

Localized process guidance belongs in `localizedInstructions`, backed by locale-specific Microsoft Learn source IDs. The runtime emits it as `userDirective` and retains the recording-derived `instruction` separately. This keeps a recommendation reviewable without presenting it as an observed action.


## Observed workflow explanations

A small set of tenant-extension workflow rules can use reviewed, eight-language explanations authored from explicit recorded captions and screenshots. Their review heading identifies them as based on the observed workflow. Existing source-free rules across add-on quality, production, claims, traceability, weighing, navigation, and record handling can use general process explanations, with a separate label. Neither group carries a Microsoft Learn citation, and Word export remains opt-in per step. Explanations describe only the visible process purpose; they do not assert extension internals or successful outcomes that the available context does not establish.

## Microsoft Quality Management — initial coverage

A separate bc-quality-management pack covers new inspection templates, new test definitions and template copying in all eight supported languages. It cites localized Microsoft Learn quality-template documentation and matches both page and action. It is distinct from Aptean Food & Beverage quality guidance. Coverage is partial: inspections, results, generation rules and disposition still require data. Documented captions are not installed-tenant verification.

The first extension to this pack also covers manual inspection creation from a template and the Schedule Inspection report. Scheduling guidance explicitly requires filters to limit the rules and source records processed. These actions start inspection creation; they do not enter or approve test results. English and Swedish captions are source-backed; captions for other interface languages are still a data gap.

Initial coverage has also been added for transferring G/L entries into Cost Accounting, creating cost budgets, recording contact or segment interactions, closing sales opportunities, importing Shopify orders, synchronizing calculated inventory to Shopify, and assigning lot numbers on inbound documents. The rules provide eight-language explanations. Exact runtime captions are only enabled where verified against Learn, currently English and Swedish for these new packs. Do not treat a translated explanation as evidence that its corresponding tenant caption has been verified. Cost Accounting, Marketing, Shopify, and Inventory remain partial coverage.
