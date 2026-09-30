# Business Central knowledge coverage audit and roadmap

Audit date: 2026-09-30
Basis: enabled knowledge packs and their rule/source inventories in `src/knowledge-packs/index.json`, checked against Microsoft Learn. This is a coverage audit, not a claim that a short pack is useless: per the project rule, a thin scenario set is treated as missing knowledge that should be gathered and authored.

## Summary

The repository now has 27 enabled packs: 24 packs with task rules and three reference packs. The current packs contain 264 rules. Quality Management, Cost Accounting, Contact & Marketing, Shopify, Inventory Tracking and other areas that were missing or thin at the initial audit now have dedicated scenario packs, but their documented lifecycles are still only partly covered. Treat all thin areas as missing scenario data until their principal workflows, exceptions and tenant-specific behavior are evidenced.

Rule counts below are a rough signal only; status is based on whether the current rule IDs span the principal documented process stages. A small generic action rule does not count as scenario coverage.

## Area-by-area inventory

| Area / pack | Current rules | Assessment | Main work to close the gap |
|---|---:|---|---|
| Core | 9 | Baseline navigation and generic actions, not business-module coverage | Keep as shared primitives; require identified page/entity context for generic explanations. |
| Sales | 25 | Strongest transactional coverage; still scenario-limited | Cover quote-to-order conversion, prices/discounts, shipment/invoice partial flows, reservations, credit/collections, and document corrections end-to-end. |
| Purchase | 25 | Strong transactional coverage | Add request/requisition and quote comparison, approvals, receipts/invoice matching, landed costs, returns/credit, vendor evaluation, and exceptions. |
| Warehouse | 25 | Good coverage of receipts, shipments, picks, put-aways, availability; some rules are based on one observed tenant flow | Warehouse purchase receipt now distinguishes creating the receipt document from posting it and explains the conditional Quality Management inspection/put-away side effects. Add directed put-away/pick, movements, warehouse shipment/receipt variations, internal picks, cycle counts, bins, and exception/reversal scenarios. Keep tenant-specific weight/handling steps separately sourced as observations. |
| Manufacturing | 8 | Thin relative to the manufacturing lifecycle | Add BOM/routings, work and machine centers, capacity/calendar, production scheduling, planning worksheets, subcontracting, consumption/output corrections, and cost/variance posting. |
| Assembly | 4 | Thin | Assembly policy now distinguishes assemble-to-order and assemble-to-stock. Posting now carries conditional Quality Management context and distinguishes standalone output posting from linked assemble-to-order sales shipment. Add component availability/substitution, reservations, posting/undo, and linked sales/warehouse flows. |
| Projects (Jobs) | 17 | Moderate breadth; verify lifecycle transitions | Add project/task/budget setup, planning lines and prices, resource/item/G/L usage, WIP, invoicing, completion/close, and correction paths. |
| Service Management | 8 | Thin | Add service items/contracts, quotes/orders, dispatch/resource allocation, parts/labor, repair lifecycle, service shipment/invoice, warranty, and service credit scenarios. |
| Aptean Food & Beverage | 10, no source refs | Add-on-specific; rules need vendor/customer provenance | Keep separate from Microsoft base application. Source the installed extension/version and validate production, quality, catch-weight, lot, and claim rules against that tenant. |
| Standard page reference | 0 rules; BC 21 snapshot | Stale infrastructure reference, not a workflow pack | Refresh page identity coverage to current app version and local captions. Do not count it as business workflow coverage. |
| Base Application reference 28 | 0 rules; 54 sources | Reference metadata only | Use to ground page/entity identification and rule validation; it does not itself explain user workflows. |
| Cash Management | 10 | Moderate, focused on journals and applications | Add bank account reconciliation exceptions, cash forecasting, deposits, payment exports/imports, void/reissue, fees, and payment-file errors as applicable. |
| Finance | 15 | Broad sources but relatively few executable explanations | Add Cost Accounting as a distinct scenario family; complete fixed-asset acquisition, disposal, maintenance/insurance, transfer/reclassification, depreciation-book, and period/year-close lifecycles; expand journals, dimensions, VAT and reconciliation exceptions. |
| Intercompany | 4 | Thin | Extend setup/mapping, partner transactions, item/customer/vendor mapping, partner automation, consolidation/settlement, and exceptions. |
| Bank Reconciliation | 4 | Core flow explained; exceptions remain | Statement import and automatic/manual matching now distinguish staged lines, proposed links, missing entries and posting across eight locales. Add format variants, unmatched/duplicate/fee cases, correction, reversal and bank-feed behavior. |
| Approvals | 6 | Core request decisions explained; lifecycle remains partial | Approval user setup and approve/reject/delegate/send/cancel context now explain document review, limits, pending state and consequences. Add approval chains, substitute/overdue/escalation behavior, re-open/resubmit rules by document type and observed tenant actions. |
| Human Resources | 5 | Thin and narrow | Cover employee lifecycle beyond master data and absence capture/reporting; check whether payroll is actually in scope for the tenant, since it is not a general built-in BC payroll module. |
| Sustainability | 7 | Thin | Account categories/subcategories and G/L amount collection are covered. Purchase order and invoice lines now explain supplier-reported emissions, line-level fixed values, eligible line types, statistics review, and ledger-entry creation. Add account mapping, recurring journals, corrections, reporting, and version-specific behavior. |
| Subscription Billing | 4 | Thin | Manual contract lines and their Item/G/L Account paths are now covered. Add broader contract/recurring billing setup, pricing/indexation, document generation, period cutoff, deferrals, cancellation, and corrections. |
| Electronic Documents | 3 | Thin | Add inbound capture, validation/matching, sending, status/log/error handling, retries, archiving, and localization/network-provider variations. |
| Microsoft 365 | 5 | Partial integration set | Current rules distinguish Excel export from editable publishing and explain Teams link/card sharing, OneDrive file copies and Outlook add-in installation. Add Word/Outlook document workflows, Dataverse/Power Platform, and permission, sync and sharing failure scenarios. |
| Inventory and item tracking | 5 + 2 tracking rules | Partial standalone process coverage; overlaps some warehouse rules | Add item setup/variants/UOM, costing/adjustment, reservations, lot/serial traceability and correction, physical inventory documents, transfer/reclassification, and availability. |
| Quality Management (Microsoft extension) | 17 | Partial scenario coverage | Setup, templates/results, inspection generation, purchase-order navigation, production and assembly output, purchase returns, warehouse receipt posting, failed-inspection stock moves, negative adjustments and tracking corrections have scenarios. Warehouse and assembly posting explain their conditional inspection triggers and related document context. Cover result entry/editing, transfer/internal put-away, reinspection, broader disposition workflows and recovery. Keep separate from Aptean QC. |
| Contact & Marketing Management | 8 | Partial | Extend contact/company/person relationships, interaction setup/logging, campaign setup, audience segments and sales opportunity creation/stages; retain segment membership and opportunity closure/conversion context. |
| Cost Accounting | 8 distinct scenario rules | Partial within Finance | Cost budget register deletion now explains the batch job's start-through-last range, why middle entries cannot be deleted alone, and the safeguard of closing registers. Extend cost type setup/mappings, transfer and posting, manual/static/dynamic allocation, budget distribution and reporting/exceptions; keep distinct from G/L and project costs. |
| Shopify Connector | 5 | Partial integration family | Extend shop setup/mapping, customer/order/catalog synchronization, inventory/fulfillment/payouts, job queue, logging/retry and duplicate/conflict resolution. |

## Prioritized plan

### P0 — Close high-impact omissions

1. **Microsoft Quality Management**: close the remaining operational branches in result entry/editing, warehouse/internal put-away and transfer, assembly inspections, reinspection, disposition recovery and partial-post failure paths. Keep Microsoft QMS separate from Aptean QC. Record extension installation/version prerequisites and whether the feature is enabled in the environment.
2. **Cost Accounting**: extend setup-to-reporting scenarios for cost types, centers and objects; transfer and post; allocate; budget; analyze. Keep distinct from G/L accounting and project costing.
3. **Contacts and Marketing**: extend contact/segment/interaction/campaign/opportunity coverage. Distinguish Business Central's built-in contact/opportunity functions from Dynamics 365 Sales CRM integration.
4. **Inventory tracking and adjustments**: extend serial/lot trace, reservations, costing, physical inventory and transfer exception coverage, which underpin purchasing, sales, recalls and quality inspections.

### P1 — Complete core operational lifecycles

5. Manufacturing and assembly end-to-end, including setup/planning, capacity and component constraints, posting/corrections, and costs.
6. Service Management end-to-end, including contracts, dispatch, work, parts/labor, shipment/invoice, warranty and exceptions.
7. Fixed assets as a complete lifecycle rather than only depreciation/indexation: acquisition through maintenance, transfer/reclassification and disposal.
8. Expand warehouse and bank reconciliation exceptions: supported statement formats/feeds, unmatched/duplicate/fee handling, correction, reversals and recovery.
9. Expand project setup, WIP, billing and close; test boundaries with purchase, inventory, resources and warehouse.

### P2 — Complete cross-cutting and connected apps

10. Approvals, electronic documents, subscription billing, sustainability, HR, intercompany and Cash Management: add the missing stages and exception/recovery cases for each.
11. Shopify, Dataverse/Power Platform, and remaining Microsoft 365 workflows, with synchronization state, retries and permissions.
12. Refresh standard-page and application-reference metadata together with supported BC versions and localized captions. Page references improve identification but must never be counted as explanatory scenarios.

## Evidence and completion criteria

For every scenario, capture: trigger and page/entity context; prerequisite/setup; action; data changed; status transition; follow-up document/ledger effect; reversal or failure path; and a source link with applicable product/version. When Learn lacks a reliable detail, label it as observed tenant behavior or extension-specific guidance rather than asserting it as standard BC.

A pack is not considered complete because it has many sources or rules. Completion requires documented coverage of the main lifecycle branches, tests for ambiguous page/action matching and all supported UI languages, and no generic explanation where page/entity context is unavailable.

## Microsoft sources consulted

- Quality Management: https://learn.microsoft.com/en-us/dynamics365/business-central/qms-overview
- Quality Management setup: https://learn.microsoft.com/en-us/dynamics365/business-central/qms-setup
- Quality Management workflows: https://learn.microsoft.com/en-us/dynamics365/business-central/qms-quality-workflows
- Non-compliant quality results: https://learn.microsoft.com/en-us/dynamics365/business-central/qms-non-compliant-processing
- Cost accounting overview: https://learn.microsoft.com/en-us/dynamics365/business-central/finance-manage-cost-accounting
- Cost accounting concepts: https://learn.microsoft.com/en-us/dynamics365/business-central/finance-about-cost-accounting
- Contacts and interactions: https://learn.microsoft.com/en-us/dynamics365/business-central/marketing-interactions-overview
- Segments: https://learn.microsoft.com/en-us/dynamics365/business-central/marketing-segments
- Campaigns: https://learn.microsoft.com/en-us/dynamics365/business-central/marketing-campaigns
- Sales opportunities: https://learn.microsoft.com/en-us/dynamics365/business-central/marketing-manage-sales-opportunities
- Inventory lifecycle: https://learn.microsoft.com/en-us/dynamics365/business-central/inventory-manage-inventory
- Item availability: https://learn.microsoft.com/en-us/dynamics365/business-central/inventory-how-availability-overview
- Fixed assets lifecycle: https://learn.microsoft.com/en-us/dynamics365/business-central/fa-manage
- Shopify Connector: https://learn.microsoft.com/en-us/dynamics365/business-central/shopify/shopify-connector-overview
- Business Central integrations: https://learn.microsoft.com/en-us/dynamics365/business-central/integration-overview
- Current application feature index: https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/whatsnew/overview

## Implementation progress — 2026-09-29

P0 Quality started: separate Microsoft pack with three scenarios (new inspection template, new test definition, copy inspection template), eight localized explanations and eight localized Learn sources. Page and action must both match. Generic New and Aptean quality pages do not establish Microsoft Quality context. No tenant page IDs are invented.

Coverage remains THIN / MISSING DATA, not complete. Next: generation rules, manual inspections, recording results, completion, blocking/disposition and failure/recovery flows. Verify installed tenant captions and extension versions using recordings. Then proceed to P0 cost accounting, contacts/marketing and inventory traceability. Existing audit counts above describe the pre-implementation baseline.

P0 follow-up started: a distinct `bc-cost-accounting` pack describes transferring eligible G/L entries to cost entries and creating a cost-accounting budget. Explanations call out required mappings/dimensions, periods, source traceability and the distinction from G/L budgets; allocations, cost-center/object setup and exceptions remain uncovered. The `bc-contact-marketing` pack distinguishes recording an interaction on one contact from creating interactions for a segment, and now explains closing a sales opportunity, required outcome/date/code, company-contact quote restrictions and conversion to a customer/order. The `bc-shopify-connector` pack covers order import and inventory sync, including mappings, processing setup, availability calculation and log review. The `bc-inventory-tracking` pack explains inbound lot assignment and keeps assignment separate from posting receipt. Main missing stages include cost allocations, campaigns and opportunity creation/stage progression, inventory serial tracking and corrections, Shopify catalog synchronization, fulfillments/returns, job failures/retry and conflict handling. Localized explanations are present, but matching captions are only enabled for labels verified in Learn in English and Swedish; other locales must not be counted as runtime caption coverage yet.

## Implementation progress — 2026-09-29 (continued)

Contact & Marketing now also covers creating a segment record separately from populating it, adding contacts with explicit filters, and refining versus reducing membership. The explanations emphasize that the same filter has opposite effects in Refine Contacts and Reduce Contacts, that the resulting members need review before outreach, and that built-in Business Central segments differ from Dynamics 365 Sales CRM segments. Sources: `marketing-how-create-segment`, `marketing-add-contact-segment`, and `marketing-segments` in English and Swedish. The campaign-card explanation now separates campaign creation, its audience segment, campaign pricing/discounts and interaction recording; remaining campaign workflow variants are still a gap.

Inventory work already present in `bc-inventory` covers physical-count calculation, counted quantity, posting, and transfer orders. The transfer explanation now identifies Ship versus Receive, transit/direct transfer behavior, location/route and warehouse setup, preservation of serial/lot identity, and the pre-receipt undo boundary. `bc-inventory-tracking` covers serial/lot assignment and reclassification. Broader inventory setup, reservations, costing adjustments, and exceptions remain open.

Shopify follow-up now covers creating sales documents from imported orders, syncing products, and syncing shipments back to Shopify, alongside the previously covered order and inventory synchronization. The extension's direction and mapping settings, duplicate/processing state, and distinction between fulfillment posting and external sync must still be checked against the tenant; returns, payouts, retries and conflicts remain uncovered.

Quality Management now includes the earlier template/test-definition/manual inspection, purchase receipt-triggered and scheduled inspection generation, processing/finishing purchase inspections, vendor return and lot control workflow scenarios. It remains incomplete: broader nonconformance/disposition, production/assembly/warehouse scenarios, workflow variants and recovery paths need more coverage and tenant evidence. Cost Accounting remains only partially covered; its cost-center/object setup, allocations, transfer/post details and exception/reporting scenarios remain a priority.

Cost Accounting now additionally covers creating cost centers and cost objects and posting cost journal lines. The rules explain the distinction between where costs arise and what bears them, the requirement that each cost entry use a cost type plus either a center or an object, and that a cost journal does not itself post to the G/L. Cost type setup and mappings, recurrence, budget allocation/reporting and correction scenarios still need more coverage.

Inventory now additionally distinguishes direct item reclassification (locations/bins/dimensions/tracking) from transfer orders (ship/receive, transit and route planning), with preview and ledger-entry follow-up. The basic stock/count/transfer procedures and tracking assignment/reclassification have usable explanations, but item setup, reservation/availability, cost adjustment and exception/recovery branches remain open.

Validation after these increments: 27 enabled packs, 218 task rules and 900 sources, no warnings (`npm run knowledge:validate`). The roadmap inventory and priority list remain gap-based: thin coverage means missing evidence/data, not that a module is complete. Caption matching is constrained to confirmed page/action labels; localized explanation text alone does not imply localized match coverage.

Service Management follow-up: `bc-services` now distinguishes converting an accepted service quote into an order from creating a fresh order, with the quote deletion, reset statuses, and resource reallocation consequences explained. Existing create-order and post-order scenarios now include customer/service-item context, prerequisites, posting choices, test-report checks, ledger/document results and posting-policy caveats. A focused runtime test covers the new conversion match in English and Swedish and rejects unrelated order pages. Service contracts, service item lifecycle, availability/reservation, dispatch, warranty, invoice/credit and correction paths still need fuller scenario coverage.

Focused validation: `tests/service-context-knowledge.test.js` passes and `npm run knowledge:validate` passes at 219 rules / 900 sources with no warnings. The broader `tests/bc-knowledge-expansion.test.js` is stale relative to current `BCExpansion` rules/fixtures (it expects 36 where 37 currently exist), so its failure is recorded separately and is not evidence of a Service Management rule defect.

Quality Management remains incomplete: templates, test definitions, copying, manual inspection creation and filtered scheduling are covered. Result recording, pass/fail processing, lot controls, dispositions, workflows, and recovery still need evidence and rules. The overall roadmap is still in progress across every area in the inventory table; these initial increments do not close the plan.

The new scenario increments are recorded in `src/knowledge-packs/cost-accounting.json` and `src/knowledge-packs/contact-marketing.json`. Microsoft Learn's cost-budget and opportunity articles were checked in English and Swedish; only those verified page/action captions are matched at runtime. No runtime captions in the other six locales are implied by the translated explanations. Quality Management now also includes source-backed vendor purchase return from a failed inspection, lot blocking/unblocking workflow responses, and finishing a purchase receipt inspection. The explanations distinguish result from status, mention permission boundaries, and state that creating a return does not mean it was posted. Exact page/action matches are restricted to documented English and Swedish captions.

Fixed Assets follow-up: the `Finance.PostFixedAssetJournal` explanation now states the business outcome for acquisition and disposal in English and Swedish: acquisition updates book value and may update G/L, disposal value affects gain/loss, disposal must be the final asset entry, partial disposal requires splitting first, and acquisition corrections use the fixed-asset correction procedure rather than Reverse Transactions. Fixed-asset creation, assisted acquisition, reclassification, maintenance, insurance, impairment, separately matched disposal actions, and fuller localized caption evidence remain open.

Quality Management follow-up: added `QualityManagement.CreateInspectionResult`, backed by Microsoft's result-configuration article and localized into all supported explanation languages. It separates a result code (category, evaluation order, finish permission) from the test/template conditions that classify measurements, and flags that result settings may drive document-specific lot blocking. Runtime matching is limited to the documented English page/action (`Quality Inspection Results` / `New`); a dedicated test now validates localized explanations and rejects unrelated page/action contexts. Quality results remain incomplete for the Swedish tenant caption, tenant extension/version, result-condition editing, and the production, assembly, warehouse and recovery branches listed above.

Subscription Billing follow-up: the three recurring-billing scenarios now explain proposal eligibility and Next Billing Date effects, one-line-per-period behavior, refreshing changed proposal lines, invoice-versus-credit memo determination, grouping by contract/partner/recipient, optional posting, and the difference between Billing to Date and posting date. English and Swedish were expanded against the current Microsoft Learn article; a focused test verifies those contexts and prevents false matches on purchase/sales invoice pages. Other localized explanations and automation, contract setup, deferrals, errors and vendor-specific scenarios remain thin and need evidence.

Latest validation: 27 enabled packs, 220 task rules and 901 sources, no warnings (`npm run knowledge:validate`). Focused Quality Management and Subscription Billing context tests pass.

E-Documents and HR follow-up: E-Document explanations now distinguish exported files from sent status, detail communication/mapping-log investigation and retry after correction, and clarify incoming purchase document type/mapping, optional existing purchase-order linking, duplicate handling, and the fact that document creation is not posting. Human Resources explanations frame New as an employee master record, separate absence registration from approval/payroll/time-sheet processes, and describe employee-template effects and review. Bank reconciliation explanations now separate statement import, suggested matching, manual links, difference resolution and reconciliation posting; they also call out the bank statement ending balance and zero-difference check. Focused tests cover English/Swedish context matches and neighboring-page boundaries. 27 packs / 220 rules / 901 sources still validate with no warnings. Remaining thin areas include e-document automation and supplier exceptions, full HR lifecycle, payment application versus bank reconciliation variants, and verified tenant captions/configuration.

Intercompany follow-up: the inbox/outbox scenarios now explain that transaction-file import is on-premises only, that accepting an inbox line creates local documents or journal lines for separate review/posting, how rejected/returned lines go back to the partner, how to recreate a handled inbox transaction if its accepted document was deleted before posting, and that cancelling an outbox line does not reverse its source posting. These explanations are available in all eight registered languages; exact runtime page/action context is checked in English and Swedish only. `tests/intercompany-context-knowledge.test.js` verifies all-language content, the English/Swedish inbox/outbox matches, and a boundary against purchase-order creation. The broader Intercompany gap remains open: partner/card setup, mapping of accounts/dimensions/items, consolidation, automatic acceptance/sending setup, and tenant-specific recovery/captions still need evidence and scenarios.

Quality Management production follow-up: added a separate `QualityManagement.PostProductionOutputWithInspection` explanation for posting from Output Journal or Production Journal. It states the setup and generation-rule conditions for automatic inspection creation, the production item/lot/routing/output context, the source link back to production order and operation, the separate measurement/finish work, and the Premium experience requirement. English and Swedish captions are matched; explanation text covers all eight languages. Sources are Microsoft's production-output quality article in English and Swedish. A focused test covers both journal pages, wrong actions and neighboring purchasing/warehouse contexts. QMS is still not complete: inspection result entry, production/assembly/warehouse inspection variants, reinspection, disposition failure and partial-post recovery, and verified tenant extension version/captions remain gaps.

Intercompany and QMS follow-up validation: `npm run knowledge:validate` reports 27 packs, 221 rules and 903 sources with no warnings. The focused Intercompany, QMS, source-integrity and generated-build checks pass. These increments do not complete the cross-module roadmap; thin rule coverage remains evidence of missing scenario data as instructed.

Contact & Marketing source coverage follow-up: `CloseSalesOpportunity` now references localized Microsoft Learn pages for all eight supported locales, and the segment creation/add/refine rules now link the localized article routes checked for the six previously missing locales. This supplies citation provenance; localized explanation text still does not imply that runtime captions are verified outside English/Swedish. The broad `knowledge-explanation-coverage` test now advances past Contact & Marketing and reports a separate Cost Accounting source-locale issue: several source records have locale suffixes in IDs while their URLs still point to the default English route, and some rules have only English/Swedish references. This cross-pack source-locale audit remains open.

## Continued execution — 2026-09-29

Contact & Marketing now distinguishes updating a sales opportunity's cycle stage from closing it. The new explanation covers Next/Previous, permitted Skip/Jump and information-only Update, and states that the action neither closes the opportunity nor creates a quote/order. Runtime matching is restricted to the verified English and Swedish Opportunity List → Update captions; the existing Close action remains separate.

Cost Accounting now has a distinct `CalculateAllocationKey` explanation in addition to running the allocation. It covers source/target, level, validity and filtering checks; differentiates fixed-ratio bases from dynamic measures; and states that calculating shares does not itself move costs. Runtime labels are matched only for verified English and Swedish captions. This extends the allocation lifecycle while leaving broader recurrence, budget allocation/reporting and exception paths open.

Quality Management now has a distinct manual-inspection-from-source-line scenario. The explanation retains whether the source is a purchase or production order, says that document/item context follows the selected line, and separates inspection creation from measurement entry and the final decision. Matching is limited to the verified English and Swedish Learn captions; unrelated Post actions and template-based creation are explicitly tested as non-matches. This is one more covered action, not closure of the Quality or cross-module lifecycle audit.

Sustainability now distinguishes creating an account category (scope, tracked metrics, and calculation foundation) from creating a subcategory (factor source and emission/intensity values used by calculations). The journal pack also covers collecting custom amounts from filtered posted G/L entries before posting, with account/date/dimension context and the absolute-value behavior stated explicitly. Purchase document lines now explain supplier-provided CO2/CH4/N2O values, the setup prerequisite, the non-multiplication by quantity, supported line types, pre-posting statistics, and per-line ledger entries. Runtime captions are limited to verified English and Swedish Learn labels; account assignment, recurring journals, corrections, reporting, and tenant/version variation remain open.

The baseline inventory and P0 descriptions above have been updated to reflect the packs that now exist: 27 enabled packs, 24 with task rules, and 232 rules total. Coverage remains partial, not complete.

- Inventory and item tracking now cite verified Microsoft Learn routes for the tracking article and the transfer/reclassification article in all eight locales. The item-reclassification posting rule has caption evidence only in English and Swedish; its explanations cover all eight locales. The tracking reclassification explanation now states the whole-lot/single-line requirement when only the expiration date changes, the shared-date requirement when merging lots, and that a blank new expiration date clears it. It keeps information-card edits separate from changing tracking identity and quantity. A stale expansion test was updated to distinguish explanation languages from verified runtime-caption locales, and covers posting in English and Swedish.
- Quality Management sources now link localized routes for manual inspection, failed-test handling, lot blocking, purchase-receipt inspection, setup, scheduled inspection, results and production-output articles wherever the Learn routes were verified. Route gaps are recorded in `sourceLocaleGaps`; no Finnish or other unavailable route is fabricated. Purchase-receipt inspection generation is a conditional side effect of posting, not a distinct user action, so its explanation is attached to the contextual `Purchase.Post` explanation rather than competing with it for the same Post button.
- Service Management's accepted-quote conversion rule now links all eight localized routes for Microsoft's service-order article. Shopify order, inventory and item synchronization now link their verified routes in all eight locales.
- Cost Accounting's localized source paths have been corrected, and source records were added for the other verified locale routes. The Contact & Marketing localized-source additions remain in place. `tests/knowledge-explanation-coverage.test.js` now permits a missing route only when the pack records that exact source/locale gap, while continuing to require all eight localized explanations.

Validation after the latest Sustainability additions: `npm run knowledge:validate` reports 27 packs, 233 rules, 253 objects, 497 concepts, 312 aliases and 1,081 sources with no warnings. `npm run test:knowledge-mcp`, `npm run build`, and `npm run check` pass. Remaining work is substantial: complete each module's lifecycle coverage, confirm captions and extension versions against the tenant, gather absent workflow data, and continue the module-by-module exception/recovery audit.


Tracking reclassification follow-up: Microsoft Learn documents several easy-to-miss date and quantity constraints that were missing from the prior explanation. These are now stated in all eight localized explanations. Runtime captions remain intentionally unclaimed for the tracking-lines action because the tenant-specific dialog/action labels are not independently verified. The parent journal Post rule remains separate.

Contact & Marketing now has a separate CreateCampaign explanation for Campaigns → New. It states that campaign status codes are a prerequisite, distinguishes the campaign card from its audience segment, places campaign prices/discounts before activation, and separates campaign setup from recording interactions or sending communications. It links all eight localized Learn routes, while runtime caption matching remains limited to verified English and Swedish. Campaign processing/activation details, campaign-specific activities and tenant behavior remain open.

Intercompany now has SetupAccountsAndDimensions, a dedicated explanation for the shared account/dimension structure and reciprocal mappings. It distinguishes creating the common baseline from each partner's mapping work, notes that a synchronization partner supplies a baseline without completing mappings, and separates cross-environment authentication prerequisites from routine setup. The English and Swedish page/action labels are verified against Microsoft Learn. Partner registration, item/customer/vendor links, automated exchange and consolidation remain open.

Electronic Documents now has MatchPurchaseOrderLines for incoming supplier e-invoices. It explains manual/automatic matching, the criteria and amount/quantity checks, mismatch and tolerance handling, removal/reset of incorrect matches, and that applying the match updates the purchase document without posting it. It links all eight localized purchase-process Learn routes, with runtime caption matching limited to verified English and Swedish. Other document types and tenant/provider behavior remain open.

Electronic Documents also distinguishes UpdatePurchaseOrderLink from line matching. This covers automatic links derived from the incoming order number, correction only before line matching, the unlinked/error case, and vendor setup that creates a new order when none exists; it states that relinking neither matches lines nor posts. The labels are verified in Learn for English and Swedish only. Tenant/provider variations and other purchase document types remain open.

Human Resources now distinguishes employee-specific absence-by-category analysis from the combined category and period overviews on the absence registration list. The explanations guide filters and matrix display while stating that these views summarize previously recorded absences rather than creating, approving, or changing them. Runtime matches are limited to verified English and Swedish captions; payroll and broader employee lifecycle coverage remain open pending tenant evidence.

## Aptean portal increment — 2026-09-30

The Aptean Food & Beverage pack now cites the vendor portal for Aptean Quality Control and adds contextual explanations for ad-hoc QC check creation, inventory-trigger setup, scheduling inventory inspections, and creating a linked non-conformance from a posted QC check. These rules are localized across all eight registered document languages. The ad-hoc rule requires an identified supported source page; `New` alone remains insufficient. The Non Conformances action is explicitly conditional on that extension being installed. Sources were accessed 2026-09-30.

Portal review also identified separate add-on areas requiring their own lifecycle evidence: Aptean Quality Control, Non Conformances, Shop Floor Production, Commodity Harvest Planning, Trade Management, Grower Return, E-Commerce, EDI, Pack & Ship, AIP Connector, TLX Integration Connector and EAM Connector. Their inclusion in the portal/release highlights does not establish that a tenant has these apps installed. In particular, July 2026 features are bundle-dependent. Current scenario coverage remains partial; continue module-by-module source gathering and verify app versions, page captions, setup and exception/recovery flows against customer environments.

## Continued execution — Avvikelser, Claims och Inspection Status — 2026-09-30

The Aptean pack now has source-backed explanations for three additional concrete workflows, localized in all eight registered document languages:

- **Customer Non-Conformance → follow-up.** `Customer Non-Conformances` → `New` explains recording a customer/consumer issue, category, item and quantity, source-document context and root cause. It says the new record remains open, does not create a return/credit/corrective action, and only depends on Teams when synchronization is configured. Source: [Customer Non-Conformance](https://erpdocs.apteancloud.com/bc/docs/NCF/customer-non-conformance/).
- **Posted Sales Claim → Purchase Claim.** The exact `Posted Sales Claim` → `Create Purchase Claim` action retains the link to the posted sales claim. The explanation states that this creates the claim record only; it does not release or post related documents. Source: [Purchase Claims](https://erpdocs.apteancloud.com/bc/docs/CLA/purchase-claims/).
- **Purchase Claim create/post boundary.** `Purchase Claims` → `New` explains source receipt, vendor, item/location/original-quantity context and line-level Credit/Return. `Purchase Claim` → `Release & Create` is separated from `Release & Create & Post`; the latter warns that posting finalizes the record and calls out the documented Warehouse Management limitation. Same source as above.
- **Lot Inspection Status.** `Lot No. Information List` → `Change Inspection Status` and the corresponding worksheet actions now explain target lots, reason code, generated alerts/audit entries, inventory/drop-shipment limits, and the fact that status change is not measurement or proof of QC pass. `Inspection Status Change Worksheet` → `Generate Lines` requires a filter and warns that selecting all filtered lines or deleting existing lines changes the scope of later work. Source: [Change inspection status code](https://erpdocs.apteancloud.com/bc/docs/ISS/change-inspection-status-code/).

The generic Aptean `CreateClaim` matcher was narrowed to the documented posted-sales-claim context. An unqualified `Create Claim` action or `New` without its identified page receives no Aptean claim explanation. Runtime matching uses only English captions documented by Aptean; no Swedish UI captions are inferred. Explanations are translated, but tenant-specific caption parity remains open.

Validation after this increment: `npm run knowledge:validate` reports 27 enabled packs, 247 rules, 253 objects, 518 concepts, 312 aliases and 1,101 sources, with no warnings. `node tests/knowledge-explanation-coverage.test.js` passes, including positive matches for each action and negative boundaries for generic claim creation and standard purchase-order `New`. The rest of the roadmap remains open, especially vendor/internal non-conformance, claim release exceptions, hold/disposition setup, production quality, lot/traceability exceptions, mobile warehouse and the portal-only add-on modules.


## Continued execution — Aptean scenario context and module expansion — 2026-09-30

The Aptean Food & Beverage pack now covers contextual, source-backed scenarios in Quality Control, Non Conformances/Claims, Inspection Status, Shop Floor Production, Grower Return, Trade Management, Pack and Ship, EDI, AIP and TLx. Every new explanation is localized in all eight supported document languages and requires its documented page/action context.

Added workflows:

- Shop Floor Production: production-order Inputs > + Input registers component consumption; Correct Consumption reduces a prior registration; Outputs > + Output registers output. Explanations distinguish final routing operations (inventory and capacity) from intermediate operations (capacity only), and distinguish SFP from SFPBC documentation.
- Grower Return: Settlements > Post creates and posts a purchase invoice and makes the settlement immutable; the explanation contrasts Create Invoice and Update Purchase Order.
- Trade Management: Trade Statements > Create Trade Statement describes date/partner filtering and the Payment-versus-Invoice date basis. It warns that Suggest Trade Statement Lines replaces existing lines and edits.
- Aptean Pack and Ship: Sales Packaging > Pack All assigns packages but does not post a shipment; Shipping Batch > Post opens Post Packages and posts inventory reductions. Carrier integration is kept distinct.
- Aptean EDI: EDI Messages > Process distinguishes inbound document creation and outbound transmission; failed messages require manual processing after correction, since the job queue processes pending messages. XML replacement is identified as testing/troubleshooting only.
- Aptean Integration Platform: AIP Connection Setup > Process Events distinguishes inbound, outbound and combined processing, with separate event subscriptions, audit log and retry configuration.
- Aptean Total Logistix (TLx): order > Send to TLx depends on shipment method/setup and external status. Reopening a released sales order can cancel its TLx shipment; edits may not be resubmitted automatically when TLx status is not Open.

The audit removed three uncited, broad Aptean rules for opening generic QC checks, SFP and claims. The generic Aptean lot/batch, catch-weight and quality-hold explanations were also removed earlier in this run because they matched without adequate product/page context. The Aptean QC `New` rule no longer treats a generic `New` on the QC checks list as sufficient evidence of an ad-hoc check. This follows the coverage principle: when an exact screen/action cannot be tied to source, withhold the explanation and record a data gap instead of guessing.

Current validation: `npm run knowledge:validate` reports 27 packs, 247 rules, 253 objects, 518 concepts, 312 aliases and 1,101 sources with no warnings. The contextual explanation test passes with 236 sourced rules/observed workflow explanations across eight locales. The full `npm run test:knowledge-mcp` suite passes.

Remaining Aptean coverage is still substantial and must be treated as missing scenario data: Quality Control action plans/fail actions, plan/question/target setup, edit/reopen/correction lifecycle, photos/readings, recurring-trigger setup, quality hold/disposition setup and release, complete Claim lifecycle including return/credit creation and posting/reopen, vendor/internal non-conformance, full inspection-status/disposition effects, SFP order start/pause/stop/failure and shop-floor setup, Grower Return calculation detail and recovery, Commodity Harvest Planning order/forecast/receipt flows, Trade Management plans/accrual/recalculation/issue, Pack and Ship partial package/warehouse/carrier exceptions, EDI port/mapping/message-type-specific behavior, AIP product/event mapping and failed-event recovery, TLx updates/cancel/retry/freight costs, and tenant-specific version/caption verification. EAM Connector and other portal-listed integrations lack enough product workflow evidence so far and remain separate data-gathering tracks; no tenant installation is inferred from portal availability.


### Quality Control execution coverage — 2026-09-30

Added sourced explanations for recording an Answer on a Quality Control Check line and posting a Quality Control Action. The first describes per-question target evaluation, required general/sample answers, required comments, and the blind-target “Done” behavior; it does not claim the entire check passes or gets posted. The second explains the In Progress and all-visible-lines-complete preconditions and the read-only posted record. Both match only their documented page and field/action, are localized in eight languages and have negative context-boundary tests.

Sources: [Manage quality check lines](https://erpdocs.apteancloud.com/bc/docs/QCA/manage-quality-check-lines/) and [Post the quality action](https://erpdocs.apteancloud.com/bc/docs/QCA/post-the-quality-action/). The wider Quality Control gaps remain: fail-triggered action plans, plan/question setup, target interpretation, edit/reopen/correction lifecycle, photos and readings, recurring inventory trigger setup, and tenant/version behavior. These require additional page and workflow evidence before explaining observed steps.


### Harvest Planning and claim decisions — 2026-09-30

Added localized, source-backed explanations for creating a Harvest Order, creating a purchase order from a Week Forecast, and selecting Action Type on a Purchase Claim. They distinguish a planning record from a purchasing/receipt transaction, respect closed-forecast behavior, and explain the Credit/Return consequences and return quantity/reason requirements. Exact page/action or field context is required.

Sources: [Commodity Harvest Planning user guide](https://erpdocs.apteancloud.com/bc/docs/CHP/print), [Create a week forecast](https://erpdocs.apteancloud.com/bc/docs/CHP/create-a-week-forecast/), and [Purchase claims](https://erpdocs.apteancloud.com/bc/docs/CLA/purchase-claims/). Open gaps remain in harvest planning approval/import/receipt variants and claims setup, partial-lot return handling, and warehouse-management posting recovery.


Current knowledge validation after the latest additions: 27 packs, 264 rules, 253 objects, 544 concepts, 312 aliases and 1,140 sources; no warnings. The full knowledge suite passes with 254 sourced rules/observed workflow explanations across eight locales. The generated extension build also passes.


Additional Commodity Harvest Planning coverage: Harvest Order > Create Day Forecast and Forecast Approval Worksheet > Create Purchase Order now have separate localized, source-backed explanations and page/action boundary tests.


Inventory Tracking received two source-backed workflows: Item Tracing > Trace and Find Entries > Find. Explanations distinguish the applied posted transaction chain from all current open/posted occurrences, including the caveat that repeated receipts of a lot may not all appear in tracing. Locale text is provided in eight languages; the source pages were verified in English and Swedish, with other source-language gaps recorded explicitly.


Harvest follow-up steps now distinguish Commodity Receipt creation (commodity-item lines only, one receipt per commodity item) from purchase-contract creation (requires the separately installed Contract Management extension). Both are localized and tested against wrong-page/entity contexts.


### EAM Connector evidence gap — 2026-09-30

The available Marketplace listing confirms the connector exchanges assets, work orders, costs and inventory and describes configurable mappings, API communication and monitoring, but it does not document the user-facing Business Central steps, transaction lifecycle, errors or retry actions. Search of Aptean ERP documentation and AppCentral documentation did not locate a connector-specific BC workflow guide. Treat those scenario details as missing data; do not infer them from the feature summary. [Marketplace listing](https://marketplace.microsoft.com/en-us/product/web-apps/pubid.foodware365%7Caid.eam%7Cpappid.2ddcf228-c6fc-426f-820c-ed7a309209f6).


### Assembly policy context — 2026-09-30

Added a field-specific explanation for **Item Card → Assembly Policy**. It explains the business-context difference between Assemble-to-Stock (build ahead, hold finished inventory) and Assemble-to-Order (create a one-to-one linked assembly order from sales demand, with BOM components/resources that can be customized). It also explains supported mixed stock/order scenarios and directs the reader to confirm the selected policy before interpreting later assembly steps.

Runtime captions are restricted to verified English and Swedish; the explanation is localized in all eight registered languages. Seven localized Microsoft Learn routes were accessed. The Finnish Learn route could not be fetched and remains recorded as a sourceLocaleGap; its translated explanation is present, but Finnish source evidence is not independently verified. Wrong-page boundary checks and positive runtime matching for English/Swedish are covered in the BC expansion test.

Source: [Understanding Assemble to Order and Assemble to Stock](https://learn.microsoft.com/en-us/dynamics365/business-central/assembly-assemble-to-order-or-assemble-to-stock).


### Approval user setup context — 2026-09-30

Added **Approval User Setup → New** with the prerequisite sequence and operational controls: configure approver before requester, distinguish sales/purchase/request limits, configure substitute and notifications, test the row, and avoid configuring the same user as requester and approver in a workflow group because requests can be approved automatically. The explanation distinguishes this setup record from creating/enabling the workflow. Runtime captions are verified for English and Swedish. Localized explanation text covers all eight document languages; remaining six source-localized routes are recorded as evidence gaps.

Source: [Set up approval users](https://learn.microsoft.com/en-us/dynamics365/business-central/across-how-to-set-up-approval-users).


### Manual subscription contract lines — 2026-09-30

Added an explanation for selecting **Type** on a new line in a customer or vendor subscription contract. It covers the Item/G/L Account paths, required billing and calculation fields, when the linked subscription is created, missing-field behavior, and the delete/type-change consequences. It also explains that a negative quantity is a deliberate credit path and should use an end date that limits billing to one occurrence.

The explanation is localized in all eight document languages. Runtime caption matching is limited to verified English contract-page and field labels; the other seven localized runtime captions and source routes remain evidence gaps. The wrong-page boundary is tested. Source: [Manually create contract lines](https://learn.microsoft.com/en-us/dynamics365/business-central/srb/working-with-contracts/manual-contract-lines).


### Microsoft 365 action context — 2026-09-30

The existing five Microsoft 365 explanations distinguish read-only **Open in Excel** export from **Edit in Excel**, where supported changes can be published back under permissions and validation. They also explain that **Share to Teams** prepares a page link/card whose preview may be visible to all conversation participants, **Open in OneDrive** copies and opens a file in the work/school account, and installing the Outlook add-in connects it to the Business Central environment used for installation. Added page/action tests for each operation and wrong-page boundaries for Excel, Teams and OneDrive matching.

Still missing: the Contact Insights and Document View workflows inside Outlook; sending/opening/attaching Business Central documents from email; Word integration; Dataverse/Power Platform flows; and integration failures such as absent permissions, unavailable add-ins, sharing restrictions and synchronization/retry states. These require scenario-level evidence rather than extrapolation from the integration overview. Sources: [Excel integration](https://learn.microsoft.com/en-us/dynamics365/business-central/across-work-with-excel), [Teams integration](https://learn.microsoft.com/en-us/dynamics365/business-central/across-working-with-teams), [OneDrive integration](https://learn.microsoft.com/en-us/dynamics365/business-central/across-onedrive-overview), and [Business Central add-in for Outlook](https://learn.microsoft.com/en-us/dynamics365/business-central/admin-outlook).


### Quality inspection navigation from purchase orders — 2026-09-30

Added **Purchase Order → Show Inspections for Item and Document**. The explanation tells the user to confirm item, lot and quantity, especially when one receipt creates an inspection per lot. It distinguishes opening the linked inspection from posting the receipt or finishing the quality inspection, and suggests checking generation rules and display settings when no inspection appears. Runtime captions are verified in English and Swedish; the explanation is available in all eight languages, with unverified source locales explicitly recorded.

The new page/action boundaries and source provenance are tested in the Quality Management test. Current validation is reported in the current validation block above.

Quality Management now also explains three manual responses directly from a failed inspection: **Move Inventory** (choose whole or partial quantity and quarantine destination), **Create Negative Adjustment** (remove selected stock, with an optional review before posting), and **Change Item Tracking** (correct lot/serial/package or expiry data while retaining the inspection link). Runtime page/action captions are verified in English and Swedish; all eight explanations are localized and source-locale gaps are explicit. Negative boundaries prevent these actions from matching ordinary purchase, journal, item-tracking and template contexts. Further quality gaps include internal put-away and transfer actions, result entry/editing, reinspection and recovery. Source: [Process items that failed a quality inspection](https://learn.microsoft.com/en-us/dynamics365/business-central/qms-non-compliant-processing).

### Context improvements — 2026-09-30

Clarified **Open in OneDrive** in all eight locales: the action copies and opens the selected file in the work/school OneDrive Business Central folder; sharing is a separate operation and requires recipient/permission review. Expanded **Quality Inspection Templates → Copy Template** so operators review template code/description, tests, measurements or attributes, sample size, pass/fail limits and generation behavior. Existing inspection records and results are not copied. Both improvements are sourced and covered by locale and context tests.

Expanded approval actions across all eight locales to explain request assignment, document/amount review, reasons for rejection, substitute routing, pending state and cancellation effects. Send and cancel rules now match supported purchase/sales document pages only; regression tests cover the supported pages and reject unrelated item/journal pages.

Expanded bank-statement import and automatic/manual matching explanations across the six shorter locales, preserving the distinction between importing lines, matching, resolving missing entries and posting. Physical-inventory count/post explanations now call out item/location/tracking context and the real stock adjustment. Tests check locale coverage and that standard warehouse-inventory posting does not get captured by the physical-inventory journal explanation. Validation: 27 packs, 264 rules, 253 objects, 544 concepts, 312 aliases, 1,140 sources, zero warnings; 254 sourced workflows across eight locales pass the full knowledge suite and build.


### Warehouse purchase receipt and Quality Management — 2026-09-30

Expanded the standard warehouse workflow in all eight supported languages. **Purchase Order → Create Warehouse Receipt** now explains the order and warehouse context, transferred quantities, lot assignments and bins, and makes clear that creating the document does not post the receipt or trigger inspection. **Warehouse Receipt → Post Receipt** explains the separate posting step and the conditional Microsoft Quality Management effects: when the extension and a matching generation rule are active, posting can create an inspection per tracked lot linked to the purchase order, plus a put-away document; lot blocking can prevent movement until inspection passes. Added locale-specific Microsoft Learn source records and tests for all eight locales and the boundary against ordinary purchase-order posting. Tenant installation/version and local captions remain unverified. The exact extension trigger/conditions should be confirmed against the tenant before treating these conditional side effects as observed in that environment.

### Assembly output and Quality Management — 2026-09-30

Extended the existing localized **Assembly Order → Post** explanation rather than adding a competing Quality Management posting rule. It now checks component availability/substitutions, quantities, location and tracking, and explains that an inspection is conditional on the extension, the **When Output is posted** assembly trigger and a matching generation rule. It preserves the separation between posting and entering/finishing inspection results. It also calls out that a linked assemble-to-order output cannot be posted directly from its linked assembly order; the sales shipment is the posting path. All eight explanation locales and the distinct page/action match are covered by the Quality Management test. The Microsoft Learn English source was verified; localized route records and captions remain unverified in-language and are marked as such.

### Cost budget register deletion — 2026-09-30

Added **Cost Budget Register → Delete Cost Budget Entries** with the verified batch-job semantics: deletion runs from the selected starting register through the last register, the final register cannot be changed, and an isolated middle range cannot be deleted because it would leave gaps. The explanation recommends closing registers when deletion should be prevented and distinguishes cost-budget entries from actual cost entries and G/L budgets. The Microsoft Learn article was verified in English; the explanation is localized across eight languages, while seven unverified source locales are recorded as gaps. Broader cost type/mapping, allocation, budget distribution and reporting coverage remains open.


### E-Document communication diagnostics — 2026-09-30

Expanded **E-Document → Communication Logs** in all eight explanation languages. The explanation separates document status from service status, explains that Exported means a file was created while Sent means it was transmitted to the provider, points to mapping logs and XML export for diagnosis, and states that opening logs does not resend or recreate a document. It directs the user to correct the cause before retrying from the E-Document page.


### HR action context — 2026-09-30

Expanded **Absence Registration → New** and **Employee Card → Apply Template** to the same level in all eight languages. Absence registration now describes the employee, cause, dates, quantity/unit, consistent hour/day units for useful statistics, and the boundary between HR reporting and leave approval, payroll or timesheets. Template application now makes clear which selected employee records receive predefined data and that users should review fields because templates can fill or replace data; applying a template does not create an employee or a payroll record. Microsoft Learn supports these HR workflows: [Manage employee absence](https://learn.microsoft.com/en-us/dynamics365/business-central/hr-how-manage-absence) and [Register employees](https://learn.microsoft.com/en-us/dynamics365/business-central/hr-how-register-employees).
