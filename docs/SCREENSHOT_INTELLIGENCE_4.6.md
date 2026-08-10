# Screenshot Intelligence 4.6 R2

Screenshot Intelligence is now the Semantic Document compatibility adapter over
the versioned Screenshot Selection Engine. The engine is the single owner of
manual/annotation-safe automatic choice; this adapter maps image blocks and
legacy candidate paths to asset metadata and applies the returned reference.

## Executive summary

Screenshot Intelligence is a deterministic, renderer-neutral layer that can
select one stronger screenshot from multiple candidates before presentation
planning. Existing recordings and Reviews require no migration. When supported
metadata cannot distinguish candidates, existing behavior is preserved.

## Candidate model

An immutable candidate contains `screenshotRef`, optional `sourceEventId`,
`taskId`, capture timestamp, dimensions, viewport, interaction type, target,
UI-state, stability and annotation references. Unknown future fields survive
normalization and explanations. Candidates never contain image bytes.

The current recorder supplies event number, timestamp, interaction category and
type, page identity/caption and target role/control/automation ID/label. It does
not currently supply dimensions, loading/spinner state, tooltip state, complete-
dialog state, obstruction, pointer position or a stability measurement. R2 never
guesses these missing signals.

## Deterministic selection rules

Supported explicit metadata can contribute these internal reasons:

- target visible or unobstructed;
- stable UI state;
- complete dialog;
- sufficient resolution;
- useful annotation references;
- matching source event;
- recorded dialog state;
- visual continuity with the preceding selected page;
- profile-specific overview, focused, precise or diagnostic context.

Explicit loading, spinner, tooltip, transient notification, partial menu,
temporary hover, target obstruction, incomplete dialog, mismatched event or low
resolution rejects or lowers a candidate. Exact duplicate references collapse.
Near duplicates require the same source event and matching non-pixel target,
dimensions and page-state signature; stable input order breaks the tie. No pixel
or perceptual comparison occurs.

If complete metadata is missing, or evaluated candidates remain equivalent, all
existing images remain in their original order. Capture order never defeats a
strictly better metadata result, but it provides deterministic ordering for true
equivalence.

## Manual override and annotation integrity

The optional renderer-neutral contract
`screenshotSelection: { mode: "manual", screenshotRef }` is authoritative when
the referenced candidate exists. If it is unavailable, selection falls back
without choosing another image. R2 adds no manual-selection UI.

One annotated candidate is retained even when another candidate scores higher.
When more than one candidate has annotations, existing images remain unchanged.
Original screenshots, annotations and Review data are never modified, moved,
recreated or discarded.

## Profiles and visual narrative

Profiles may weight explicit context metadata: Business Process and Training
Guide can prefer overview context, SOP precise context, Quick Reference focused
context and Troubleshooting Guide diagnostic context. Matching the previous
selected page can provide a small continuity preference. Neither rule reorders
steps or changes workflow semantics.

## Performance, accessibility and observability

Selection uses metadata only and executes before Planner. Immutable document and
candidate identities cache results per profile; mutable inputs are not cached.
Explanations expose candidate inputs, selection, internal reasons, rejection
reasons and manual preservation to tests/development without normal-UI clutter.
Their structured reason codes are suitable for a future plain-language,
accessible presentation but are not currently shown to consultants.

## Before-and-after assessment

No persisted Review/session with multiple screenshot candidates exists in this
workspace. Consequently, a non-manufactured before-and-after comparison could
not be produced, and R2 does **not** claim demonstrated user-visible success on
real customer data. A real-shaped fixture based on actual recorder event fields
demonstrates that an action screenshot followed by a recorded dialog screenshot
selects the dialog candidate consistently in both Document Workspace and Word.
This proves integration, not the primary real-data success criterion.

R1's lack of a verified visible output difference on a real Review remains a
separate unresolved verification item. R2 does not correct or close it.

## Compatibility and limitations

- Existing recordings require no migration.
- Existing Reviews remain compatible.
- Manual screenshot choices remain authoritative.
- Original screenshots and annotations remain unchanged.
- Document Workspace and Word use the same selected screenshot.
- No AI, OCR or computer vision was introduced.
- Screenshot Intelligence changes selection only.
- Current recordings lack several quality signals, so many multi-image steps
  intentionally retain their previous presentation.
- A real persisted Review is still required for product-level before/after
  validation.

## Production assessment

The implementation is technically production-ready and fails safely when
metadata is insufficient. The primary user-visible success criterion remains
unverified until a real multi-candidate Review can be compared. This limitation
is a validation blocker for claiming proven consultant value, not a data-safety
or backward-compatibility blocker.
