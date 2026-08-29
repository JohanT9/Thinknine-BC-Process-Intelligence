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
  `T9UiI18n.translate`.

## Milestones

The initial milestone establishes storage, language selection, runtime switching,
and the shared module. It localizes representative application-shell text in the
dashboard and recorder popup. Full dashboard, workspace, dialog, technical view,
and accessibility-string coverage follows in later localization milestones.
