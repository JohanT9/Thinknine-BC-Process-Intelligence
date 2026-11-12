# Document language

BC Process Studio supports Swedish and English process documents independently
of the interface language.

## Adding another language

Swedish (`sv-SE`) and English (`en-US`) are active. To add another language:

1. Add its locale, short code, native name, aliases, and capabilities to `src/engine/language-registry.js`.
2. Add a complete UI catalog in `src/ui/i18n.js`.
3. Add document text, presentation grammar, and export text for the language.
4. Add behavioral coverage for UI, Review, Document Generator, Word, and technical reports.
5. Do not enable the language capability until the complete path is verified.

Language selectors, normalization, persistence, badges, and filtering are generated from the registry. Historical aliases are normalized without migrating existing recordings.

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
- System-derived observed-result labels and bounded result sentences follow the
  selected document language; observed Business Central captions inside them
  remain unchanged.
- Process documents, their preview and Word export do not show
  an observed-result callout. The observation remains evidence of the step.

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

### Step sentences

`src/engine/step-text.js` is the one place where a generated step sentence is
written. A step is described by its kind and the values it was recorded with
(`stepText: { kind, action, page, … }` on the semantic action model), and every
document language has its own template per kind; there is no translation of a
Swedish sentence.

- The interaction engine still writes its Swedish sentence (`displayText`), and
  `parse` reads it back into a description. Only an exact match against a
  template counts, and only when the description writes the very same sentence
  again, so Swedish text is unchanged and any other sentence is never described.
- The knowledge domain describes a step that starts a new record directly
  (`create`/`createRecord`). Its page is the caption Business Central showed,
  as for fields and actions; the record kind is written in the document
  language.
- Presentation Grammar writes the instruction of a described step in the
  document language. Steps with their own structured wording (search,
  selection of a customer, vendor or item, field entry, options, check boxes
  and action paths) keep it. A step is written from its description only while
  its instruction still is the described sentence in some language, so merged
  or edited steps keep their text. Steps saved before descriptions existed are
  read from their saved sentence when shown.
- Captured captions and values are never translated. `tests/step-text.test.js`
  checks every kind in every registered language; the capture-quality test
  checks that recordings interpreted in Swedish or English read the same in
  each document language.

## Compatibility

The change is additive. No recording, Bug Report, or Semantic Document schema
version is increased. The selected value is compatibility metadata on Canonical
Recording and never changes raw events. Older process data receives `sv-SE` at
normalization time. Older Bug Reports retain their historical English report
language. Unsupported new process-language values safely resolve to Swedish.

BC Knowledge Base stores only the normalized language code in its metadata-only
index. Cards show `SV` or `EN`, and the language filter does not load Reviews,
screenshots, or generated documents.
