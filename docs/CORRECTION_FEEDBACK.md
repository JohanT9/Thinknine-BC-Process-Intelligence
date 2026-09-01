# Privacy-safe correction feedback

Review Studio derives a small local feedback signal from confirmed Review
commands. Its purpose is to measure where generated documentation requires
consultant correction without copying customer or document content into an
analytics model.

Each active feedback entry contains only:

- schema version and local scope;
- command category;
- affected field categories, such as instruction, screenshot or structure;
- number of affected Steps.

It never contains text, rich-text content, entered values, captions, stable
identifiers, screenshot references, URLs, company/session information or raw
recording evidence. The signal remains inside the stored Review. No network
submission, automatic learning or rule mutation occurs.

Feedback follows the active undo/redo position. An undone correction is not
included in the visible count. Grouped edits retain the union of affected field
categories without retaining their content.

This contract intentionally separates measurement from future improvement.
Any future aggregation or rule proposal must be explicit, reviewable and must
continue to preserve Canonical Recording and existing documents unchanged.
