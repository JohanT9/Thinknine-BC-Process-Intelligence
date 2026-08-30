# Document language

BC Process Studio supports Swedish and English process documents independently
of the interface language.

## Contract

- `documentLanguage` is `sv-SE` or `en-US`.
- The application setting is the default offered when a recording is stopped.
- The naming dialog lets the consultant confirm Swedish or English for each
  process document or technical issue report before finalization.
- Every Review stores its own language in `documentFields.documentLanguage` and
  can be changed in BC Review Studio.
- Existing Reviews without the field remain Swedish for backward compatibility.
- The language applies consistently to BC Review Studio presentation, BC
  Document Generator, Document Plan, and Word export.
- Technical Bug Reports store the same choice and use it for generated section
  headings and local text/Markdown export.
- Observed Business Central captions, entered values, process names, company and
  environment names are preserved in their original language.
- User-edited instructions, comments, expected results, and manual steps are not
  translated automatically.

## Ownership and flow

`src/document/document-language.js` owns deterministic document localization.
It consumes a Semantic Document after Language Excellence and before
Presentation Grammar. It translates only known system headings, defaults,
status labels, and generated instruction grammar. It does not mutate Review,
raw recording evidence, or the source Semantic Document.

```text
Review → Review Projector → Semantic Document → Language Excellence
  → Document Language → Presentation Grammar → Screenshot Intelligence
  → Document Planner → Document Workspace / Word
```

The same localized Semantic Document and Document Plan feed the on-screen
document and Word, preventing renderer-specific wording differences.

## Compatibility

The change is additive. No recording, Bug Report, or Semantic Document schema
version is increased. The selected value is compatibility metadata on Canonical
Recording and never changes raw events. Older process data receives `sv-SE` at
normalization time. Older Bug Reports retain their historical English report
language. Unsupported new process-language values safely resolve to Swedish.

BC Knowledge Base stores only the normalized language code in its metadata-only
index. Cards show `SV` or `EN`, and the language filter does not load Reviews,
screenshots, or generated documents.
