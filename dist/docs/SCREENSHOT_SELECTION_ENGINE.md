# Screenshot Selection Engine

Visible annotations are a preservation constraint. Automatic selection cannot
silently replace annotated authoritative evidence or migrate annotations.

Resolved merged and split steps provide bounded candidate sets. Structure logic
does not rank screenshots; manual selection and annotation safeguards remain
authoritative.

Step Editor manual selection stores only the candidate asset ID and is
authoritative in Workspace and Word. Annotated evidence cannot be replaced
silently; automatic recommendation and image bytes remain intact.

## Purpose and architecture

The engine chooses the most instructionally relevant screenshot reference for a
candidate Step Group using metadata only:

```text
Step Group + candidate assets + Review intent + profile
  -> immutable Screenshot Selection Result
```

It never loads, decodes, hashes, crops, recompresses, annotates, deletes, or
duplicates image bytes. No OCR, computer vision, AI, DOM, or network service is
used.

## Result model, version, and identity

Schema-v1 results contain deterministic selection ID, selection version,
Step Group ID, selected asset ID or `null`, source-ordered deduplicated candidate
IDs, canonical source IDs, primary event, mode, explicit reasons, rejected
candidates, manual override, fallback state, and annotation-preservation flags.
Unknown future fields survive normalization.

Selection version is `1.4.0`. Identity fingerprints include the version, Step
Group, profile, previous-page continuity, manual state, candidate IDs, source and
normalized event identities, kind, Capture Packet evidence role and preference,
annotations, semantic role intent, and relevant stability/context signals.
Random values and array positions alone are never identities.

## Semantic role intent

Role Intent `1.0.0` connects the completed semantic action to screenshot
selection. It states which observable image role best explains the instruction:
selection actions prefer `selection-visible`, field/toggle/search actions prefer
`result-visible`, dialog choices prefer `dialog-before-close`, and a plain action
prefers `action-visible` unless it has a verified result. A verified action then
prefers `result-visible`.

Semantic intent is strict only when a recognized semantic action is available.
It may reduce a packet preference that serves a different instructional purpose,
but can never override a manual choice or annotation preservation. Historical
Step Groups receive a non-strict intent derived from their existing group kind,
so their ranking policy remains backward compatible. Selection results expose
the complete intent and its version for diagnostics and deterministic replay.

## Capture Packet evidence

For modern Step Groups, the engine consumes the immutable `capturePacket`
created by Event to Step Grouping. Candidate assets are enriched in memory with
their packet evidence role: `interaction`, `result`, or `supporting`. The packet's
preferred verified-result asset receives the strongest automatic evidence;
later supporting captures are explicitly penalized. This solves the common case
where the recorder captures both the invoked control and a later framework state
after the useful result was already visible.

Packet evidence does not alter the candidate's observable capture role, expand
the Step Group boundary, or modify raw/canonical evidence. Results expose
`selectedPacketEvidenceRole` and reasons such as `capture-packet-result` and
`capture-packet-preferred`. Manual choices and annotation preservation are still
evaluated before automatic ranking. Historical groups without a Capture Packet
follow the previous selection policy unchanged.

## Capture roles

The engine is the single owner of deterministic screenshot-role classification.
It derives a role from existing event and UI-state metadata without inspecting
pixels or changing the captured evidence. The role contract is version `1.0.0`:

- `menu-open`: a lookup or menu is open but no final choice is yet visible.
- `selection-visible`: the selected row or menu option is visible.
- `result-visible`: a committed value, toggle state, or navigation result is visible.
- `dialog-before-close`: the complete dialog and invoked choice are still visible.
- `dialog-closed`: the dialog has already disappeared.
- `action-visible`: the invoked action is visible at capture time.
- `focus-only` and `before-value`: premature evidence that is normally rejected.
- `context`: safe fallback when no stronger observable role is known.

Candidates preserve `captureRole` and `captureRoleVersion`. Selection results
expose `selectedCaptureRole`, allowing diagnostics to explain both which image
won and what instructional role it serves. Unknown explicit roles fall back to
deterministic derivation.

## Candidate boundary

Modern selection accepts only assets already aggregated by the Step Group or
associated with its canonical source events. It never searches neighbouring or
unrelated recording screenshots. Exact duplicate asset IDs collapse while source
order remains visible. Legacy document candidates use the established task/image
boundary and require no recording migration.

## Manual selection and annotation safety

A valid Review manual override is authoritative and returns `selectionMode:
manual`. An unavailable manual reference triggers a safe compatibility fallback
that preserves the existing candidate set rather than silently choosing another.

One annotated candidate is preserved even when automatic metadata prefers a
different image. Multiple annotated candidates are all retained unless an
existing/manual selection can be honored without orphaning another annotation.
Annotations are never moved or recreated.

## Automatic policies

Primary-event and same-control/page alignment are strong general signals.
Visible, unobstructed, stable states are positive; loading, spinner, tooltip,
hover, transient notification, mismatched control, and stale page metadata are
negative when explicitly captured.

Role precedence is scoped to the Step Group: committed result for field/toggle
and navigation steps, selected option for menu actions, action-visible for a
plain action, and dialog-before-close for dialog steps. A role never expands the
candidate boundary or overrides a manual or annotated choice.

- Field edit: prefer the committed `value-change`, especially the primary event
  on the same field.
- Lookup: prefer selected row, resulting value, selected value, then lookup-open;
  explicit primary-event alignment may make the verified resulting field the
  best candidate.
- Toggle: prefer confirmed `toggle-change` state.
- Action: prefer the action `activation`; an unrelated later page is rejected.
- Date: a selected calendar row or verified resulting date competes under the
  same lookup/primary-event policy without pixel inspection.

Profile metadata provides a secondary preference: Business Process and Training
favor overview, SOP favors precise state, Quick Reference favors focused context,
and Troubleshooting favors diagnostic state. Accuracy signals remain stronger.
Previous-page visual continuity is a small secondary signal only.

Explicit `focus-transition`/`focusOnly` metadata is rejected as insufficient
evidence, and explicit `beforeValue`/`capturePhase: before-value` metadata is
rejected as premature. For dialog interactions, a completed dialog action is
preferred over a later explicit dialog-close state. These rules do not infer
image contents.

## Real-world validation corpus

The reusable metadata-only corpus is stored in
`tests/fixtures/screenshot-selection/sanitized-bc-recordings.json`. It contains
20 sanitized, real-shaped BC samples covering field entry, customer/item/vendor
lookup, quantity, date, checkbox, option fields, actions, dialogs, navigation,
standard BC, React/control add-in, multi-frame capture, annotation preservation,
and legacy single-screenshot behavior. It contains no screenshots, OCR output, customer
names, document numbers, URLs, tenant values, or other sensitive payloads.

Each sample records its deterministic expected screenshot reference, candidate
metadata, Step Group boundary, baseline result, and—where applicable—an error
classification. `tests/screenshot-selection-corpus.test.js` reports counts and
percentages; the measurement is verification output and is not a Document Health
score.

Baseline was 14/17 eligible automatic selections (82.4%). Three evidenced rules
were corrected: reject focus-only primary captures when a committed state exists,
reject explicitly marked before-value React captures, and prefer the completed
dialog action over a later dialog-close capture. The corrected result is 17/17
(100.0%) on the eligible corpus. Separately, one sample is a capture failure, one
is intentionally ambiguous, and one requires a manual override. Those cases are
not presented as automatically solved.

The classification vocabulary is: previous-step screenshot, focus-only
screenshot, pre-value screenshot, after-navigation screenshot, wrong control,
wrong dialog state, stale screenshot, transient UI, missing capture, ambiguous
candidates, manual override expected, and annotation-preservation conflict.
Zero-count categories remain visible in test output so new failures can be
compared consistently. The runner also proves deterministic output for every
sample and reports capture failures outside automatic-selection accuracy.

## Fallback and no-screenshot behavior

Fallback precedence is: valid manual choice, annotation-safe preservation,
informative automatic winner, safe existing selection, primary-event candidate,
single valid candidate, otherwise no selection. Equivalent or incomplete legacy
candidates preserve established behavior. A Step Group with no valid candidate
returns `selectedScreenshotAssetId: null` and `no-valid-candidate`; no unrelated
image is reused.

## Explanation, performance, privacy, and renderer parity

Results expose reasons such as `primary-event`, `same-control`,
`committed-value`, `selected-row`, `confirmed-toggle-state`, and `stable-ui-state`.
Rejected candidates contain explicit metadata reasons, not fake confidence
percentages. Sensitive values are not copied into explanations.

Semantic decisions add reasons such as `role-intent:selection-visible` or reject
a candidate with `role-intent-mismatch:result-visible`, making the choice
auditable without inspecting image pixels.

Selection is linear in the bounded candidate set and cached for immutable Step
Group/candidate/profile fingerprints. A 5,000-candidate regression guards cost.
The existing Screenshot Intelligence layer only adapts document blocks and
applies the result. Document Planner, Workspace, and Word consume the same
selected Semantic Document and cannot choose independently.

## Regeneration

Automatic selection may improve in fresh state. A manual choice remains
authoritative while its asset exists; a missing asset becomes unresolved rather
than silently switching the manual choice. Screenshot-owned Annotations never
move. See [REGENERATE_FROM_RECORDING.md](REGENERATE_FROM_RECORDING.md).
