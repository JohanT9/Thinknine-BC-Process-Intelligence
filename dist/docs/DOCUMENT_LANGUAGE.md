# Document language

BC Process Studio supports Swedish and English process documents independently
of the interface language.

## Contract

- `documentLanguage` is `sv-SE` or `en-US`.
- The application setting is the default for newly created Reviews.
- Every Review stores its own language in `documentFields.documentLanguage` and
  can be changed in BC Review Studio.
- Existing Reviews without the field remain Swedish for backward compatibility.
- The language applies consistently to BC Review Studio presentation, BC
  Document Generator, Document Plan, and Word export.
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

The change is additive. No recording or Semantic Document schema version is
increased. Older data receives `sv-SE` at normalization time. Unsupported
language values safely resolve to Swedish.

