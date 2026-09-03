# Process Analysis in Review Studio

## User workflow

`Processanalys` is a first-class Review Studio toolbar action beside Document
Information. Analysis is preloaded when a review opens and its confidence appears
as a compact badge, so consultants can discover the result without opening a
secondary menu.

The modal comparison shows:

- an explicit evidence status: strong, needs confirmation, or insufficient;
- identified reference process, domain and confidence;
- matched recorded steps;
- possible missing reference steps;
- additional customer-specific steps;
- alternative reference processes;
- an advisory explaining that deviations are not automatically errors.

A similarity percentage is never treated as sufficient proof by itself. The
view combines deterministic Business Central recognition with graph matching.
Weak metadata, close alternatives, or too little evidence are visibly flagged
for confirmation instead of being presented as a confident automatic result.
Reference candidates with zero matched process nodes are omitted. When a
verified Business Central document contradicts a visual graph candidate, the
deterministic document classification takes precedence. Process and document
names are localized for Swedish presentation while stored IDs remain stable.

The consultant can confirm the proposed classification or select another
reference. The manual decision is stored in the Review project with timestamp,
source and status and follows the existing autosave workflow.

## Architecture

Business logic stays outside the UI. The extension background resolves the
Canonical Recording and invokes the Reference Diagram Dataset and Reference
Process Library. `process-analysis-view.js` is a pure, renderer-only adapter for
the returned result. It does not inspect recordings or infer process semantics.

The result is read-only until a user confirms or changes it. Review persistence
stores only the manual decision, not duplicated reference definitions or raw
recording evidence.

## Accessibility and responsive behavior

- The entry point declares its dialog relationship and receives the standard
  shared tooltip.
- The native modal provides keyboard focus containment and Escape behavior.
- Confidence uses a labelled progressbar rather than color alone.
- Match categories include text, counts and headings.
- Dynamic source labels are HTML-escaped.
- At narrow widths, metrics and comparison columns become a single column and
  footer actions wrap.
- Swedish and English UI labels are supported.
