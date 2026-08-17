# Release Notes — Business Central Page Identification

Business Central page context now remains unambiguous and traceable throughout
recording and documentation.

## What changed

- Verified Page Object IDs take precedence over localized captions.
- English, Swedish, and Danish exact aliases are supported through Knowledge
  Packs while preserving the caption actually observed by the recorder.
- Unknown Microsoft, Aptean, AppSource, tenant, customer, and framed pages remain
  usable throughout Review, Document Workspace, screenshots, and Word export.
- Customer-specific definitions can be supplied as local optional Knowledge
  Packs with explicit, traceable overrides.
- Future Aptean Page Object IDs require verifiable source evidence; no IDs were
  guessed or bundled during this milestone.

## Compatibility

Canonical Recording remains schema version 1. Existing recordings, legacy
semantic `pageId` values, raw source events, Review data, screenshots, and
exports remain compatible. Historical recordings are enriched only in memory
and are not rewritten.

## Validation

The final release review exercises 17 representative standard, localized,
unknown, extension, legacy, and frame-based flows through Review, Document
Workspace, and Word. Full Canonical Recording and CI suites pass.
