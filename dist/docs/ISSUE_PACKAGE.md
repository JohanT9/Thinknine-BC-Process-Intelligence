# Issue Package

Issue Package is the derived, renderer-neutral projection of a Technical Bug
Report that the PDF and email exports render. The local Bug Report and its
referenced Canonical evidence remain authoritative. Submission to Azure DevOps
or GitHub and the offline JSON package were removed; external issue references
stored by earlier versions stay unchanged in the report.

The deterministic builder consumes the existing Technical Report projection.
It therefore respects visible resolved reproduction steps, human edits,
merge/split/hide operations, manual steps, selected primary error, structured
diagnostics, call-stack order, notes, and selected screenshot references. It
does not rebuild semantics from Raw Events.

The schema-version-1 package contains stable package/report IDs, source revision,
title and sections, selected attachments, inclusion policy, privacy categories,
and provenance. Exact BC error and raw call-stack content are preserved.

The package carries the report's document language. Markdown headings and
structural labels use that language; captured errors, user-authored text, and
technical evidence are never translated or rewritten.

If the generated summary is identical to a captured Business Central error, the
Markdown description omits the duplicate summary section. A distinct human
summary is always retained.

## Inclusion

PDF and email exports include the AL call stack when Business Central exposed
one. They exclude telemetry and technical details.

## Attachments

Only the dedicated error screenshot and the first selected screenshot for each
visible reproduction step are included. Names are stable and human-readable,
with roles `error-evidence` and `reproduction-evidence`. Originals remain
unchanged.
