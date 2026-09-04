# Business Central Process Recognition Engine

The Process Recognition Engine deterministically identifies the Business
Central process represented by a Canonical Recording. It is a read-only
interpretation layer over immutable evidence and matches observations against
the canonical Business Central Process Taxonomy.

## Lifecycle variant assessment

The engine retains the leading document lifecycle variant and close alternatives
within the same lifecycle. `processEvidence.variantAssessment` reports ambiguity,
while `processEvidence.lifecycleDocuments` labels document steps as observed,
expected, optional, or conditional. Downstream maps can therefore distinguish a
configuration-dependent warehouse step from a genuinely missing process step.

The reference matching adapter preserves structured matched-document and
matched-action evidence on the selected result. Process Analysis consumes these
fields directly; it does not reconstruct recognition evidence from rendered
labels or screenshots.

## Recognition stages

1. Extract Business Central documents and entities from semantic references,
   verified page object IDs, source tables, page metadata, and captions.
2. Extract meaningful actions from technical action identity before considering
   action captions.
3. derive ordered document navigation and consume explicit document-state
   transitions from Canonical Semantic Recording.
4. Match ordered, potentially incomplete evidence against taxonomy document,
   Process Step, Process Action, relationship, and variant patterns.
5. Match applicable configurable Business Central Document Lifecycle variants;
   typed document transitions contribute strong independent evidence.
6. Return a ranked primary classification and up to three alternatives with
   confidence, matching Event IDs, signal counts, and human-readable reasons.

Exact completion is not required. A recording ending at Warehouse Pick can be
recognized as a partial Warehouse Outbound process. The `partial` flag and
explanation make that limitation explicit.

## Confidence and precedence

Confidence combines document coverage, observed-evidence coverage, ordered
sequence, distinct actions, transitions, and candidate separation. Verified page/table identity, technical BC
actions, and explicit transitions are strong. Captions are weak. Optional
external screenshot interpretation is recorded with very low strength and
cannot classify a process by itself. Any candidate supported only by weak
signals is capped below high confidence.

Page and document captions are not reused as action evidence. Repeated identical
actions count once, contradictory document order and unexpected strong documents
reduce the score, and close leading candidates require manual confirmation. The
result exposes `auto-classifiable`, `review-required`, or
`insufficient-evidence`, plus the candidate margin and score breakdown. Each
candidate also exposes immutable `processEvidence` with matched documents,
canonical expected documents, and matched actions, so consumers need not parse
human-readable explanation text. Evidence retains recording sequence and a
renderer-neutral node type, allowing documents, process steps, and postings to
be ordered and styled correctly downstream.

Generic localized verbs are context guarded. For example, `Registrera vikt`
does not count as the warehouse action Register; caption-based Register evidence
requires Pick/Put-away context unless a technical BC action identity is present.

Swedish Business Central document captions are canonical aliases, including
Inköpsorder, Distributionslagerinleverans and Överföringsorder. This allows older
recordings without complete page-object metadata to contribute caption evidence
without changing the canonical English taxonomy identifiers.

The engine returns `classificationSource: rule`. `toSemanticClassification`
converts the selected candidate into the optional Canonical Semantic Recording
contract, preserving its explanation, signal summary, partial status, engine
version, alternatives, confidence, and contributing Event IDs.

## AI extension boundary

The result declares an `aiComplement` boundary but invokes no AI. A future AI
provider may suggest candidates when deterministic evidence is incomplete. It
must preserve deterministic evidence and alternatives, and verified Business
Central metadata always takes precedence over AI or screenshot similarity.

The recognizer accepts an injected normalized taxonomy, so future Microsoft,
partner, and Aptean process packs can participate without UI-specific rules or
changes to Canonical Recording.

The recognizer also accepts an injected Document Lifecycle catalog. Its output
reports the matched lifecycle, configuration variant, lifecycle confidence, and
number of matched typed transitions for debugging and future training.
