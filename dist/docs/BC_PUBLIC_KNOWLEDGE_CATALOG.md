# Business Central public knowledge catalog

BC Process Studio bundles a version-scoped catalog of standard Business Central pages from Microsoft Learn. The data is for local identification and review; it is not a tenant connector and does not query a Business Central environment.

## Current snapshot

| Snapshot | Records | Distinct page IDs | Documentation |
| --- | ---: | ---: | --- |
| Business Central 21.0 | 182 | 182 | [Pages with Action Bar Improvements](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-pages-action-bar-improvements) |
| Business Central 28.x | 54 | 54 | Microsoft Learn Base Application page references, each linked on its record |

There are 203 distinct page IDs across both snapshots. The enabled process packs now contribute 91 source-linked observable-action rules, including sales and purchase return/correction flows, customer/vendor payments, payment reconciliation, and project usage journals. Selected sales and purchase order-line, shipping/receiving, release and posting rules, return/correction, cash/payment, warehouse pick/receipt/put-away, production-journal posting/output/consumption-quantity, and project-usage journal rules now have runtime-tested matching coverage across all eight supported UI locales. Other warehouse rules and the broader inventory, service, and core-action rules still have narrower language coverage. Some page IDs appear in both versions, because captions and metadata can change. For example, page 22 is documented as `Customer List` in the BC 21.0 snapshot and `Customers` in the BC 28.x reference. The catalog intentionally returns no version-scoped fact for gaps such as BC 26 when no matching source has been included.

Every imported record retains a Microsoft Learn source ID and URL. BC 21.0 records include page ID, documented caption and page type. BC 28.x records add source table and a short page description where documented. Definitions imported from reference material are marked `declared`; they are not runtime-verified against an installed tenant.

## Regeneration and extension

Run `node scripts/import-microsoft-bc21-pages.js` to regenerate the checked-in JSON packs from the source snapshot in that script. This is a deterministic import of a reviewed source snapshot, not a live scraper. When adding a page, check its current Microsoft Learn reference for page ID, caption, page type, source table, description and canonical URL; give it a BC version scope and add a source record before enabling it in `src/knowledge-packs/index.json`.

Use `npm run knowledge:validate`, `node tests/knowledge-catalog.test.js`, and `npm run test:knowledge-mcp` after updating the catalog. Process-specific action rules must also have locale coverage tests for all supported UI languages when Microsoft Learn publishes the corresponding localized page. The repository rejects invalid source references and checks that version-specific lookups return the corresponding documented entry. Process-specific page mappings carry local Learn provenance so their action rules can resolve only on matching page identities. Some page definitions support separate BC 21 and BC 28 ranges; undocumented gaps such as BC 26 remain unresolved.
