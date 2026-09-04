# Process Analysis in Review Studio

## Configuration explanation

The analysis summary names the most likely Business Central configuration. If
several lifecycle variants fit the same recording, it says that the assessment
is uncertain and exposes the alternatives in a collapsed list. Swedish labels
use consultant-facing terminology such as `Grundläggande lagerhantering` and
`Avancerad lagerhantering`; internal taxonomy IDs are not shown.

## Conditional steps

The BC Process map distinguishes observed steps, reference suggestions, and
conditional steps. A conditional step belongs to only some plausible Business
Central lifecycle variants. It uses a purple dashed treatment and the label
`Villkorligt steg` / `Conditional step`, so it is guidance rather than an error.

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

The Business Process and BC Process map levels remain selectable for legacy
recordings. Selecting either level lazily loads Process Analysis when needed,
then projects the available deterministic classification into the map. Their
availability no longer depends on an asynchronous result having arrived during
the first render.

For a legacy recording without stored semantic classifications, the Business
Process map projects domain, business process, and recognized BC flow. The BC
Process map shows observed canonical documents and unobserved reference
documents as suggestions. Suggestions are guidance, not claims that the
customer process is incomplete.

Observed business actions are interleaved with documents according to recording
order. The semantic map preserves document, process-step, and posting node types,
so the visual grammar can use distinct shapes instead of rendering every item as
the same activity card.

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
