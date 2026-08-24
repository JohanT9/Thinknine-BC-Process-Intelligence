# Issue Package

Issue Package is the provider-neutral, derived projection used for preview,
copy, offline export, Azure DevOps, and GitHub. The local Bug Report and its
referenced Canonical evidence remain authoritative.

The deterministic builder consumes the existing Technical Report projection.
It therefore respects visible resolved reproduction steps, human edits,
merge/split/hide operations, manual steps, selected primary error, structured
diagnostics, call-stack order, notes, and selected screenshot references. It
does not rebuild semantics from Raw Events.

The schema-version-1 package contains stable package/report IDs, source revision,
title and sections, selected attachments, optional telemetry summary, optional
current AI analysis, inclusion policy, privacy categories, and provenance.
Exact BC error and raw call-stack content are preserved. Destination formatting
escapes markup but does not rewrite evidence.

## Revision and inclusion

The source revision fingerprints the Technical Report state. Editing or
regenerating the Bug Report makes an unsubmitted package stale and submission is
rejected until preview is regenerated. An already-created External Issue
Reference stays historical; no destination is silently updated.

Telemetry is excluded by default and, when selected, contains only the existing
bounded normalized summary—not raw query results. AI is included only when
selected and current, and remains labelled AI-assisted and not authoritative.

## Attachments and offline package

Only the dedicated error screenshot and the first selected screenshot for each
visible reproduction step are included. Names are stable and human-readable,
with roles `error-evidence` and `reproduction-evidence`. Originals remain
unchanged. Annotation-composed assets may be referenced through the existing
asset architecture; Issue Package does not redraw them.

The workspace can always copy Markdown or export a portable JSON offline
package containing a manifest, package metadata, Markdown, and selected image
data. It contains no storage dump, Raw Events, raw telemetry, authentication
tokens, or provider secrets. ZIP is deferred until a shared, tested archive
utility exists; JSON avoids introducing a second ZIP implementation.

The explicit future boundary is `Bug Report -> Issue Package -> Sanitization
Policy -> Destination Adapter`. This milestone provides transparent review and
category disclosure, not an elaborate DLP engine.

