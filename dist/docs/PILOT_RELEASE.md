# Controlled Edge pilot release

## Release gate

`npm run release:verify` runs the existing CI suite once, then the milestone
tests not owned by normal `npm test`: Step Editor, structure overrides, manual
steps, notes/annotations, hierarchy, Process Model, Process Versioning,
regeneration, and pilot compatibility/package validation.

`npm run release:pilot` first rejects a dirty Git tree, captures the full commit
SHA, runs the gate, builds, validates `dist`, creates and independently expands
and validates the ZIP, then writes:

```text
release/<version>/edge/thinknine-bc-process-intelligence-<version>.zip
release/<version>/edge/SHA256SUMS
release/<version>/metadata/release-manifest.json
release/<version>/metadata/release-notes.md
```

Optional listing/policy metadata is produced when `EDGE_EXTENSION_ID` is set.
`PILOT_ALLOW_DIRTY=1` (or `--allow-dirty`) exists only for local release-script
verification; its release manifest records `sourceClean: false` and the artifact
is not publishable. No command publishes externally.

## Compatibility evidence

The sanitized fixture `tests/fixtures/pilot/representative-storage-v4.6.0.json`
contains Canonical Recording-shaped evidence, Review, step and structure
overrides, manual step, note, annotation, section/subtask, Process Model,
Process Version, settings, and Document Library metadata. CI verifies lossless
load/round-trip and the normal domain suites verify regeneration, workspace and
Word behavior. This is automated compatibility evidence, not a real Edge
browser update.

## First-install acceptance

Install from the controlled listing without Developer mode. In a sanitized BC
sandbox: record standard interactions, stop, inspect generated steps, edit one
step, verify a screenshot, open Document Workspace, export Word, restart Edge,
and confirm the project remains. Record evidence in `PILOT_VALIDATION_TEMPLATE`.

## Current risk assessment

Standard automated regression is green. Dedicated React/control-add-in tests
are included, but synthetic tests do not prove the real Aptean/React surfaces.
Real-view verification is a **MAJOR** and is a pilot blocker when the agreed
pilot process requires that surface. Browser-delivered automatic update is also
not yet verified and remains a required go/no-go action before expanding pilot.

## Diagnostics and privacy

Collect product/extension/browser version, sanitized session ID, event counts,
recording health, frame diagnostics, capture outcomes, and pipeline/schema
versions. Exclude business values, customer/vendor/document identifiers,
personal information, URL query data, and screenshots by default. No external
telemetry is introduced.

## Human publication boundary

Repository automation prepares evidence and artifacts. The product owner must
complete publisher login, legal/privacy review, final listing text and assets,
visibility choice, submission, certification, tester assignment, publication,
real install/update tests, and final go/no-go approval.
