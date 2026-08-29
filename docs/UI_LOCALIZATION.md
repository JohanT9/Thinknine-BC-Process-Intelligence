# UI localization

BC Process Studio separates its interface language from observed Business
Central content and generated document content.

## Contract

- `uiLocale` owns the application interface language.
- Supported values are `sv-SE` and `en-US`.
- Existing settings without `uiLocale` resolve to `sv-SE`.
- Unknown locale values fall back deterministically to `sv-SE`.
- Changing `uiLocale` never rewrites recordings, observed captions, instructions,
  semantic documents, or exports.
- `src/ui/i18n.js` is the single owner of interface translations.
- UI elements opt in through stable `data-i18n` keys; dynamic text uses
  `T9UiI18n.translate` or `T9UiI18n.format`.
- Static controls created by existing views use a constrained bidirectional
  label dictionary. Translation is limited to interface elements such as
  buttons, labels, options, headings, and table headers.
- Review instructions, comments, observed Business Central labels, screenshots,
  and the rendered Semantic Document are explicitly excluded from interface
  translation.
- Dynamically inserted controls are translated incrementally. The observer only
  inspects added interface subtrees and does not rescan the complete page.

## Milestones

The first milestone established storage, language selection, runtime switching,
and the shared module. The second milestone localizes the recorder popup,
Document Library, BC Review Studio, BC Document Generator, and their primary
dialogs and status messages. Technical/debug surfaces and a complete audit of
generated accessibility labels are covered by the third milestone. Technical
evidence, raw diagnostics, AL call stacks, telemetry values, observed content,
and user-authored report fields remain source content and are never translated.
