# Business Central Process Recognition Engine

The Process Recognition Engine deterministically identifies the Business
Central process represented by a Canonical Recording. It is a read-only
interpretation layer over immutable evidence and matches observations against
the canonical Business Central Process Taxonomy.

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
sequence, actions, and transitions. Verified page/table identity, technical BC
actions, and explicit transitions are strong. Captions are weak. Optional
external screenshot interpretation is recorded with very low strength and
cannot classify a process by itself. Any candidate supported only by weak
signals is capped below high confidence.

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
