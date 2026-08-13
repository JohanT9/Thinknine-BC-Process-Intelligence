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

Selection version is `1.1.0`. Identity fingerprints include the version, Step
Group, profile, previous-page continuity, manual state, candidate IDs, source and
normalized event identities, kind, annotations, and relevant stability/context
signals. Random values and array positions alone are never identities.

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
