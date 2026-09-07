# Changelog

## 2026-09-07 - Make-to-stock and make-to-order maps

- Added separate production maps for forecast/stock-driven and sales-order-driven demand.
- Both variants retain their actual demand source before showing the shared consumption, output, and finishing lifecycle.
- Added Swedish process names and regression coverage for the distinct starting documents.

## 2026-09-07 - Production execution variant maps

- Added separate maps for production consumption and production output.
- Added warehouse-pick and warehouse-put-away production variants with explicit document and action relationships.
- Added Swedish analysis labels and regression coverage for all four production execution maps.

## 2026-09-07 - Distinct warehouse inbound process maps

- Split inbound warehouse semantics into Warehouse Receipt, Warehouse Put-away, and Advanced Warehouse Inbound maps.
- Added stable concepts for source-document retrieval, warehouse-receipt posting, and put-away creation.
- Added the posted warehouse receipt to the reusable diagram document catalog and Swedish map labels.

## 2026-09-07 - Warehouse-pick sales process map

- Added the missing Sales Order with Warehouse Pick reference map between basic shipment and advanced warehouse variants.
- The map preserves the observed sales-order creation, release, shipment, pick, registration, and posting sequence.
- Added dataset regression coverage for the warehouse-pick document mapping.

## 2026-09-07 - Dedicated item-tracking process maps

- Added separate Business Central maps for lot tracking, serial tracking, and expiration-date handling.
- Added stable semantic concepts for lot numbers, serial numbers, expiration dates, and posting tracked transactions.
- Added Swedish process-map labels and dataset regression coverage for all three variants.

## 2026-09-07 - Conditional reference branches no longer count as missing

- Process comparison now separates unchosen conditional routes from genuinely missing steps.
- Similarity coverage is calculated against the applicable branch instead of penalizing a recording for alternatives it did not take.
- Added regression coverage for planning recommendations that create purchase, production, or transfer orders.

## Add core Business Central variant maps

- Add separate verified maps for Purchase Receipt and Invoice, Assembly to Order, and Drop Shipment.
- Represent editable and posted purchase documents, cross-domain document creation, and posting actions with their semantic node types.
- Prevent these variants from falling back to visually similar but semantically different standard-process diagrams.

## Distinguish Business Central Order Planning

- Add Microsoft page 5522 and source table 246 as the canonical Order Planning worksheet.
- Keep Order Planning distinct from Planning Worksheet and Requisition Worksheet despite their shared requisition-line source.
- Add a localized reference map from unfulfilled demand through review to creation of a supply order.

## Recognize and map the Business Central requisition worksheet

- Add Microsoft page 291 and source table 246 as the canonical Requisition Worksheet used for purchase and transfer planning.
- Classify the worksheet in Forecast to Plan and distinguish it from page 293, which is only the worksheet-template list.
- Add a Swedish `Inköpsförslag` reference map through calculation, review, and execution of action messages.

## Recognize and map Business Central demand forecasts

- Add Demand Forecast Overview, Demand Forecasts, and Demand Forecast Entries using Microsoft page IDs 2901, 99000921, and 99000922.
- Classify these views in Forecast to Plan and connect demand entry and review to planning calculation.
- Add a localized reference diagram with document and manual-action shapes for GUI and export.

## Add a branched planning process map

- Model the Planning Worksheet as a decision flow that branches to purchase, production, or transfer supply orders.
- Preserve the conditional-branch topology and labels in the renderer-neutral reference graph for both GUI and export.
- Use distinct decision, manual-review, and system-action node types so themes can render different shapes and colors.

## Add a production-order lifecycle map

- Add a verified Make-to-Stock diagram from Planned through Firm Planned and Released to Finished Production Order.
- Preserve production status changes as process steps and the finished order as a posted-document shape.
- Add Swedish labels for every production status transition in interactive maps and exports.

## Expand canonical inventory reference diagrams

- Add verified semantic diagrams for Inventory Movement, Warehouse Movement, Item Tracking, Item Reclassification, and Physical Inventory.
- Preserve document, posting, and manual-count node types so interactive maps and SVG exports use the intended shapes and colors.
- Expand the reference dataset from 14 to 19 representative Business Central diagrams.

## Normalize customized Business Central list identities

- Resolve plural and view-suffixed metadata such as `PurchaseOrders`, `SalesOrderList`, and `InventoryPicksPage` to their canonical documents.
- Keep matching deterministic and identity-based while supporting naming conventions commonly used by Business Central list extensions.

## Recognize customized Business Central document views

- Match stable Business Central `entity`, `recordType`, and `documentType` identities when a customized card or list uses a page ID outside the canonical Microsoft registry.
- Normalize compact identities such as `PurchaseOrder` against canonical names without relying on visible screen text.
- Ignore generic page types such as `document` and require one unambiguous semantic document match.

## Close process-classification gaps for canonical BC views

- Associate Sales Quotes and posted Sales Invoices with the Order-to-Cash process family.
- Associate posted Purchase Invoices and posted Warehouse Receipts with their correct purchase and warehouse process families.
- Associate planned, firm-planned, released, journal, and finished production views with the production process family.
- Verify every canonically owned Business Central view selects its declared business domain from page identity alone.

## Complete Swedish labels for canonical process maps

- Translate every action and document node currently used by the canonical reference-diagram library.
- Cover planning, production, assembly, transfers, returns, warehouse picking, and put-away instead of falling back to English.
- Add an automated completeness check so new reference nodes cannot silently appear untranslated in Swedish maps or exports.

## Recognize legacy Business Central views from recorded URLs

- Recover the canonical Business Central page identity from `page=` in recorded frame and top URLs when an older recording lacks structured page metadata.
- Apply the same page-to-document registry to every card, list, worksheet, journal, and posted view rather than special-casing Purchase Orders page 9307.
- Preserve explainability by identifying URL-derived page evidence separately from directly captured page metadata.

## Guarantee recognition for every canonical Business Central view

- Exercise every registered Business Central card, list, worksheet, journal, and posted view through the recognition engine.
- Prevent page IDs from silently being assigned to two different semantic documents.
- Require every canonical document to retain at least one stable Business Central page identity, including legacy recordings that contain only a page ID.

## Recognize return and basic-warehouse document lifecycles

- Model sales and purchase returns as related orders, receipts or shipments, credit memos, and posted credit memos.
- Model Inventory Pick and Inventory Put-away as Business Central activities that produce their posted documents.
- Make the lifecycle knowledge reusable by recognition and process-map generation without adding UI-specific rules.

## Preserve posting semantics across diagram levels

- Recognize both English `Post` and Swedish `Bokför` captions as posting nodes in recorded user procedures.
- Generate document-posting relationships when a process transitions into a posted Business Central document.
- Keep manual, system, and decision recognition based on the combined technical identity and visible caption.

## Preserve semantic node shapes in generated maps

- Recording-derived BC process maps now render posted documents as `postedDocument` nodes instead of ordinary documents.
- Explicit manual actions, system actions, decisions, and posting actions retain their semantic node type through GUI and export projection.
- Node typing is derived from the taxonomy and semantic metadata rather than display text alone.

## Reference maps for returns and basic warehousing

- Added renderer-independent reference graphs for sales returns, purchase returns, inventory picks, and inventory put-aways.
- The new graphs preserve document, posting, and posted-document node types for clearer process-map shapes and colors.
- Added stable bilingual document and action concepts so matching does not depend on displayed English text.

## Basic warehouse document recognition

- Added distinct canonical documents for Business Central Inventory Picks and Inventory Put-aways, including their list, card, and posted views.
- Added basic inbound and outbound warehouse processes so these documents no longer fall into advanced warehouse handling or generic movement flows.
- Added Swedish process-map labels for active and posted basic warehouse documents.

## Complete return document recognition

- Added canonical Business Central card and list identities for posted return receipts, posted return shipments, sales and purchase credit memos, and their posted documents.
- Sales and purchase return processes now retain their full observed document chain after the return order instead of collapsing later pages into unknown steps.
- Added Swedish process-map labels for all new return and credit-memo document types.

## Canonical warehouse and production views

- Corrected Business Central page `7340`: it is the posted warehouse shipment list, not a warehouse put-away.
- Added verified card/list/worksheet identities for warehouse receipts, warehouse put-aways, posted warehouse receipts, posted warehouse shipments, and planned, firm-planned, and finished production orders.
- Separated posted warehouse shipments from posted sales shipments so recordings and process maps retain the document the user actually opened.

## 4.7.0 - Preserve posting semantics in process maps

- Comparison-based process maps now distinguish posted Business Central documents from editable documents.
- Posting actions now use the dedicated posting node type instead of a generic process-step rectangle.
- The semantic node classification is renderer-independent, so interactive maps and SVG exports consume the same shapes and tones.

## 4.7.0 - Add inventory responsibility to process maps

- Added a distinct Inventory responsibility lane for item journals, item tracking, reclassification, physical inventory, and inventory movements.
- Added theme-aware inventory colours across Business Central, Neutral, and Monochrome process-map themes.
- Kept warehouse documents in the Warehouse lane and added localized Inventory/Lagerstyrning lane labels for interactive and exported diagrams.

## 4.7.0 - Centralize canonical document domain ownership

- Moved Business Central document-to-domain ownership into the Process Taxonomy instead of maintaining separate recognition and reference-matching tables.
- Process recognition and reference comparison now consume the same `primaryDomainId` semantic metadata.
- Added validation for invalid domain references and regression coverage proving inventory recordings suppress unrelated reference alternatives.

## 4.7.0 - Localize expanded process-map taxonomy

- Added Swedish process-map labels for returns, inventory and warehouse movements, item tracking, financial journals, and inventory journals.
- Added localized step labels so interactive maps and SVG exports do not mix English actions into Swedish diagrams.
- Kept canonical taxonomy IDs and English exports unchanged.

## 4.7.0 - Recognize financial and inventory journals

- Added canonical page identities and process classifications for General Journals, Item Journals, Item Reclassification Journals, and Physical Inventory Journals.
- Journal pages now anchor recordings to Record to Report or Inventory to Deliver before generic actions such as Post are evaluated.
- Added Swedish aliases and regression coverage for page-, process-, and domain-level classification.

## 4.7.0 - Recognize returns, movements, and item tracking

- Added canonical document and list identities for sales returns, purchase returns, inventory movements, warehouse movements, and item tracking lines.
- Added deterministic process classifications for those domains so recordings no longer fall back to unrelated sales, purchasing, or transfer processes.
- Corrected warehouse pick identity: page `5779` is the document, `9313` is its list, and `7345` remains the separate Pick Worksheet view.
- Added Swedish document aliases and cross-domain recognition regression coverage.

## 4.7.0 - Recognize canonical Business Central page families

- Added reusable page-view identities so canonical documents can distinguish document, list, worksheet, activity, and posted views without coupling taxonomy data to the UI.
- Added representative list and card mappings across sales, purchasing, warehouse outbound, transfers, production, assembly, and posted documents.
- Corrected page `5742` to identify the Transfer Orders list instead of a posted transfer shipment, and retained legacy `pageIds` compatibility.
- Recognition explanations now state which kind of Business Central view supplied the document evidence.

## 4.7.0 - Recognize the Purchase Orders list

- Added the standard Business Central Purchase Orders list page (`9307`) to the canonical Purchase Order document identity.
- Short legacy recordings can now be classified as Source to Pay before the Purchase Order card is opened.
- Added regression protection preventing a list-only purchase recording from producing transfer alternatives.

## 4.7.0 - Mark evidence-derived process nodes as observed

- Process nodes inferred from strong recorded Business Central metadata now carry the explicit `observed` semantic status.
- Interactive maps and SVG exports can distinguish recorded evidence from suggestions while preserving node-type shapes and colours.
- Boundary nodes and manually authored semantic classifications remain unaffected.

## 4.7.0 - Localize process-map lanes

- Applied canonical localization to swimlane headers, phase/subtask context, and selected-node details.
- SVG exports now use the same localized lane owner names as the interactive map.
- Removed remaining mixed-language `Purchase to Pay` labels from Swedish process diagrams.

## 4.7.0 - Localize Business Central process levels

- Added Swedish map labels for the canonical sales, purchase, warehouse, transfer, production, assembly, and planning business processes.
- Recognition-generated business-level maps now show `Inköp till betalning` instead of `Purchase to Pay` in Swedish documents.
- Kept the underlying taxonomy identifiers and canonical English names unchanged.

## 4.7.0 - Separate process identity from reference completion

- Process matching now reports observed-evidence precision separately from reference-process coverage.
- A partial recording whose observed documents and actions all agree can be confidently identified while still showing low reference coverage.
- Strong page and action identity now makes incomplete recordings reviewable, without marking them automatically complete.

## 4.7.0 - Consistent process-map labels

- Applied the shared localized node title to process cards, the minimap, and the selected-node detail panel.
- Removed mixed-language titles when navigating recognition-generated Business Central maps.
- Kept accessible minimap labels consistent with the visible process diagram.

## 4.7.0 - Localize canonical process-map names

- Swedish process maps now translate canonical Business Central document names as well as taxonomy IDs.
- Recognition-generated legacy maps therefore display `Inköpsorder → Frisläpp` instead of mixed English and Swedish terminology.
- Applied the same localization path to interactive maps and SVG diagram exports.

## 4.7.0 - Build semantic maps from observed legacy evidence

- Multi-level process graphs now fall back to strong observed Business Central metadata when explicit semantic classifications are absent.
- Older recordings can immediately show useful Business Process and BC Process maps after reopening.
- The fallback adds only documents and actions that were actually observed; missing or optional reference steps remain excluded.

## 4.7.0 - Repair previously canonicalized legacy evidence

- Added a non-mutating read migration for schema-v1 recordings created before legacy identity restoration was fixed.
- Recovers missing canonical identification from the preserved immutable raw event when documents are reopened.
- Existing saved documents therefore receive improved process recognition without requiring a new recording.

## 4.7.0 - Restore semantic evidence from legacy recordings

- Fixed legacy recording migration so captured Business Central page, table, document, and action identity remains active canonical evidence.
- Older exported recordings now benefit from deterministic metadata-based process recognition instead of falling back mainly to captions.
- Added an end-to-end regression proving a migrated purchase recording remains in the Source to Pay domain.

## 4.7.0 - Explain action context in process analysis

- Process-recognition evidence now retains action qualifiers such as shipment, receipt, invoice, and pick.
- The process-analysis explanation displays localized action context, making generic actions such as posting auditable by consultants.
- Kept qualifiers in the semantic analysis layer without exposing technical identifiers in the process map.

## 4.7.0 - Context-aware Business Central actions

- Added deterministic action qualifiers for shipment, receipt, invoice, pick, put-away, assembly, consumption, output, and transfer operations.
- Prevented a specific action such as `Post Shipment` from matching an unrelated generic posting step such as purchase receipt or invoicing.
- Preserved generic-action fallback where Business Central does not provide a more specific action identity.

## 4.7.0 - Complete process-map terminology

- Added Swedish and English display names for every seeded Business Central document used in process maps.
- Added Swedish process-map labels for shipping, picking, registering, consumption, output, and transfer actions.
- Prevented internal taxonomy identifiers such as `document:purchase-order` from leaking into either language's diagram presentation.

## 4.7.0 - Process recognition confusion corpus

- Added deterministic cross-domain recognition coverage for sales, purchase, warehouse inbound/outbound, transfer, production, assembly, and planning recordings.
- Added regression protection ensuring strong purchase metadata cannot be displaced by generic shipment actions or leak transfer alternatives.
- Added an explicit partial-recording assertion so incomplete processes remain reviewable rather than being presented as fully recognized.

## 4.7.0 - Ordered business action matching

- Reference matching now evaluates Business Central actions in their observed order.
- The same actions in a conflicting sequence no longer receive the same score as the canonical process route.
- Added structured action-order conflict diagnostics while preserving customer-specific actions as valid deviations.

## 4.7.0 - Specific Business Central action matching

- Stopped generic verbs such as Create, Post, and Register from matching more specific warehouse actions.
- Specific actions such as Post Receipt and Register Put-away now require corresponding observed evidence.
- Reduced false confidence within the correct domain without weakening exact action matches.

## 4.7.0 - Relevant process alternatives

- Removed cross-domain and negligible-confidence candidates from user-facing alternative process choices.
- Preserved the number of suppressed candidates for internal diagnostics.
- Hid the alternatives section entirely when no meaningful alternative remains.

## 4.7.0 - Explainable process match percentages

- Added observed-step fit and reference-process coverage to the process-analysis evidence panel.
- Localized both measures in Swedish and English.
- Kept the detailed measures progressively disclosed under "Why this assessment?" to avoid cluttering the primary workflow.

## 4.7.0 - Partial process confidence calibration

- Split graph matching into observed precision and reference-process coverage.
- A correct partial recording can now be recognized strongly without being presented as a complete process.
- Exposed both measures as structured match details for process-analysis UX and diagnostics.

## 4.7.0 - Topology-aware process matching

- Process similarity now includes semantic edge endpoints, relationship types, and route direction.
- Diagrams containing the same nodes in a different order no longer receive an exact match.
- Duplicate detection now compares semantic topology instead of renderer-specific node identifiers.

## 4.7.0 - Language-independent process graph matching

- Process graphs now match nodes by stable taxonomy entity IDs before comparing visible labels.
- Swedish, English, and manually adjusted node titles can represent the same Business Central process without reducing graph confidence.
- Text matching remains available as a fallback for custom nodes that have not yet been semantically classified.

## 4.7.0 - Domain-safe graph matching

- Applied verified Business Central document domains to process-graph matching.
- Removed cross-domain graph alternatives when strong page or document metadata identifies the recording domain.
- Prevented visually or structurally similar transfer, planning, and assembly diagrams from remaining selectable for verified purchase recordings.

## 4.7.0 - Evidence-based reference matching

- Reduced the score of configuration-heavy reference processes when the recording contains only a shared opening document or generic actions.
- Advanced warehouse references now need an observed document sequence or transition before they can compete at full confidence.
- Kept advanced references available as advisory alternatives instead of treating an unrecorded configuration as an error.

## 4.7.0 - Process variant evidence

- Prevented a shared opening document, such as Purchase Order, from implying advanced warehouse handling.
- Lifecycle matching now penalizes unobserved variant-specific stages until a warehouse document or transition is actually recorded.
- Kept close warehouse configurations available as ambiguous alternatives when the recording contains only partial warehouse evidence.

## 4.7.0 - Recording guidance

- Added accessible in-recording commands for important steps, explicit screenshot
  choice, section boundaries, and ignored interactions.
- Persisted every command as traceable raw evidence linked by Canonical Event ID;
  marker events do not create duplicate documentation steps.
- Kept automatic capture as the default and added safe feedback when no step or
  screenshot is available to mark.

## Unreleased

- Redesigned SVG process-map exports with a presentation-ready title area,
  rounded responsibility lanes, numbered cards, stronger connectors, subtle
  depth, and a clear recording-based footer while retaining semantic colors,
  shapes, themes, and the underlying observed process model.
- Kept short reverse-flow rows within the SVG canvas and localized canonical
  Business Central document and action identifiers in Swedish diagram exports.
- Added compact type labels to exported process nodes so documents, process
  steps, postings, decisions, and actions remain immediately distinguishable
  alongside their semantic colors and shapes.
- Routed reverse-row sequences directly between adjacent card edges, removing
  connector detours through responsibility headers and keeping arrow direction
  immediately readable across multi-row process maps.
- Separated semantic status from node-type styling in SVG exports: documents,
  actions, postings, and decisions retain their own colors and shapes while a
  compact accessible marker communicates observed, suggested, conditional,
  reference, or customer-specific status.
- Assigned unambiguous generic actions such as Create and Release to their
  surrounding Business Central responsibility, preventing artificial
  `Other steps` lanes in both Process Overview and exported maps.
- Added theme-owned responsibility colors for Purchasing, Warehouse, Sales,
  Production, Finance, and System lanes, making cross-functional process maps
  easier to scan without encoding business meaning in the renderer.
- Applied the same theme-owned responsibility colors to the interactive Process
  Overview, keeping the on-screen map visually consistent with its SVG export.
- Centralized Business Central process-map labels so canonical document and
  action identifiers use the same localized terminology in Process Overview
  and SVG exports.
- Added true SVG shapes for documents, manual actions, data entities, and
  system actions, making node meaning distinguishable without relying on color
  and bringing exported maps closer to professional process-diagram notation.
- Added model-level Start and End boundaries to classified process maps. The
  boundaries frame the observed sequence without being counted as recorded
  steps or treated as reference suggestions.
- Made standard SVG cards grow for titles of up to four lines, improved wrapping
  of long unbroken terms, and embedded each full localized title for accessible
  inspection instead of silently clipping important Business Central wording.
- Sized adaptive SVG canvases from the columns actually used by the process and
  stopped forcing four-column exports from the dashboard, removing large empty
  areas around short lanes and structural boundaries.
- Added semantic responsibility handoffs to transitions and localized labels
  such as `Inköp → Lager` in both Process Overview and SVG exports, making
  cross-functional ownership changes explicit instead of anonymous.
- Preserved relationship types from Business Central reference graphs when
  projecting the observed map, so verified document creation and posting paths
  retain dotted `creates` and emphasized `posts` connectors instead of being
  flattened into generic sequence arrows.
- Added localized labels to non-sequential routes in SVG process exports, making
  conditions, alternatives, returns, document creation, and posting relationships
  understandable without relying on line style or the legend alone.
- Preserved the actual topology of semantic reference graphs in BC-process maps,
  so observed decisions can branch to multiple outcomes without an invented
  sequence connection between those outcomes.
- Added labels directly to non-sequential connectors in the interactive Process
  Overview, keeping conditions and alternative outcomes attached to the correct
  branch while leaving ordinary sequence arrows uncluttered.
- Added a deterministic layered layout for branched process graphs: decisions
  are centered above parallel outcomes and converged continuation steps are
  centered below them, while linear recordings retain the compact flow layout.
- Made automatic layout decisions explicit and shared across interactive and
  exported maps (`Horizontal`, `Multi-row`, `Branched`, or `Vertical`), with the
  selected strategy shown beside the Layout control in Process Overview.
- Added strong Business Central document-domain anchors to process recognition,
  preventing generic actions such as Create, Release, or Post from promoting
  incompatible Transfer, Assembly, Production, or Planning classifications when
  authoritative metadata identifies a purchase or sales recording.

- Hid reference suggestions from Process Overview and process exports by
  default, while adding an explicit `Show reference suggestions` control that
  applies consistently to both the displayed and exported process model.

- Preserved manually confirmed process classifications when an older review is
  automatically rebuilt to repair generated steps, so the selection survives
  closing and reopening the document.

- Made manually confirmed process classifications display as 100% confirmed,
  reset stale configuration variants when another reference process is chosen,
  and localized purchase documents, actions, and alternative process names in
  the Swedish Process Analysis view.

- Fixed manual process confirmation so `Confirm classification` applies the
  currently selected reference process directly, preserves its selected state,
  and reports it as manually selected after rerendering.

- Moved configuration-dependent reference steps out of the primary Process
  Analysis view into a collapsed comparison and excluded them from Process
  Overview maps, so diagrams describe the recorded work rather than possible
  Business Central configuration paths.

- Consolidated a partially typed Business Central list filter with its selected
  record, so entering `3004` and choosing item `30043` produces one step with
  the definitive item number and selection screenshot.

- Consolidated the Business Central purchase-line menu path `Rad` →
  `Tillämpat inköpspris och rabatt` → `Manuellt pris` into one traceable
  instruction and selected the resulting manual-price dialog as its screenshot.

- Fixed a new recording inheriting the previous session's screenshot count and
  live-capture diagnostics by resetting the complete persisted status snapshot
  at the recording session boundary.

- Fixed Process Overview failing with `Cannot read properties of null (reading
  'id')` when an older semantic node contains an explicitly empty process role.

- Added a semantic process-map connection editor for creating, changing, and
  removing sequence, conditional, alternative, loop, return, creation, and
  posting relationships, with optional labels and non-destructive persistence.

- Added direct drag reordering to semantic process maps, with before/after drop
  indicators, immediate autosaved preview, keyboard-equivalent editor actions,
  and shared ordering across preview, versioning, JSON, and SVG export.

- Improved automatic process-map composition with balanced serpentine rows that
  avoid isolated final nodes and long visual return jumps, while giving the
  interactive legend the same type-specific colors as its process nodes.

- Made SVG process-diagram export preserve the preview's semantic status
  styling and localized legend for observed, suggested, conditional,
  customer-specific, and reference steps, completing theme and layout parity.

- Added reversible process-map node overrides for title, visual node type,
  swimlane role, and sequence, with a Review Studio editor that preserves the
  canonical recording and feeds the same model to preview and export.

- Added automatic Business Central swimlane assignment for Purchasing,
  Warehouse, Sales, Production, Finance, System, and unassigned customer steps,
  with localized lane names in interactive and SVG diagrams.

- Added an explainable `Why this assessment?` section showing the Business
  Central documents, business actions, evidence quality, and candidate margin
  behind each deterministic process classification.

- Separated conditional lifecycle steps from possibly missing steps in Process
  Analysis, with dedicated metrics, lists, labels, and visual treatment.

- Kept Process Analysis synchronized with a manually confirmed lifecycle
  variant: its heading, guidance, missing-step metric, and step list now reflect
  the saved configuration while remaining editable.

- Added manual Business Central lifecycle-variant confirmation in Process
  Analysis; the saved choice now removes steps belonging only to other variants
  from the BC Process map.

- Added an explainable lifecycle-variant panel to Process Analysis, including
  localized Business Central configuration names and close alternatives.

- Made process assessment lifecycle-variant aware so configuration-dependent
  Business Central document steps appear as conditional rather than mandatory
  missing steps.

- Enriched recognized BC Process maps with sequence-aware document and action
  nodes, renderer-neutral node types, and contextual protection against treating
  unrelated captions such as `Registrera vikt` as warehouse registration.

- Added useful semantic maps for legacy recordings: deterministic recognition
  now publishes matched and expected document evidence, allowing Business
  Process and BC Process views to distinguish observed documents from suggested
  lifecycle steps.

- Kept Business Process and BC Process map levels selectable for legacy
  recordings and load Process Analysis on demand instead of disabling the
  controls during asynchronous analysis.

- Fixed packaged Process Overview assets omitted from `dist`, including the
  minimap and search runtimes; generated-build tests now verify every local
  dashboard script dependency.

- Strengthened Business Central process assessment with action-specific
  evidence, duplicate-signal suppression, document-order penalties, candidate
  margins, and explicit confidence states in Review Studio. Weak or ambiguous
  matches now request confirmation instead of presenting misleading certainty.
- Fixed legacy purchase recordings being presented as Assembly, Production, or
  Transfer processes. Verified BC documents now outrank unrelated graph matches,
  zero-step alternatives are removed, and Swedish process names are displayed.

- Added a keyboard-accessible Process Overview minimap that preserves layout
  positions and jumps directly to nodes in large diagrams.

- Added accent-insensitive Process Overview search with visible match counts,
  cyclic Enter/Next navigation, and automatic scrolling in large maps.

- Added an accessible Process Overview focus mode for inspecting large maps in
  the full browser viewport, with Escape close and focus restoration.

- Added persistent Standard and Compact process-map density modes for Review
  Studio and SVG export.

- Added a localized, content-aware process-map legend shared by Review Studio
  and SVG export, showing only node shapes and route styles used by the map.

- Added persistent Business Central, Neutral, and Monochrome process-map themes
  that apply consistently to Review Studio and exported SVG diagrams.
- Made theme differences explicit for ordinary activity-only diagrams through
  distinct node fills, backgrounds, borders, and connector contrast.

- Added persistent Automatic and Vertical process-map directions, including
  direction-aware Review rendering, connectors, and SVG diagram export.

- Replaced the legacy single-row process SVG with a deterministic multi-row
  exporter that preserves semantic node shapes, relationship styles,
  swimlanes, route labels, and observed state changes.

- Added independent Process Overview zoom, reset, and fit-to-width controls with
  local preference persistence, localized tooltips, bounded scaling, and
  connector realignment.

- Added an SVG process connector renderer with orthogonal row/swimlane paths,
  return paths, conditional and alternative line styles, arrow markers, and a
  safe CSS fallback when browser geometry is unavailable.

- Added renderer-neutral process swimlanes derived from existing phases and
  semantic process roles, with uncluttered fallback behavior for recordings
  that have no grouping metadata.

- Added visible conditional, alternative, return, creation, and posting routes
  to process maps through a renderer-neutral route grammar, including localized
  route labels and screen-reader summaries.

- Added a renderer-neutral process-map visual grammar with localized semantic
  labels and distinct treatments for business processes, documents, posted
  documents, posting, decisions, system actions, manual actions, and states.

- Added a renderer-neutral adaptive ProcessGraph layout that wraps long process
  maps into readable rows, emits edge route intent, and responds to available
  Review Studio width without changing process semantics.

- Added multi-level semantic Process Overview maps for Business Process, BC
  Process and User Procedure with observed, suggested and customer-specific
  nodes.

- Exposed reference-process matching in Review Studio through a Process Analysis
  toolbar action, confidence badge, semantic comparison and manual confirmation.

- Added a Reference Diagram Dataset Pipeline for source-traceable Business
  Central semantic graphs, verification, comparison and future AI datasets.
- Added Training, Validation, Evaluation and GeneralReference partitions,
  provenance-aware curation, semantic duplicate detection and versioned export.

- Added a 35-pattern Business Central Reference Process Library with immutable
  extension support and advisory recording similarity results containing best,
  alternative, matched, missing, and unexpected process steps.

- Added configurable Business Central document lifecycle knowledge for Sales,
  Purchase, Production, and Transfer flows, including optional warehouse paths,
  lifecycle variants, document states, and recognition signal integration.

- Added renderer-neutral multi-level ProcessGraph generation for Business
  Process, Business Central Process, and recorded User Procedure views, with
  stable cross-level expansion and full Canonical Event traceability.

- Added a deterministic Business Central Process Recognition Engine with
  metadata-first entity/action extraction, partial taxonomy sequence matching,
  confidence scoring, explainable alternatives, variant recognition, and a
  bounded future-AI extension contract.

- Extended Canonical Recording with optional Business Central semantic
  classifications, multi-event Process Step mappings, document-state
  transitions, confidence/provenance metadata, and auditable manual overrides.
  Existing recordings and immutable raw evidence remain compatible.

- Added an extensible, renderer-neutral Business Central process taxonomy with
  five-level hierarchy, canonical relationships and variants, immutable lookup
  and traversal services, recording classification references, and seed data
  for eight representative BC process families across twelve core domains.

- Fixed the Change Image dialog's screenshot scrollbar by bounding the complete
  dialog to the viewport and assigning all remaining height to one stable,
  vertically scrollable gallery.

- Aligned each Review Step's Edit, approval and overflow controls on one
  vertical center line. The approval checkbox and label now behave as a
  centered control group without drifting in tall cards. The overflow trigger
  now uses the same 32-pixel height as Edit.

- Refined Document Library card alignment by matching the document title to
  the checkbox baseline and raising the favourite control to the card's top edge.

- Promoted Document Information from `More actions` to the main Review toolbar,
  keeping document language and expected result directly accessible while
  reviewing steps.

- Fixed screenshot queue coalescing so every captured event keeps an addressable
  image in Review. The Change Image gallery no longer loses later candidates
  when nearby interactions safely share one physical browser capture.

- Moved Document Information out of the permanent Review canvas and into a
  header `More actions` menu item. Document language and expected result now
  open in a focused dialog while retaining autosave and reset behaviour.

- Fixed Reset Structure treating two missing Step IDs as an identity match,
  which could copy one instruction override onto every Step. Overrides now
  require a real shared identity and must belong to the Step they modify.

- Moved all Change Image dialog actions above the screenshot gallery. Only the
  gallery now scrolls, keeping Capture, Cancel and Apply continuously available,
  and corrected headings that could display `step null`.

- Prevented Reset Structure from erasing Review steps when an older or migrated
  review contains an empty generated-task baseline. Existing steps are now
  retained while the invalid structural overrides are cleared.
- Reset Structure now removes structural visibility overrides separately from
  content edits and enforces that a previously visible Review cannot resolve to
  zero visible steps.

- Fixed the Step action menu immediately closing after its ellipsis trigger was
  selected. Automatic closing now applies only to commands inside the menu.

- Replaced the Step ellipsis disclosure's browser-dependent summary handling
  with an explicit button and menu state, restoring reliable opening and
  second-click closing in Edge.

- Tooltips now append any declared keyboard shortcut after the action text,
  using compact key names and readable separators between alternatives.

- Fixed Step action menus so clicking the ellipsis button a second time closes
  the menu reliably. Only one Step menu remains open, and its expanded
  accessibility state now follows the visible state.

- Added shared localized tooltips across Dashboard, Review Studio, recorder,
  diagnostics and technical reports. Buttons and menu summaries now expose
  concise help on hover and keyboard focus, with viewport-aware positioning,
  Escape dismissal and forced-colour support.

- Fixed the recorder popup collapsing to a narrow column after responsive
  hardening. The extension surface now establishes a stable 390-pixel layout
  width while retaining vertical reflow for short browser windows.

- Completed a responsive and accessibility hardening pass across Dashboard,
  Review Studio, Document Library and recorder dialogs. Added correct viewport
  scaling, reflowing navigation/toolbars, coarse-pointer targets, enhanced and
  forced-colour support, long-text wrapping and short-window dialog scrolling.

- Improved the recorder popup and completion flow. The stop dialog has more
  space and unambiguous continue/save/delete actions; completed process
  recordings can now open their exact Review directly instead of requiring a
  second lookup in the Document Library.

- Simplified the Document Library around search and sort, moving secondary
  filters into one disclosure with an active-filter count and one-click reset.
  Cards now present metadata, tags, recency and the open action in a more
  compact, consistent reading order.

- Made the Process Overview compact and review-aware. Nodes now show concise
  review status, keep state and route evidence in one shared detail panel, and
  automatically follow the active Review Step without changing process data.

- Added a prominent Next unreviewed action to Review Studio. It follows the
  visible Step order, wraps deterministically, focuses the selected card and is
  available through Alt+N with accessible remaining-count feedback.

- Harmonized Review Step spacing, typography and state colors. Review-needed
  and approved cards now use restrained edge accents plus visible text badges;
  selection uses the product focus color, and reversible Hide is no longer
  presented as a destructive red action.

- Simplified every Review Step card to keep editing and approval prominent while
  grouping move, add, image, reset, hide and compact actions under an accessible
  More actions menu. Technical confidence and provenance are now progressively
  disclosed instead of occupying the normal reading flow.

- Simplified Review Studio by removing manual Section/Subtask creation, reset
  actions and the separate hierarchy editor. Missing content is added directly
  after the relevant Step; existing stored hierarchy remains compatible.

- Added an executable privacy-bounded product pilot validation gate for 24–30
  real Business Central recordings. It verifies coverage and reconciled counts,
  rejects unsafe workbook fields, and reports transparent KPI numerators,
  denominators and values without inventing a product baseline.

- Added immutable Process Model checkpoints and a read-only visual comparison
  in Review Studio. Consultants can compare saved versions with each other or
  with the current process; duplicate semantic snapshots are ignored and the
  Document Library receives summary metadata only.

- Added local export of the validated Process Model as deterministic JSON and
  of the visible process semantics as an accessible standalone SVG diagram.
  Diagram export includes decisions, route labels and observed state changes
  while excluding raw evidence identifiers.

- Added safe selective regeneration for selected Review Steps with an explicit
  preview, exact one-to-one mapping requirement, stale-preview protection and
  reversible generated-state history. Unselected Steps are unchanged and
  structural changes across the selection boundary are blocked.

- Added versioned, local-only correction feedback derived from active Review
  history. The signal contains categories and counts only, excludes document
  content and customer data, respects undo/redo, and never applies automatic
  learning or document changes.

- Projected verified observed results and observed errors as traceable,
  system-derived Step callouts through Semantic Document, Document Workspace,
  and Word. Expected results remain a separate human-owned document field;
  generated result labels and sentences now follow the selected UI/document
  language without translating observed Business Central captions.

- Expanded State Observation to retain every independently identified field,
  selection and toggle change within one Capture Packet instead of only one
  control pair. Added privacy-bounded status/error outcome facts, deterministic
  coverage metadata, readable boolean state values and integrity validation for
  the complete observation.

- Added a collapsible, accessible Process Overview to Review Studio, projected
  directly from Process Model activities and observed state transitions. Its
  activities navigate to stable Review steps, mirror current selection and
  support arrow, Home and End keyboard navigation. The overview now presents
  the ordered flow as a directed horizontal diagram, preserves phase and
  subtask context, scales through horizontal scrolling and shows details for
  the selected activity.

- Added explicit decision and alternate-route visualization to Process Overview.
  Consultant-defined decision nodes now use a distinct decision treatment,
  break the misleading linear connector, and expose each recorded label,
  condition, transition type and destination without inferring missing paths.

- Promoted documentation hierarchy, structural overrides, Process Model,
  Process Versioning and recording regeneration tests into the mandatory CI
  release gate.

- Consolidated a field entry followed by its redundant sorted-record selection
  into one instruction while retaining the later, clearer result screenshot.

- Improved the recorder naming dialog with a wider responsive layout, full-width
  language selection and clearer spacing between its form fields and actions.

- Simplified BC Knowledge Base by removing the low-value document-health filter,
  health summary and confirmation list from document cards. Health metadata is
  preserved internally for compatibility and diagnostics.

- Fixed the BC Knowledge Base document-language filter disappearing when UI localization replaced its containing label.

- Fixed Review image replacement so the Review card immediately renders the
  same authoritative `selectedScreenshotAssetId` as Document Workspace and
  export. Original candidates are used only as a safe fallback when the selected
  recording asset is unavailable.
- Enabled safe Review regeneration with consultant-edited instructions,
  formatting, comments, and Step-owned Notes when canonical evidence provides a
  unique one-to-one Step mapping. Preview 1.2.0 shows the number of preserved
  edits; generated wording remains a separate baseline. Approvals, ambiguous
  mappings, structure, manual Steps, and Annotations remain conservatively
  blocked.
- Added Screenshot Role Intent 1.0.0 and Screenshot Selection 1.4.0. The
  completed semantic action now determines whether the most useful evidence is
  a visible selection, committed result, action, or pre-close dialog. Verified
  actions prefer their result, lookup selections prefer the visible choice, and
  manual/annotated evidence remains authoritative. Legacy groups retain their
  existing non-strict ranking.
- Projected directly observed Capture Packet differences into immutable Process
  Model state transitions. Each change is tied to the activity and exact Step/
  Event evidence that caused it; repeated evidence is deduplicated, while
  partial, unchanged, or inferred state never becomes a transition. Process
  Model validation rejects incomplete or orphaned state transitions.
- Consolidated a complete Search/Tell Me flow with its immediately repeated
  search-field entry. The redundant step is removed while its value and source
  evidence enrich the retained search instruction; result screenshots remain
  preferred. Untouched older Reviews refresh automatically, while consultant-
  owned structure remains unchanged.
- Added immutable State Observation 1.0.0 to Capture Packet 1.6.0. Directly
  observed page, control-value, toggle, and dialog facts now form traceable
  before/after snapshots and exact differences without inferring missing state
  or business meaning. Capture Packet Integrity 1.1.0 validates their ownership.
- Added an exact Interaction to Result correctness corpus covering ten causal
  scenarios and eleven packets. CI now rejects wrong result ownership, outcome
  order, verification status, primary-event selection, screenshot ownership,
  and late outcomes incorrectly attached to a newer interaction.
- Added a versioned Capture Validation Suite that runs sanitized standard BC,
  React/Control Add-in, iframe, multi-interaction, and legacy recordings through
  production grouping and Capture Packet integrity contracts in CI. The gate
  reports deterministic coverage and fails on lost or duplicated traceability.
- Refined Capture Packet ordering validation so a committed field value may
  legitimately represent both the interaction and its observed result, while
  separate action/result evidence remains strictly ordered.
- Added Capture Packet Integrity 1.0.0 as a shared runtime and CI validation
  boundary for interaction identity, event ownership/order, screenshot evidence,
  result traceability, and completeness. Validation reports immutable structured
  diagnostics and never repairs Canonical evidence.
- Protected regeneration against stale previews with a deterministic complete-
  Review fingerprint. If the Review changes after comparison but before apply,
  regeneration now aborts without mutating or overwriting the newer state.
- Added privacy-bounded verification of accessible Business Central status and
  confirmation messages. They now complete the initiating Capture Packet and
  trigger a transient result screenshot without copying message text into the
  generated document model.
- Bound in-recording guidance commands to stable recorder interaction identity,
  preventing React and Control Add-in support events from moving an important,
  image, section, or ignore marker to the wrong Step Group. Canonical Event ID
  targeting remains available for historical recordings.
- Extended automatic Control Add-in capture activation to observable ARIA
  surfaces such as switches, trees, sliders, and comboboxes even when a custom
  React application exposes no MUI class or proprietary add-in marker.
- Fixed Document Library startup after an extension update when an already-open
  dashboard still has older filter markup. Missing optional controls now use
  safe defaults instead of stopping library rendering.
- Centralized UI and document language registration so another fully translated language can be added without changing each consumer. Swedish and English remain active.
- Added persistent recorder interaction identity from pointer, keyboard, and field actions through Canonical Recording, normalization, Step Group capture packets, and observed outcomes. Historical recordings retain deterministic compatibility grouping.
- Stabilized Capture Packets across React/control-add-in framework noise, added explicit interaction/result/supporting evidence roles, preferred verified-result screenshots over later transient captures, and preserved packet identity through Semantic Actions and Review tasks.
- Connected Screenshot Selection to Capture Packet evidence so a verified result
  image wins over the initiating or later supporting capture. Manual image choices,
  annotations, and historical recordings remain authoritative and compatible.

- Added an explicit Swedish/English document-language choice to the recording
  naming dialog. The choice follows process Reviews and Technical Bug Reports,
  while Canonical raw events remain unchanged.
- Added `SV`/`EN` badges and a document-language filter to BC Knowledge Base.
  Historical process documents remain Swedish and historical technical reports
  retain their English compatibility behavior.
- Localized generated Technical Bug Report section headings and local
  text/Markdown export according to the selected report language.

- Added an independent Swedish/English document-language setting with a
  per-Review override. Generated headings, standard text, statuses, instruction
  grammar, Document Generator output, and Word now use one shared localization
  stage while observed Business Central labels and consultant-authored text are
  preserved. Existing Reviews remain Swedish.

- Added the first localization foundation for BC Process Studio with a persisted
  Swedish/English interface-language setting, deterministic Swedish fallback,
  and shared translations used by the dashboard and recorder popup shell.
- Extended Swedish/English switching across the recorder popup, Document
  Library, BC Review Studio, BC Document Generator, and their primary dialogs
  while explicitly preserving recorded and generated document content.
- Localized technical-report controls, recorder failure guidance, the sanitized
  debug panel, and dynamic Review Studio accessibility labels without altering
  raw diagnostics, evidence, AL call stacks, telemetry, or user-authored text.
- Added a compact `SV`/`EN` language switch to the recorder popup header,
  with immediate UI updates and persistence across the complete application.
- Added **Byt bild** in BC Review Studio: consultants can choose any
  screenshot from the recording or capture a fresh supplementary BC screenshot
  without replaying the complete process. Repairs are traceable, reversible,
  annotation-safe, and leave raw recording events unchanged.

- Replaced the one-line regeneration confirmation with an accessible safe
  preview that lists added, removed, changed, merged, split, and screenshot-
  changed Steps. Blocked previews explain why and cannot be applied.

- Added deterministic interaction-result verification for navigation, dialogs,
  changed values, selections, toggles, and Business Central errors. Review
  Studio shows the observed outcome while preserving raw evidence and leaving
  the editable expected-result text untouched.

- Added an automatic, deterministic capture-surface mode for React, Material UI,
  nested control add-ins, and observable ARIA controls while preserving the
  existing standard Business Central capture path and raw-event traceability.

- Added versioned screenshot capture roles for menu, selection, result, action,
  and dialog states. Screenshot Selection now reports the selected role and
  deterministically prefers the state that best explains each Step Group.

- Processinspelningar erbjuder nu direkt efter namngivning och sparning ett val
  att öppna Dokumentbiblioteket eller stanna kvar.

- Added immutable capture packets to Step Grouping so matching control/action
  mechanics, immediate results, and screenshots travel together. Duplicate
  activations are consolidated, result captures are preferred, and unknown
  framework mechanics remain traceable without creating *Utför uppgiften*
  placeholder steps.
- Improved screenshot clarity in Review Studio, image editing, and Document Generator by using the available workspace width and optimized Chromium downscaling while preserving the original lossless PNG assets.

- Added a persistent, minimizable recording indicator inside the active
  Business Central tab. Its coloured frame shows capture health, its panel
  reports live event/image progress, and Stop opens the existing safe naming
  flow without recording the indicator's own interactions.
- Added an accessible live recording status in the recorder popup showing the
  latest captured action, page, screenshot progress, Business Central context
  and connection state, with immediate warnings for missing events or images.
- Added the full rich-text editing toolbar to Step comments, with the same bold,
  italic, font, size, text-colour and background-colour options as instructions;
  comment formatting now flows through Document Workspace and Word export.
- Corrected Business Central company detection at recording start: observable
  company context now supplements the URL, and a company from another
  environment is never reused when the active URL omits `company`.
- Added a last-resort Review renderer that exposes the concrete runtime failure
  while restoring stored Step instructions instead of leaving a blank workspace.
- Recovered stored non-deleted Review Steps when legacy or incompatible derived
  visibility metadata would otherwise filter the entire workspace to zero;
  explicit user hide overrides remain respected.
- Reset Review Studio out of image-editing mode whenever a document opens so
  an old hidden-list state cannot conceal otherwise intact Steps.
- Kept Review steps visible when optional instruction presentation or card
  enhancement fails, with a plain-text formatting fallback instead of an empty
  workspace.
- Prevented regeneration from replacing a populated Review with an empty
  interpretation, and recover empty generated Reviews when source-derived Steps
  are available on the next open.
- Exposed safe **Regenerera frÃ¥n inspelning** in Review Studio so stored generated
  Reviews can adopt current grouping and semantic rules without a new recording.
- Absorbed an immediately duplicated `Manuellt pris` capture into the existing
  menu-path action so it remains traceable without creating a redundant step.
- Consolidated the manual-price menu path even when a React/Business Central
  surface exposes only the adjacent `Åtgärder` and `Manuellt pris` captures;
  the documented path remains `Åtgärder → Funktion → Manuellt pris` and uses
  the final focused-menu screenshot.
- Removed the redundant Knowledge Base preview sidebar so document cards use
  the full available width without duplicating selected-document metadata.
- Replaced quotation marks around Business Central interface labels with a
  cleaner italic presentation in Review Studio, Document Generator and Word.
- Reused the immutable document pipeline and its resolved presentation across
  Review Studio and Document Generator for the same content revision.
- Avoided base64 decode/re-encode cycles for unannotated screenshots when
  opening Document Generator; Word export retains its required byte conversion.
- Stopped the initial Review opening path at the shared text-presentation stage
  instead of synchronously running screenshot, planning and quality stages.
- Added an origin-aware `Restore text` action to inline comment editing; it is
  disabled until the comment differs from its generated source.
- Made resolved Semantic Document paragraph text and `presentationRuns` the
  shared default presentation for both Review Studio and Document Generator.
- Rendered Review instruction formatting through CSP-safe data attributes and
  static stylesheet rules instead of inline styles injected through HTML.
- Committed an active rich-instruction edit before opening Document Generator,
  ensuring the preview always consumes the same latest formatting as Review.
- Preserved the active rich-text range before opening formatting controls,
  restored it after applying a format, and made the toolbar report the format
  at a collapsed caret instead of treating the entire instruction as selected.
- Kept rich instruction editing active while clicking and dragging within the
  contenteditable text, so selections can be adjusted without focus returning
  to the surrounding review card.
- Made the instruction formatting toolbar report the selected text's effective
  font family and point size, and added eight-option text and highlight colour
  palettes that flow consistently through Review, Document Generator and Word.
- Brought Presentation Grammar into BC Review Studio so generated emphasis is
  visible before opening BC Document Generator, and added a directly formatted
  instruction editor for bold, italic, font family and font size with matching
  Document Generator and Word output.
- Added the observed Business Central company as an automatic, additive
  Document Library tag and introduced case-insensitive `Feld*` prefix and
  `*feld*` contains wildcard searches without requiring new recordings.
- Matched the configurable Expected Result field width to the other
  Documentation settings while retaining responsive sizing.
- Added a configurable default Expected Result under Documentation settings;
  Review Studio, Document Generator and Word use it whenever a document has no
  consultant-authored Expected Result of its own.
- Kept Image Editor step numbers synchronized with the visible Review Studio
  order after steps are hidden or removed.
- Kept Image Editor inside the same centred, responsive workbench as Review
  Studio instead of expanding it back to the full viewport width.
- Centred the responsive Review Studio workbench while retaining fluid growth
  up to its readable maximum width on large displays.
- Aligned Review Studio's header commands, including `Stäng` and
  `Fler åtgärder`, with the responsive right edge of the review cards.
- Kept screenshots at their Review Studio size when opening the image editor
  and renamed the user-facing `Annotera` action to `Redigera bild`.
- Added a responsive maximum workbench width in Review Studio so instructions,
  document fields and step actions remain visually connected on wide displays.
- Optically centred the single-letter toolbar icon at small Edge toolbar sizes.
- Made recording cancellation compatible with an older still-running Edge
  service worker by falling back to its established stop-and-delete commands.
- Added a confirmed `Avbryt inspelning` action that safely stops and removes an
  unwanted recording without generating process documentation or a Bug Report.
- Simplified the toolbar icon from `BC` to `B` and relabelled the recording-name
  dialog's continue-recording action as the clearer `Avbryt` command.
- Replaced Edge's generic monochrome extension placeholder with a coloured
  BC Process Studio icon in the browser toolbar and extension surfaces.
- Aligned Knowledge Base filter checkboxes with their labels and prevented the
  shared text-control sizing from displacing checkbox and radio controls.

## 4.7.0 — BC Process Studio

- Removed the low-value Documentation Guidance sidebar, profile selector and
  repeated health display from BC Document Generator, giving the document the
  full workspace width while retaining quality metadata in BC Knowledge Base.
- Rebased the shared application colour system on Business Central's teal,
  pale-cyan, white and neutral scale, including commands, links, focus,
  selections, annotations and workspace context states.
- Bug recordings now retain their type in BC Knowledge Base, reopen in
  Technical Report Workspace instead of process Review, show a dedicated open
  label, and provide a Close button in the report workspace.
- Suppressed empty generated `Unclassified` placeholders such as
  "Utför uppgiften." from BC Review Studio, Document Workspace and exports
  while preserving the Review, source traceability, screenshots and all
  consultant-owned steps.
- Filename variables now preserve spaces inside values; only separators written
  in the filename template appear between values.
- Split recorded Business Central context into `{environment}` and the new
  `{company}` filename variable, while preserving compatibility metadata from
  recordings created before the split.
- Fixed dashboard settings loading and Word filename precedence so the recorded
  session environment reaches `{environment}` instead of an older global value.
- Environment Name now follows the Business Central tab being recorded by using
  its observable environment path and decoded `company` URL parameter, with the
  manual value retained as fallback.
- Simplified Documentation settings to the useful Environment Name field; the
  profile and privacy values remain internal for stored-state and masking
  compatibility.
- Harmonised the dashboard, Knowledge Base, recorder popup, Review Studio,
  Document Generator preview, diagnostics and technical report workspace with a
  central Fluent-compatible, Business Central-inspired design system.
- Added semantic colour, typography, spacing, control, focus and status tokens;
  consistent document-card presentation; responsive rules; reduced-motion and
  forced-colour safeguards; and automated build/design-contract coverage.
- Renamed and repositioned the user-facing product as **BC Process Studio by Thinknine**.
- Introduced the descriptor, tagline, supporting message and canonical module vocabulary.
- Updated extension, popup, dashboard, diagnostics, installer, release metadata and restrained Word attribution.
- Preserved stable package names, extension identity, storage keys, namespaces, schema versions and the legacy `thinknine` theme ID for compatibility.
- Positioned BC Process Maps and broad BC Process AI capabilities as future areas rather than available functionality.

## Unreleased

- Recording starts immediately; the process or Bug Report is now named in an accessible dialog when Stop is selected.
- Added first-class Process Documentation and Bug Reporting start modes.
- Bug recording now creates and opens a local report automatically on Stop.
- Added non-blocking BC error-capture feedback and deterministic draft titles.
- Refined report hierarchy with prominent human context and captured errors plus progressively disclosed technical details.

## 4.6.0 - Legacy documentation opening compatibility

- Added provider-neutral Issue Package preview/offline export and explicit
  Azure DevOps/GitHub issue creation, with Entra/GitHub App credential
  boundaries, staleness and duplicate protection, selected attachments,
  optional telemetry/AI, partial-failure handling, and historical external refs.
- Added optional, explicitly consented AI-assisted Bug Report analysis through
  an Entra-protected broker, with bounded/redacted evidence, deterministic
  fingerprints, structured cited output, hallucination guards, stale analysis,
  no autonomous tools, no screenshots, and export exclusion by default.
- Added opt-in Application Insights read enrichment with Microsoft Entra PKCE,
  bounded/versioned Business Central queries, per-error correlation, partial
  failure, timeline/export integration, and no persisted confidential token.
- Added a deterministic Bug Report Generator and dedicated Technical Report
  Workspace with human-field editing, save/undo/redo, multiple-error selection,
  exact evidence, structured/raw stacks, explicit completeness checks,
  screenshots and local Markdown/plain-text output.
- Added versioned AL call-stack parsing and renderer-neutral Technical
  Diagnostics with ordered raw-frame traceability, partial/unknown preservation,
  explicit object/app summaries and safe re-parsing—without root-cause inference,
  source lookup, telemetry, external services or AI.
- Bug Recording now passively captures supported Business Central modal errors,
  exact messages, observable diagnostics, raw AL call-stack text, frame context,
  preceding-action candidates and dedicated screenshots. Multiple occurrences
  survive regeneration without clipboard, telemetry or AI access.
- Added the first Bug Recording architecture milestone: explicit recording
  purpose with documentation compatibility, a renderer-neutral versioned Bug
  Report model, evidence references, regeneration-safe human content, local
  persistence and application entry points—without a second recorder, error
  scraping, call-stack parsing, telemetry or AI.
- Defined the packaging and update architecture: Edge Add-ons/store-owned
  updates, stable extension identity, browser-owned customer storage, optional
  enterprise/offline deployment, future Chrome store parity, and no Windows
  installer until a real native component exists.
- Release ZIP generation now emits a validated channel-aware
  `release-manifest.json` with SHA-256 artifact evidence; `package.json` remains
  the product-version source and schema versions remain independent.
- Edge pilot packaging can now validate a real listing ID and generate
  checksumed submission, deployment, and enterprise-policy metadata without
  publishing, installing, or introducing a second updater.
- Controlled pilot readiness now adds a clean-tree release gate, Git commit
  traceability, independent ZIP validation, sanitized stored-state compatibility
  evidence, permission/privacy review, store material, and consultant go/no-go
  guides; browser publication and real A-to-B updates remain human actions.
- React/MUI-checkboxar bevarar nu texten från en omslutande HTML-label, så
  avmarkerade val dokumenteras med sitt synliga fältnamn i stället för
  `Okänt fält` och det tekniska värdet `false`.
- Klickbara React-rader, kort och andra sammansatta ytor identifieras nu via
  observerbar MUI-/automation-metadata eller webbläsarens pekarmarkör, även när
  komponenten saknar native knapp- eller länkmarkup.
- Namngivna React-ytor projiceras nu som spårbara `RunAction`-steg i Review och
  Semantic Document i stället för att stanna som interna passthrough-händelser.
- Vid nästlade React-klick prioriteras nu den mest informativa raden eller ytan
  framför en tom intern ikon, SVG eller `span` som ärver klickmarkören.
- Klickfångsten är nu fail-open: okänd framtida React-markup bevaras som rå
  klick-evidens i stället för att händelsen avvisas. Namngivna mål kan därefter
  klassificeras säkert i engine-lagret.
- Namngivna React-klick begär nu skärmbild i läget `important`, och deras
  instruktion använder kort lokal text från klickets event-sökväg i stället för
  texten från en hel överordnad vy.
- React-handlingar tar nu en förbild vid primär `pointerdown` och associerar den
  med efterföljande Canonical Event, så dokumentet visar kontrollen innan React
  hinner navigera till resultatvyn.
- Fixed recording-state propagation to already mounted Business Central
  control-add-in frames; all injected frames now follow durable recording state
  across start, stop, remount, and service-worker restart lifecycles.
- Added a generic capture-phase focus-session fallback for editable controls,
  with native-commit deduplication, composed-path target resolution, and
  screenshot eligibility for verified fallback commits.
- Added opt-in sanitized Frame Capture Diagnostics covering observed events,
  policy decisions, message delivery, Raw Event persistence, and Canonical append
  without recording entered values or URL query strings.
- Kept `content.js` self-sufficient when an older persistent dynamic registration
  injects it without the newly separated focus-session helper, preventing an
  early startup exception from disabling all event listeners.
- Updated the popup's manual recovery injection to load the focus-session helper
  before `content.js`, matching static and background injection paths.
- Observe supported interactions at `window` capture phase so an application
  handler above `document` cannot hide genuine React/control-add-in events.
- Added browser-owned frame inventory through the non-host `webNavigation`
  permission and corrected debug snapshot ordering so current version, time, and
  content-frame recorder state cannot be masked by stale diagnostic fields.
- Treat Business Central's `Sortera efter`/`Sort by` text as lookup state rather
  than part of a field caption, so instructions use `Nr` instead of
  `Sortera efter Nr`.
- Repair that caption in previously saved untouched generated Review steps when
  they are opened, while preserving manual steps and explicit step overrides.
- Added manual editing of the document-level expected result in Granskning,
  including autosave, undo/redo, reset to the standard text, and consistent
  output in Dokumentvy and Word.
- Preserve the expected-result override as additive Review metadata and accept
  the historical top-level field without changing generated step evidence.
- Completed the Page Identification release review across 17 representative
  standard, localized, Aptean, customer-extension, legacy, unknown, and framed
  flows through Canonical Recording, Review, Workspace, screenshots, and Word.
- Added deterministic English, Swedish, and Danish page aliases, explicit and
  traceable customer override rules, safe optional-pack loading, and mandatory
  verification evidence for future Aptean Page Object and Table IDs.
- Kept unknown pages fully usable without inventing entity, record, document, or
  table metadata; diagnostics omit entered values and unrelated URL queries.
- Removed dashboard-owned Knowledge Pack scoring in favour of the existing
  engine Knowledge Domain, leaving UI code responsible for orchestration only.
- Use the visible Business Central search-result caption without appending its
  result type (for example `FÃ¶rs.order`, not `FÃ¶rs.order Listor`) and retain the
  screenshot where that result is visible instead of the loading/navigation state.
- Recognize the trailing Business Central result-row icon when repairing existing
  automatically generated search steps.
- Refresh stale system-selected evidence on untouched generated search steps so
  the completed result list (for example `screenshots/000008.png`) replaces the
  earlier loading-state image; preserve manual selections and annotations.
- Include persisted captures associated with filtered technical events when
  choosing search-result evidence, bounded by search start and result selection.
- Include the recorded search phrase in Search and Open instructions and present
  it as a bold value while keeping Business Central labels in quotation marks.
- Preserve structured field/value roles for already consolidated item-number
  steps so values such as `30043` render bold in Document View and Word.
- Keep Review instructions visually consistent as plain editable text; value
  emphasis remains a Document View and Word presentation concern.
- Expanded Document View to fill the available review viewport and removed the
  competing fixed-height calculation that could leave half the screen unused.
- Let the document canvas shrink beside guidance without forcing a horizontal
  dialog scrollbar, and stack guidance below the document on narrow screens.
- Render entered item numbers as emphasized values in Document View and Word,
  including consolidated item-number lookup interactions.
- Use the same viewport-filling workspace for Review and Document View, with
  Review content scrolling inside the full-screen dialog.
- Fixed ZIP export after the Composition Root migration by reading the session
  graph and final business tasks from the interpreted session model.
- Restored Review as the visible initial workspace by ensuring a hidden tab
  panel cannot be displayed by its flex layout declaration.
- Prevented scrolling past the end of Document View from scrolling and
  permanently offsetting the outer full-screen dialog.
- Capped Review screenshot stages in CSS pixels so browser zoom reduces images
  proportionally instead of wider responsive cards cancelling most of the zoom.
- Added persistent 50–200 percent Review zoom controls that scale text,
  screenshots, and annotations together while preserving scroll position.
- Consolidated the evidenced `Välj rad → Relaterad information → Tillämpat
  försäljningspris och rabatt` menu path into one semantic step and select the
  final action screenshot.
- Consolidated `Åtgärder → Funktion → Manuellt pris` and explicitly prefer the
  open-submenu screenshot where `Manuellt pris` remains visible.
- Select the preceding open-dialog screenshot for `Välj Stäng` steps so the
  documented control remains visible instead of showing the post-close state.
- Fixed Document Library opening for recordings whose compatibility projection
  correctly omits empty Canonical `sourceEventIds`.
- Kept legacy evidence source-less instead of fabricating Canonical IDs, while
  making screenshot fallback tolerant of the absent optional reference level.
- Restored the isolated legacy interpreter when modern output is dominated by
  empty `Unclassified` placeholders (at least three and at least 25 percent).
- Automatically regenerate previously saved placeholder-dominated Reviews while
  preserving every Review containing consultant edits, approvals, comments, or
  manual steps.
- Corrected lookup semantics so an explicit selected row number (for example
  customer `905`) wins over earlier lookup search text (for example `iberi`).
- Capture selected row/cell values explicitly for new recordings.
- Recognize Business Central accessibility captions where `Välj posten "905"`
  is embedded after sort metadata, and safely regenerate untouched Reviews that
  previously split this into search-text and row-action steps.
- Consolidate the evidenced legacy item-number triplet (filter entry, embedded
  row action, repeated result) into `Ange 30043 i Artikel Nr` while leaving
  structured lookup selections unchanged.

## 4.6.0 - Architecture, Chromium readiness, and dogfooding baseline

- Re-established one authoritative current architecture and explicitly separated
  Canonical Recording evidence from the canonical Semantic Document domain.
- Added a static Chrome MV3/API compatibility matrix without claiming untested
  Chrome product support.
- Added a 24–30 recording dogfooding plan, operational KPI formulas, freeze-list
  guidance, and explicit not-yet-established product baselines.
- Aligned current README/release wording, package/manifest descriptions, and the
  exported `{version}` filename variable with 4.6.0.

## 4.6 - Screenshot Selection real-world validation

- Expanded the reusable corpus to 20 sanitized, real-shaped BC metadata samples,
  including vendor lookup, option field, multi-frame, annotation-preservation,
  and legacy single-screenshot coverage.
- Added the complete error-classification vocabulary and per-sample determinism
  checks without changing production selection rules.
- Added deterministic golden screenshot expectations and failure classifications.
- Corrected evidenced focus-only, before-value, and late dialog-close choices.
- Established a 14/17 baseline and verified 17/17 eligible automatic selections,
  with capture, ambiguity, and manual cases reported separately.

## 4.6 - Dashboard Composition Root

- Added a DOM-independent canonical session interpretation pipeline.
- Extracted Knowledge Pack matching, scoring, and enrichment from UI orchestration.
- Routed Review preparation and session export through the same domain pipeline.

## 4.6 - Canonical traceability migration

- Made Canonical Event IDs authoritative through normalization, grouping,
  semantic interpretation, Review, Semantic Document, Document Plan, Workspace,
  and Word export.
- Separated legacy `sourceEventNos` as `legacyEventNos` at document boundaries.
- Derived generated Review task identity from stable interpretation evidence.
- Preserved traceability through merge, split, screenshots, and annotations.

## Event → Step Grouping responsibility migration — v4.6

- Moved normalized lookup/focus/result boundaries into Step Grouping.
- Changed Semantic Rules Step Group intake to isolated structured groups.
- Preserved Customer, Item, Vendor, and Quantity interpretation regressions.
- Documented the remaining legacy-only ungrouped compatibility adapter.

## Event Normalization with React/MUI compatibility — v4.6

- Added normalization version 2.0.0 and a compact renderer-neutral taxonomy.
- Added committed typing coalescing and verified focusout value fallback.
- Added open Shadow DOM target resolution and dialog close capture.
- Added full traceability, immutability, determinism, large-recording, and CI tests.

## BC Page / Control / Action Identification — v4.6

- Centralized technical-first Page, Control, Action, and Entity identification.
- Removed primary BC caption/entity/action matching from dashboard composition.
- Added structured Swedish, English, and limited Danish caption fallback.
- Added unknown UI, frame, React/MUI, immutability, determinism, and CI coverage.

## Raw Event Persistence intake authority — v4.6

- Added durable raw intake before BC identification and Canonical Recording.
- Preserved rapid identical interactions unless `sourceEventId` is identical.
- Added explicit max-event truncation and raw-write health diagnostics.
- Added restart, multi-frame, failure, projection, and 20,000-event regressions.

## Canonical Recording Hardening & CI Safety — v4.6

- Added Canonical Recording tests to the standard `npm test` and CI lifecycle,
  with a configuration regression preventing silent removal.
- Formalized immutable input, append-only Event, stable screenshot association,
  schema compatibility, and integrity-diagnostic contracts.
- Added canonical-first screenshot dual-write ordering, bounded finalization,
  queue failure/pending diagnostics, and pre-finish legacy/canonical validation.

## Regenerate From Recording — v4.6

- Added fresh deterministic interpretation orchestration with independently
  recorded pipeline versions and stable Derived Revision fingerprints.
- Added identity/traceability reconciliation for content, screenshots,
  structure, manual information, Notes, hierarchy, and Process Overrides.
- Added structured preview, unresolved-state preservation, atomic commit/
  rollback contract, Workspace Context mapping, and bounded library guidance.

## Process Versioning — v4.6

- Added immutable complete Process Model snapshots with stable identity,
  major/minor labels, explicit parent, baseline, status, notes, and provenance.
- Added semantic fingerprints, duplicate detection, conservative identity/
  traceability matching, and deterministic node/transition/container diffs.
- Added lightweight Document Library version metadata and advisory baseline
  guidance without changing Workspace or Word output.

## Process Model — v4.6

- Added deterministic nodes, transitions, boundaries, phase/subprocess
  containers, and canonical traceability in a renderer-neutral graph.
- Added sparse manual process overrides, explicit branches, orphan preservation,
  separate process order, structured validation, and profile guidance.
- Kept existing Review, Workspace, and Word behavior unchanged.

## Sections / Subtasks — v4.6

- Added immutable Section/Subtask models and sparse Hierarchy Overrides.
- Added exactly-once Step ownership, stable move/reorder, separate recorded and
  presentation order, regeneration/orphan diagnostics, and hierarchy reset.
- Added Review hierarchy navigation/actions and shared Workspace/Word headings.

## Notes & Annotations — v4.6

- Added immutable Note ownership, types, visibility, provenance, orphan and empty diagnostics.
- Formalized screenshot-owned Annotation schema with normalized geometry, labels,
  semantic roles, visibility, provenance, and preserved future fields.
- Added highlight, numbered-callout, and text-label composition alongside rectangle/arrow.
- Integrated notes with Review history and shared semantic Workspace/Word callouts.

## Manual Information Steps — v4.6

- Added versioned manual documentation objects with explicit manual provenance.
- Added stable before/after/section anchors, deterministic unresolved-anchor
  fallback, optional screenshots, semantic callouts, and empty-content validation.
- Integrated manual create/edit/move/hide/delete/merge/split with existing Review
  history, autosave, structural resolution, Workspace, and Word.

## Hide / Merge / Split — v4.6

- Added versioned Step Structure Overrides with deterministic merge/partition IDs.
- Added adjacent-merge validation, exact split-event partition validation,
  structure reset, regeneration/orphan diagnostics, and preserved traceability.
- Integrated structure state with Review Undo/Redo, autosave, and renderer parity.

## Step Editor — v4.6

- Added sparse Step Overrides and deterministic Resolved Steps.
- Added reset, screenshot/annotation safeguards, visibility, provenance,
  orphan diagnostics, and legacy Review projection.
- Reused Review Undo/Redo, autosave, export flushing, and shared rendering.

## 4.6.0 â€” Screenshot Selection Engine

- Added deterministic schema-v1 screenshot selection results with algorithm
  version `1.0.0`, stable input fingerprints, reasons, and rejected candidates.
- Made Step Group source assets the authoritative candidate boundary and added
  primary-event, control/page, field, lookup, toggle, action, stability, profile,
  annotation, and visual-continuity metadata policies.
- Preserved manual Review choices and all conflicting annotated screenshots;
  unavailable manual choices retain the existing candidate set safely.
- Refactored Screenshot Intelligence into a document adapter over the new single
  selection owner while preserving legacy fallback and Workspace/Word parity.
- Added null-selection, duplicate, legacy, future-field, and 5,000-candidate
  performance coverage without image loading, OCR, AI, or computer vision.

## 4.6.0 â€” Event â†’ Step Grouping

- Added deterministic schema-v1 Step Groups with grouping algorithm version
  `1.0.0`, stable source-derived IDs, primary/supporting events, and diagnostics.
- Grouped same-control edit sequences and verified lookup/search/row/result
  round-trips while preserving conservative boundaries for ambiguous relations.
- Added toggle, selection, action, navigation, dialog, row, unknown, page, and
  frame-aware grouping plus ordered screenshot candidate aggregation.
- Classified focus-only and scroll-only mechanics explicitly as non-step noise;
  every other normalized event is assigned exactly once or reported unassigned.
- Added a Step Group entry point for Semantic Interaction Rules while retaining
  legacy consolidation fallback and unchanged Review/Workspace/Word behavior.

## 4.6.0 â€” Event Normalization

- Added immutable schema-v1 Normalized Interaction Events derived from canonical
  raw evidence and BC identification.
- Added deterministic activation, value, selection, toggle, keyboard,
  navigation, focus, lookup, dialog, row-selection, and unknown mechanics.
- Coalesced consecutive input/change/focusout deliveries for the same committed
  value while retaining every contributing canonical source ID.
- Added changed-value focusout fallback for standard and React/MUI inputs,
  focus-only suppression, stable IDs, canonical ordering, and frame/coordinate
  preservation.
- Exposed normalized mechanics to Semantic Interaction Rules while preserving
  legacy fallbacks and unchanged Review, Workspace, and Word behavior.

## 4.6.0 â€” BC Page / Control / Action Identification

- Added immutable schema-v1 identification linked to canonical source events.
- Captured explicit page-route IDs, technical control/action attributes,
  accessible names, state, frame context, and bounded observable UI hierarchy.
- Added conservative field, lookup, option, checkbox, action, repeater, dialog,
  FactBox, subpage, and control-add-in classification with qualitative evidence.
- Preserved localized captions separately from technical identity and retained
  honest unknown results when Business Central exposes no identifier.
- Exposed detached identification metadata to existing processing while keeping
  Review, semantic wording, Document Workspace, and Word behavior unchanged.

## 4.6.0 â€” Raw Event Persistence

- Made Canonical Recording the first durable write for newly accepted events.
- Added source-generated event identities, canonical insertion ordering, frame
  provenance, accessible target metadata, and complete raw payload retention.
- Replaced semantic-similarity deduplication with exact source-delivery
  duplicate protection so legitimate repeated interactions remain evidence.
- Added one serialized canonical writer for event append, delayed screenshot
  association, recovery-safe storage failure handling, and finalization.
- Made stop wait for accepted event and screenshot writes before establishing
  the completed-recording immutability boundary.
- Preserved legacy loading, Review behavior, semantic output, Document Workspace,
  and Word/DOCX output without migration or visible UI changes.

## 4.6.0 R3.2 — Presentation Grammar

- Added a dedicated renderer-neutral Presentation Grammar layer after Language
  Excellence and before Screenshot Intelligence.
- Standardized plain actions, quoted interface elements, bold user values and
  monospace shortcuts or technical identifiers.
- Added deterministic word order for selections, field entry, options and
  semantic checkbox actions without changing workflow meaning.
- Made Document Workspace and Word consume the same immutable presentation runs.
- Preserved legacy marker syntax, unknown future fields and old Reviews without
  migration or persistence changes.
- Added behavior, Workspace, accessibility and DOCX formatting regressions.
- Fixed batch Word export reporting a false failure after a successful download
  when its result contained a non-freezable typed image buffer.

## 4.6.0 R4 — Review Workspace Refinement

- Reduced the primary Review toolbar to Undo, Redo, Save and Word export while
  retaining structural and maintenance commands under More Actions.
- Added keyboard-aware disclosure behavior with Escape restoration, arrow-key
  toolbar navigation and explicit expanded state for assistive technology.
- Improved instruction-editor padding, line spacing, focus visibility, resize
  behavior and nearest-position scrolling.
- Moved exact annotation geometry behind progressive disclosure while retaining
  drawing, selection and deletion controls beside the image.
- Strengthened responsive, forced-colors and reduced-motion behavior without
  adding observers, polling or extra workspace rendering.
- Added R4 regression coverage for toolbar hierarchy, keyboard focus, editing,
  annotation disclosure and responsive/accessibility contracts.

## 4.6.0 R3 — Semantic Interaction Rules Engine

- Replaced isolated consolidation implementations with one immutable,
  renderer-neutral and priority-ordered rules engine after Semantic Document.
- Migrated customer, item and quantity behavior unchanged and added deterministic
  vendor, location, dimension, date, option, checkbox, generic lookup and field
  entry rules.
- Added a stable Semantic Action model preserving raw interactions, source IDs,
  event order, screenshots, annotations and unknown future metadata.
- Added conflict-safe fallback, immutable-revision caching, legacy compatibility
  and shared Document Workspace/Word pipeline integration.
- Added behavior coverage for every built-in rule, priority, fallback,
  determinism, immutability, traceability and future-field preservation.
- Suppressed focus-only field transitions and value-less selection prompts from
  visible documentation while retaining their source trace in semantic output.
- Consolidated a focus/lookup/result sequence into one generic selection and
  retained field steps only when a value was actually entered.
- Fixed recorder deduplication so input and focusout retain distinct provenance,
  and preserved non-empty legacy field values even when only focusout survived.
- Removed the technical `Sortera efter` prefix from generic lookup wording;
  list selection now reads `Välj Nr "136"`.
- Added an isolated screenshot capture policy for non-empty input/change events,
  giving entered values such as quantity 500 their own step screenshot.
- Prevented field-input screenshots from being merged with nearby action or
  different-field captures; focusout-only navigation still captures nothing.
- Aligned Document Workspace text presentation with Review and Word by rendering
  internal `**value**` emphasis as quoted text instead of visible Markdown.
- Added semantic instruction runs: manually entered values render bold, while
  field, page, report and other UI labels continue to render in quotation marks.
- Reused the shared text-format parser in Document Workspace and Word so rich
  presentation does not leak into Semantic Document or stored Review data.

## 4.6.0 — Customer-selection consolidation

- Consolidated adjacent customer field, lookup-helper, record-selection and
  resulting field-update tasks into one business instruction.
- Preferred the explicit selected customer number over masked transitional
  values and retained the final relevant screenshot.
- Preserved all source-event references while preventing unrelated record
  selections, such as item selection, from joining the customer operation.
- Added a behavior regression shaped from the observed five-step customer 1033
  sequence in the latest exported Word document.
- Consolidated the observed item lookup into `Välj artikel "136"`, suppressed
  focus-only fields after the selection and retained the next typed quantity as
  `Ange "500" i "Antal"`.
- Extracted recorder privacy masking so customer, vendor and item settings are
  respected and quantities/dates are no longer irreversibly masked at capture.

## 4.6.0 R1.1 — Dokumentbibliotek terminology

- Renamed the user-facing library entry from Documentation Excellence to
  Dokumentbibliotek while retaining Documentation Excellence as the product name.
- Updated the popup action, dashboard window title, empty state and library ARIA
  names with consistent task-oriented Swedish terminology.
- Replaced the hidden Review product heading and close label with Granskning
  terminology without changing Review behavior or internal architecture names.
- Added terminology, accessible-name, navigation and regression coverage.

## 4.6.0 R2 — Screenshot Intelligence

- Added one renderer-neutral owner for deterministic screenshot candidate
  normalization, evaluation, selection and test-accessible explanations.
- Integrated screenshot selection after Language Excellence and before Document
  Profile presentation planning, shared by Document Workspace and Word.
- Added safe precedence for manual choices and annotations, plus fallback for
  missing, incomplete, equivalent or conflicting candidate metadata.
- Added explainable rules for supported target, stability, transient state,
  dialog, resolution, source-event, near-duplicate, narrative and profile data.
- Added immutable per-revision/profile caching without image bytes, OCR, AI,
  computer vision, DOM, canvas or renderer dependencies.
- Added real-shaped recorder fixtures and behavior coverage for selection,
  compatibility, annotation integrity, caching and renderer parity.
- Recorded that no real persisted Review was available for a non-manufactured
  before-and-after assessment; user-visible success is therefore not claimed.

## 4.6.0 R1 — Language Excellence

- Added a renderer-neutral Language Excellence transformation between Review
  projection and document planning.
- Added one deterministic writing guide for concise, active, precise and
  consistent Swedish and English instruction wording.
- Integrated professional, precise, explanatory, concise and diagnostic tone
  contracts with the five built-in Document Profiles.
- Reused immutable processed output per Semantic Document revision and profile.
- Preserved Review data, document structure, stable IDs, source references,
  screenshots, annotations, unknown fields and renderer behavior.
- Added behavior and compatibility coverage for existing recordings and Reviews,
  terminology, profile tone, semantic preservation, immutability and determinism.

## 4.5.0 UX9 — Production Readiness & Ship Review

- Completed the end-to-end first-time, daily consultant, power-user,
  accessibility, performance, architecture, documentation and recovery review.
- Corrected popup and installation terminology for the shipped Documentation
  Excellence, Document Library, Batch Operations, Granskning and Dokumentvy.
- Moved popup debugging behind a native technical disclosure.
- Added a reusable timeout/single-flight guard so popup polling cannot overlap,
  successful requests release timers and popup teardown clears its interval.
- Grouped dashboard settings in a keyboard-accessible disclosure so Document
  Library remains the clear primary workspace.
- Added v4.5 production-boundary and async-concurrency regression coverage.
- Updated installation verification, v4.5 release notes, production-readiness
  assessment and ship-review evidence.
- Confirmed unchanged Review, Semantic Document, Planner, Documentation
  Intelligence, screenshot and Word export boundaries.

## 4.5.0 UX8 — Workflow Polish

- Made Document Library the primary daily surface and grouped raw sessions,
  ZIP export and debugging under a secondary disclosure.
- Standardized workspace terminology to Granskning and Dokumentvy.
- Added `/` search focus, Escape search clearing and Ctrl/Cmd+S Review saving.
- Reused the library search index until metadata changes instead of rebuilding
  it for selection, filtering and sorting interactions.
- Added incremental card selection/focus/preview updates without replacing card
  DOM, preserving focus and reducing work in large libraries.
- Grouped infrequent and destructive batch controls under Fler åtgärder and
  clarified permanent deletion language.
- Added atomic single-record metadata rollback, non-blocking recent-use
  persistence and correct return focus when opening and closing Review.
- Standardized hover, focus, disabled, busy, reduced-motion and status feedback.
- Added workflow, keyboard, focus, accessibility and render-frequency regression
  coverage without changing document or export semantics.

## 4.5.0 UX7 — Batch Operations

- Added immutable renderer-neutral multi-selection and batch command models.
- Added mouse, Ctrl/Cmd, Shift, Space, arrow, Home/End, Select All and Clear
  Selection workflows with stable selection across filtering and sorting.
- Added a contextual accessible toolbar for Word export, favourites, tags,
  profile, theme, metadata, archive and delete operations.
- Added explicit-field metadata updates with atomic local persistence rollback.
- Added sequential multi-document Word export through the unchanged production
  pipeline, progress announcements and cancellation before processing starts.
- Added clear destructive confirmations and calm Celebrate Progress results.
- Added deterministic 10,000-document, immutability, accessibility, export,
  metadata, profile, theme, archive and delete coverage.
- Kept Review, Semantic Document, Document Plan and document content outside the
  batch domain.

## 4.5.0 UX6 — Document Library

- Added a renderer-neutral, immutable metadata-only Document Library model.
- Added continuous search, combinable profile/theme/health/favourite/recent/date
  filters, six sort orders and profile-aware grouping.
- Added document cards, favourites, recently used documents and a lightweight
  Quick Preview that never opens Review.
- Surfaced qualitative Document Health and Celebrate Progress confirmations
  from already materialized Documentation Intelligence results.
- Added keyboard navigation, screen-reader labels, live result counts,
  high-contrast support and reduced-motion support.
- Added deterministic large-library, discovery, immutability, performance and
  accessibility coverage.
- Kept Semantic Document, Documentation Intelligence, Review persistence,
  screenshot storage and Word export behaviour unchanged.

## 4.5.0 UX5 — Smart Document Profiles

- Added a versioned immutable renderer-neutral Document Profile model and
  extensible registry with future-field preservation.
- Added Business Process, SOP, Training Guide, Quick Reference and
  Troubleshooting Guide built-in profiles.
- Added an accessible profile selector that immediately switches cached theme,
  planned presentation, profile-aware guidance and qualitative Document Health.
- Added profile-specific expectations and deterministic guidance priorities
  without mandatory validation or document mutation.
- Integrated Celebrate Progress confirmations for workflow, screenshots,
  accessibility, metadata, purpose and revision history.
- Preserved Workspace Context, reading position, Review history, Undo and Redo
  across profile switches.
- Kept profile selection outside Review persistence and Word export behaviour.

## 4.5.0 UX4 — Documentation Intelligence

- Added a non-modal Documentation Guidance panel with qualitative Document
  Health, grouped guidance and severity/group filtering.
- Reused immutable Quality Diagnostics from the active document pipeline;
  guidance performs no duplicate validation.
- Added positive advisory wording for recommendations, suggestions, information
  and areas that need attention without numeric quality scoring.
- Connected guidance navigation through Workspace Context to matching document
  and Review locations without editing content.
- Added stable-ID reconciliation so unchanged guidance DOM and focus are reused.
- Added empty-, large-document, deduplication, filtering, immutability,
  determinism, accessibility and renderer-isolation tests.
- Kept export non-blocking and left Word output unchanged.

## 4.5.0 UX3 — Connected Workspaces

- Added immutable Workspace Context as the single source of truth for shared
  section, step, screenshot, annotation, anchor, focus and navigation state.
- Connected Review selection, move, merge, split, delete, Undo and Redo with
  the corresponding Document Workspace location through deterministic rebinding.
- Added keyboard- and pointer-accessible navigation from document sections,
  steps, instructions, screenshots and callouts to their Review step.
- Added context preservation, logical focus transfer, live announcements and
  subtle reduced-motion-aware synchronization feedback.
- Kept both workspaces independent: they publish and observe context only.
- Kept context changes outside projection, planning, components and Word export.

## 4.5.0 UX2 — Adaptive Document Experience

- Added an accessible renderer-neutral document toolbar for fit width, fit
  page, 100%, zoom in/out, view modes and page navigation.
- Added continuous and page reading modes while preserving the current logical
  section whenever practical.
- Added Home, End, Page Up, Page Down and Ctrl-based zoom keyboard navigation
  scoped exclusively to Document Workspace.
- Added automatic Adaptive Reading based on workspace width, mode and zoom,
  with advanced Auto, Always On and Always Off preferences.
- Persisted zoom, view mode, Adaptive Reading and toolbar-layout preferences
  separately from Review persistence.
- Reused the existing document DOM for every view operation; Semantic Document,
  components, planning, diagnostics and Word export remain unchanged.
- Added large-document, resize, persistence, boundary, accessibility and
  pipeline-isolation regression coverage.

## 4.5.0 UX1 — Document Workspace Foundation

- Added Review Workspace and Document Workspace as coordinated first-class
  workspaces with immediate keyboard-accessible switching.
- Added a deterministic, immutable and renderer-neutral Document Workspace
  model that consumes only validated Document Plans.
- Added a read-only DOM adapter for title, metadata, headings, workflow steps,
  instructions, screenshots and composed annotations.
- Reused the exact Review projection, theme, planning and prepared-media path
  used by Word export; Word behaviour remains unchanged.
- Added revision-based synchronization for edit, annotation, move, merge,
  split, delete, Undo and Redo changes with stale-render protection.
- Added stable section reconciliation so unaffected document sections retain
  their DOM nodes whenever practical.
- Added behaviour, determinism, immutability, isolation, synchronization,
  accessibility, theme and incremental-rendering tests.

## 4.4.0 RC9 — Release Hardening & Production Readiness

- Completed an end-to-end consultant workflow, architecture, UX,
  accessibility, performance and regression review without adding features.
- Added accessible live feedback for dashboard and popup status, disclosure
  state for advanced privacy settings and busy state for Word export.
- Avoided repeated unchanged popup DOM updates during recording polling.
- Restricted build-time product-version injection to explicit placeholders so
  internal schema and subsystem versions remain intact in production output.
- Removed redundant session-list rendering work and duplicate visual-comparison
  artifacts from source and generated output.
- Corrected architecture, installation and release documentation to describe
  the final v4.4.0 production path and intentional product boundaries.
- Added release-readiness regression checks for canonical assets, documentation,
  accessibility feedback and production version consistency.
- Verified the complete v4.2, v4.3 and v4.4 behaviour suite, DOCX structure,
  visual snapshots, production build and generated JavaScript syntax.

## 4.4.0 RC8 — Smart Presentation & Professional Layout

- Added professional, renderer-neutral presentation intent for cover, metadata,
  headings, steps, screenshots, callouts, tables and revision history.
- Expanded the Theme System with backward-compatible typography, spacing,
  document, component and semantic-role presentation tokens.
- Improved screenshot emphasis, aspect-ratio preservation, supporting-image
  consistency and grouping without changing screenshot or annotation data.
- Improved section flow using `keepWithNext`, `keepTogether`, row integrity and
  grouping intent, while leaving final pagination to Word.
- Kept the Word adapter renderer-only: it consumes resolved Document Plan values
  and contains no Review, semantic projection or theme resolution logic.
- Preserved existing Reviews, Semantic Documents, themes and legacy Document
  Plans without migration.
- Added behaviour, snapshot, DOCX structure, determinism, immutability,
  repeated-export and legacy-plan compatibility tests.
- Added same-Review RC7/RC8 visual comparison artifacts for the cover and
  workflow presentation.

## 4.4.0 RC7 — Document Quality Diagnostics

- Added renderer-neutral, immutable and serialization-safe document quality
  diagnostics derived from Semantic Documents and Document Plans.
- Added an extensible versioned rule registry with duplicate-ID protection and
  isolated rule execution.
- Added deterministic rules for document structure, steps, screenshots,
  annotations, callouts, metadata and plan consistency.
- Added stable diagnostic IDs, specific source references, locations, suggested
  actions and summaries by severity, rule, section and task.
- Integrated non-blocking quality analysis before Word rendering without adding
  persistence, UI, AI, layout changes or new export formats.
- Added behaviour, immutability, determinism, failure-isolation and Word parity
  regression tests.

## 4.4.0 RC6 — Reusable Document Components

- Added a renderer-neutral, serialization-safe document component contract.
- Added an immutable built-in component registry with duplicate-kind detection
  and extension support.
- Added structural validation for semantic content, source references,
  accessibility metadata, theme token references and capability requirements.
- Made Cover, Header, Footer, Metadata, Workflow, Step, Screenshot, Callout,
  Revision History, TOC and Page Break explicit reusable plan components.
- Moved remaining semantic labels, columns, page-field intent and accessibility
  descriptions out of the Word adapter and into planned component data.
- Preserved the RC5 Word structure and appearance without changing Review data,
  themes, branding UI or export formats.
- Added behaviour, integrity, registry and Word parity coverage.

## 4.4.0 RC5 — Word Adapter Migration with Output Parity

- Migrated the production Word flow to Review projection, the semantic document,
  the resolved Thinknine parity theme, Document Planner and a dedicated adapter.
- Made the immutable Document Plan plus prepared media the adapter's complete
  input boundary.
- Preserved the existing visible Word structure, styling, screenshots,
  annotations, page fields, filename behaviour and image fitting.
- Added validation at every pipeline boundary and actionable failures for
  invalid plans or missing media.
- Quarantined the pre-DOCX compatibility exporter from the production path.
- Added DOCX package and XML parity tests for content, ordering, styles, media,
  annotations, Review history states and deterministic repeated export.
- Kept Review persistence and screenshot storage unchanged; added no PDF, HTML,
  theme-selection UI or other RC6 functionality.

## 4.4.0 RC4 — Document Planner

- Added the immutable, renderer-independent and versioned Document Plan model.
- Added the deterministic Document Planner as the single producer of plans.
- Planned sections, reusable component trees, flow, grouping, placement,
  priority, visibility, page intent, keep intent and spacing intent.
- Consumed resolved theme appearance values and interpreted capabilities without
  rendering or feature mutation.
- Added semantic source references for plan sections, blocks and assets.
- Extended themes with independent `themeSchemaVersion`, immutable origin
  metadata and Semantic Document/Planner compatibility declarations.
- Added plan validation for missing components, consistency, capability
  conflicts, compatibility and invalid references.
- Added Base-theme defaults that keep older themes compatible without migration.
- Added behaviour and integrity tests for planning, themes, serialization,
  future versions and architectural boundaries.
- Kept Word export, Review projection and Semantic Document Model unchanged.

## 4.4.0 RC3 — Document Theme System

- Added an immutable, renderer-independent and versioned document theme model.
- Added tokens for colors, typography, spacing, page values, branding and
  semantic components.
- Added deterministic token references, deep inheritance and explicit overrides.
- Added an immutable theme registry with Base, Thinknine, Minimal and Corporate
  built-in themes.
- Added descriptive theme capabilities without feature-gating behaviour.
- Added validation for required and invalid tokens, duplicate IDs, missing or
  cyclic inheritance, duplicate capabilities and invalid token references.
- Preserved unknown fields, future versions and future capabilities through
  normalization and serialization.
- Added behaviour and integrity tests for themes, registry, inheritance,
  resolution, validation, immutability and compatibility.
- Kept Review projection, semantic documents, layout and Word export unchanged.

## 4.4.0 RC2 — Review Projection

- Added the deterministic Review-to-semantic-document projector.
- Projected Review metadata, active tasks, comments, screenshots, annotation
  references and revision history into semantic sections and blocks.
- Added stable source-derived IDs and generic screenshot assets without loading
  or owning image bytes.
- Added immutable, serialization-safe provenance with one projector version.
- Returned immutable quality diagnostics separately from document content.
- Added compatibility handling for legacy Reviews, missing IDs, malformed
  annotation references and unknown future Review fields.
- Added behaviour and data-integrity tests for projection, deterministic output,
  provenance, references, serialization and future schema preservation.
- Kept Word export, themes, layout and the future Document Planner unchanged.

## 4.4.0 RC1 — Semantic Document Model

- Added a renderer-independent semantic document model with one schema version.
- Added stable IDs for documents, sections, blocks, assets and nested content.
- Added heading, paragraph, step, image, table, callout, list, revision history,
  page-break and TOC blocks.
- Added generic assets and read-only Review source references for tasks,
  screenshots and annotations.
- Added non-mutating normalization, recursive immutability, validation and
  serialization helpers.
- Preserved unknown future properties, assets and well-formed block kinds across
  normalize/serialize/deserialize cycles.
- Added behaviour tests for compatibility, integrity, malformed input,
  references and immutable updates.
- Kept Review persistence, layout planning and Word/PDF rendering unchanged.

## 4.3.0 RC6 — Release Hardening

- Kept the Review header, annotation editor header and tools stacked and sticky
  while scrolling long screenshots.
- Excluded controls inside hidden editor sections and CSS-hidden toolbars from
  the focus trap, and made Escape close the editor before Review Studio.
- Prevented annotation-editor shortcuts from undoing hidden task commands and
  corrupting the editor baseline/history relationship.
- Reconciled stale annotation selection during keyboard movement and hardened
  pointer-capture failure handling.
- Added safe rendering fallbacks for invalid persisted annotation styles and
  invalid source-image dimensions without mutating stored data.
- Released image event handlers after load and retained guaranteed canvas
  cleanup for successful and failed exports.
- Added an actionable warning when Word export succeeds from in-memory changes
  that could not be persisted.
- Added focused accessibility, history, rendering and memory regressions.

## 4.3.0 RC5 — Word Annotation Rendering

- Added temporary, non-destructive PNG composition for annotated Word images.
- Reused the normalized annotation scene and shared SVG descriptors for Review
  Studio, the annotation editor and export.
- Preserved source-image resolution, aspect ratio, colors and normalized line
  geometry during rasterization.
- Composed each referenced screenshot once per export and released temporary
  canvases immediately after encoding.
- Kept unannotated screenshots on the previous byte-identical export path.
- Ignored unsupported future annotation types without changing stored data.
- Added rendering, workflow-state, compatibility, cleanup and deterministic
  SVG visual-regression coverage.

## 4.3.0 RC4 — Annotation History and Persistence

- Extended the existing Review command history with optional version 2
  annotation snapshots and stable annotation selection.
- Added Undo/Redo for annotation add, move, resize, arrow endpoints, style and
  delete operations without creating a second history engine.
- Added no-op filtering, redo invalidation and grouped keyboard nudging.
- Added debounced annotation autosave that never persists active gesture drafts.
- Added a serialized save queue and stale-response protection.
- Added persistence flush before editor close, explicit Save and Word export.
- Added editor baselines so Cancel restores annotation state and its history
  without overwriting concurrent task changes.
- Preserved old history entries, unknown future annotations, styles and schema
  fields.
- Added accessible pending, saved and failed persistence status.
- Added annotation history, baseline, save queue, flush and race-condition
  behaviour tests.
- Kept original screenshot storage and Word rendering unchanged.

## 4.3.0 RC3 — Arrow and Annotation Interaction

- Added non-destructive arrow annotations to the shared scene and SVG pipeline.
- Added rectangle and arrow tool selection with accessible pressed state.
- Added annotation selection from the SVG surface and an accessible list.
- Added pointer dragging and pixel-based keyboard movement for annotations.
- Added exact percentage geometry controls for moving and resizing rectangles
  and editing arrow endpoints.
- Added Delete support with live screen-reader feedback.
- Added reusable domain update and remove operations with annotation-set
  revision tracking.
- Added behaviour tests for arrows, selection geometry, movement, update and
  removal.
- Kept annotation Undo/Redo and autosave reserved for RC4.

## 4.3.0 RC2 — SVG Annotation Editor

- Added a shared normalized-to-pixel annotation scene model.
- Added reusable SVG rendering for screenshot annotation overlays.
- Added a Review Studio annotation mode without introducing another modal.
- Added non-destructive rectangle drawing with pointer input.
- Added keyboard rectangle creation with Enter and Escape gesture cancellation.
- Added accessible toolbar, drawing-region descriptions, focus and live feedback.
- Added annotation overlays to Review Studio screenshot previews.
- Added behaviour tests for scene conversion, SVG output and editor gestures.
- Kept Undo/Redo, annotation autosave, arrows and Word rasterization out of RC2.

## 4.3.0 RC1 — Screenshot Annotation Foundation

- Added a versioned, non-destructive screenshot annotation domain model.
- Added stable UUID-based IDs for annotation sets and individual annotations.
- Added normalized rectangle and arrow geometry constrained between 0 and 1.
- Added validation for malformed, invisible and non-finite geometry.
- Preserved unknown annotation types and schema fields for forward compatibility.
- Added backward-compatible normalization for Reviews without annotation data.
- Added behaviour tests for creation, validation, IDs, migration and future data.
- Kept original screenshot bytes, Review UI, Undo/Redo and Word export unchanged.

## 4.2.0 Release Candidate

- Added a blank paragraph between step instructions and comments in Word
  exports.
- Removed the per-step page and confidence metadata line from Word exports while
  retaining those values in review data.
- Added explicit Edit Instruction and Add/Edit Comment controls so inline
  editing no longer depends on discovering double-click or Enter shortcuts.
- Replaced paired instruction emphasis markers such as `**Sök**` with one
  double quote on each side (`"Sök"`) across Review Studio and Word export.
- Removed the overlapping Approve All action; reviews can now be completed only
  after every step has been individually approved.
- Added accessible global and per-step compact/expanded Review Studio controls
  for easier movement through long reviews without changing review data.
- Moved Delete from the global toolbar to an accessible action on every review
  step while retaining Undo and predictable focus restoration.
- Fixed the Review Studio command header so it remains visible while scrolling
  long reviews.
- Fixed session deletion failing before storage removal because the review
  storage prefix was undefined.
- Centralized session, event, screenshot and review storage-key definitions.
- Added visible error feedback when a session cannot be deleted.
- Completed senior release review across architecture, regressions, UX,
  performance and accessibility.
- Removed a dead dashboard renumber branch after all mutations were centralized
  in the Review domain layer.
- Ensured separate committed inline-edit sessions create separate Undo entries.
- Refreshed installation instructions and consolidated release documentation.
- Added complete 4.2.0 release notes and retained compatibility with saved
  reviews and existing public Review APIs.

### RC1 — Selection Foundation

- Added a reusable Review Studio selection model.
- Added single, additive and range selection for review tasks.
- Added keyboard navigation with arrows, Home, End, Enter, Space and Select All.
- Added delegated selection event handling for the review task list.
- Added accessible grid, row and selection state semantics.
- Added stable fallback task identifiers when normalizing legacy reviews.
- Added Review Studio selection behaviour tests.
- Prepared the foundation for future multi-task editing without adding editing
  commands.

### RC2 — Drag & Drop

- Added reusable ID-based move operations for single and multi-selection.
- Added delegated drag-and-drop handling with explicit drag handles.
- Added FLIP animations with reduced-motion support.
- Added Alt+Arrow keyboard reordering.
- Preserved selection and active focus across every move method.
- Routed existing move buttons through the shared move engine.
- Added move, drag lifecycle and animation behaviour tests.

### RC3 — Merge Steps

- Added an ID-based merge engine for selected review tasks.
- Merged instructions, original text, comments, screenshots and source metadata.
- Preserved task ordering by inserting the merged task at the first source task.
- Added versioned review history with indexed source snapshots for future Undo.
- Preserved all merged screenshots in Review Studio and Word exports.
- Added merge-domain, history and DOCX multi-image behaviour tests.

### RC4 — Split Step

- Added a reusable split engine for review tasks.
- Added manual text splitting at the instruction cursor.
- Preserved screenshots, source events and metadata on every split part.
- Added suggestion segments and metadata hooks for future AI integrations.
- Added reversible split history with the complete source snapshot and created
  task IDs.
- Added split-domain, collision, ordering, history and AI-suggestion behaviour
  tests.

### RC5 — Undo / Redo

- Added a reusable, versioned command history engine with a 100-entry limit.
- Added Undo and Redo for move, merge, split, delete and edit commands.
- Added Ctrl/Cmd+Z, Ctrl+Y and Cmd/Ctrl+Shift+Z keyboard shortcuts.
- Preserved task selection across history navigation where command context is
  available.
- Coalesced consecutive edits to the same field into one undoable command.
- Added redo-branch invalidation, no-op filtering and command behaviour tests.

### RC6 — Professional Editing

- Added a reusable inline editing controller for Review Studio fields.
- Added edit activation with double-click or Enter.
- Added Ctrl/Cmd+Enter-to-commit, Escape-to-cancel and blur-to-commit behaviour.
- Made Enter create natural line breaks in multiline instructions while preserving Enter-to-commit for single-line comments.
- Added debounced automatic persistence after committed edits.
- Prevented stale save responses from overwriting newer in-memory edits.
- Kept native text-field Undo/Redo active while an inline editor is open.
- Added editing lifecycle, delegated event and autosave behaviour tests.

### RC7 — Professional Toolbar

- Added a modern, grouped Review Studio command toolbar.
- Added centralized selection-driven state for Undo, Redo, Merge, Split,
  Move Up, Move Down and Export.
- Added reusable ID-based deletion with Undo history support.
- Added boundary-aware movement state for the first and last selected tasks.
- Added delegated command routing and arrow, Home and End toolbar navigation.
- Kept Add, Save and Complete available as secondary actions.
- Added toolbar state, disabled-command, navigation and bulk-delete tests.

### RC8 — Status Bar

- Added a live Review Studio status bar for steps, selection, estimated pages
  and screenshots.
- Added a reusable status model shared by rendering and behaviour tests.
- Updated status automatically after selection and every task-list operation.
- Matched screenshot counting to export semantics by deduplicating per task.
- Added an explicit, documented page-estimation heuristic.
- Added semantic definition-list markup, `role=status`, polite live updates,
  atomic announcements and a grid description relationship.

### RC9 — Accessibility Review

- Added complete modal dialog semantics and accessible naming/descriptions.
- Added a reusable focus trap, Escape handling and opener-focus restoration.
- Moved initial focus into Review Studio when the dialog opens.
- Added accessible progressbar values and dynamic grid row counts/indexes.
- Connected instruction and comment labels to their inline editing controls.
- Added task-specific labels for approval and contextual add actions.
- Added screen-reader keyboard instructions and polite save-status updates.
- Preserved native editing Escape and Undo behaviour inside active fields.
- Added dialog keyboard, focus cycling, handled-event and ARIA regression tests.


## 4.1.1

- Removed the "Always ask where to save files" option and Save As behavior.
- Added a live filename preview.
- Added cursor-aware buttons for process, environment, date, time and version
  variables.
- Deferred company and user variables until reliable session data is available.
- Added validation feedback for unknown filename variables.
- Added validation for missing braces, duplicate opening braces and malformed
  variables without blocking export.
- Added a single variable definition shared by generation, validation and UI.
- Added accessible descriptions, live regions and keyboard navigation.
- Preserved compatibility with existing filename templates.
- Replaced source-string regression checks with export settings behaviour tests.


## 4.1.0

- Added export settings to the dashboard.
- Added option to always show the Edge Save As dialog.
- Added configurable filename pattern.
- Added variables for process, environment, date, time and version.
- Added Edge Downloads API integration.
- Word exports now use the centralized download service.
- Added automatic conflict handling with unique filenames.
- Added export settings regression tests.


## 4.0.1

- Fixed CI failure caused by linting the generated esbuild bundle.
- Style lint now checks only authored source, scripts and tests.
- Generated `dist` output remains validated by build and JavaScript syntax checks.
- Added a regression test for lint scope.


## 4.0.0

- Replaced the hand-written OpenXML Word generator with the established `docx` library.
- Added `docx` 9.7.1 as a runtime dependency.
- Added esbuild bundling for Edge.
- Word documents are now created through `Document`, `ImageRun` and `Packer.toBlob`.
- Preserved Review Studio, screenshots, comments, metadata, headers, footers and page numbers.
- Removed the old custom ZIP/OpenXML Word pipeline from the active dashboard.
- Added build-time checks for the library-based exporter.


## 3.7.3

- Fixed DOCX files that Microsoft Word could not open.
- Preserves actual screenshot MIME type from Edge.
- Detects PNG and JPEG from both MIME metadata and binary signature.
- Stores images with the correct file extension in the DOCX package.
- Adds correct image Content-Type declarations.
- Adds JPEG dimension parsing.
- Added mixed PNG/JPEG DOCX regression tests.


## 3.7.2

- Fixed dashboard startup crash caused by missing `exportWordReview` element.
- Restored the Exportera Word button in Review Studio.
- Made the Word button event binding defensive.
- Added automated HTML/JavaScript ID consistency regression tests.
- Restored settings and session loading by preventing the startup script crash.


## 3.7.1

- Fixed dashboard startup regression.
- Restored loading of environment name and maximum event count.
- Restored session list loading.
- Added guarded sequential dashboard initialization.
- Added defaults fallback when stored settings are missing or unreadable.
- Added explicit empty-session state.
- Hardened background responses for settings and sessions.
- Added dashboard regression tests.
- Word Generator remains unchanged.


## 3.7.0

- Added professional Word DOCX generator.
- Added Exportera Word button in Review Studio.
- Generates cover page, metadata table and table of contents field.
- Generates purpose, prerequisites and reviewed workflow.
- Embeds selected screenshots in the DOCX.
- Includes step comments, expected result and version history.
- Adds Thinknine styling, header, footer and page number fields.
- Word export uses the reviewed task model, not raw events.
- Added browser-compatible ZIP writer.
- Added automated DOCX package tests.


## 3.6.2

- Connected Review Studio visibly to the Sessions page.
- Added a visible Granska button for completed sessions.
- Added a minimal Review Studio overlay.
- Added editable instruction text and approval checkbox.
- Added save and close actions.
- Ensured Review Studio runtime script is loaded in the dashboard.


## 3.6.1

- Made `dist` the permanent Edge development folder.
- Build now synchronizes runtime files from `src`.
- Manifest version is generated from `package.json`.
- Added `VERSION.txt` generation.
- Added Windows build-and-open helper script.
- Build output now prints the exact Edge extension folder.


## 3.6.0

- Added Review Studio.
- Added per-session review storage in Edge.
- Added editable instructions and comments.
- Added approve/unapprove per step.
- Added move up/down.
- Added add/remove manual steps.
- Added review completion and progress.
- Added screenshot previews.
- Added Review button to completed sessions.
- Added review.json model foundation for Word/PDF generation.
- Added Review Studio unit tests.


## 3.5.1

- Added GitHub Actions CI.
- Added automatic tagged release workflow.
- Added dependency-free linting.
- Added Edge ZIP release script.
- Added EditorConfig and Git attributes.
- Added bug and feature issue templates.
- Added pull request template.
- Added project roadmap.


## 3.5.0

- Reorganized project into a git-ready source/dist structure.
- Added modular Noise Filter.
- Added Entity Memory.
- Added Session Graph.
- Added Confidence Engine.
- Added modular Documentation Engine.
- Added Node-based build script.
- Added unit tests with no external dependencies.
- Added session-graph.json and confidence-report.json.
- Kept Edge-only distribution as the primary product path.
