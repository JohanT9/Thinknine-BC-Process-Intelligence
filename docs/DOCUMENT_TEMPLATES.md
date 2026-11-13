# Document templates

A document template decides how process documents look and which sections they show. It
never changes what has been written in a document. Templates are made in
**Settings → Document → Document templates**, last in that section.

## What a user can do (phases 1–3)

- See the built-in templates (BC Process Studio, Minimal, Corporate) with a preview of how
  the document starts in Word: the cover page (centred, with document type, title, subtitle
  and the details table) and the next page with the first heading. Without a cover page the
  preview shows one page. Built-in templates cannot be changed; **Copy and edit** makes an own template
  from one.
- Make an own template (**New template** starts from the current default template, **Copy**
  from any template) and set its name, logo, company name in the document, colour, font,
  footer, sections and default texts. Changes
  are saved as they are made, with *Saving… / Saved / could not be saved* and **Try again**.
  A change that could not be saved stays in the editor.
- See in the editor how many documents use the template and whether new documents get it;
  **Make default** is there too.
- Choose the template new documents get (**Make default**). New documents get the default
  template; existing documents keep theirs.
- See and change a document's template where it is edited: **Template** under the title lists
  the templates, and changing it shows the new look at once without changing the content.
  **Edit templates…** closes the document (it saves first) and opens the template settings.
  A template that is not on this computer is listed as such, with the template it is shown with.
- See each document's template on its library row.
- Give documents another template from the library: select documents and use **Template**.
  The library filter **Template** lists the templates documents use.
- Remove an own template. Its documents get the default template (BC Process Studio when the
  removed template was the default); their content is not changed. The dialog says how many
  documents use the template and that removing cannot be undone.
- Take templates to other computers: they come along with exported and synchronised
  documents, and a template can be saved as a file and imported by a colleague (phase 3,
  below).

Documents follow their template: a change to a template shows in every document that uses it,
in the preview and in the next Word export.

## What an own template does to a document

| Part | Word | Preview |
| --- | --- | --- |
| Header on every page | logo (at most 160 × 36 pt), company in bold, document name right-aligned, line in the template colour. A template made from one with a header band (BC Process Studio) keeps the band: logo, then company (or the base template's name), Business Central and the document name, in the base band colour until the colour is changed and then in a dark shade of the new colour | the same band above the document |
| Cover | logo (at most 260 × 90 pt) and company above the title; without a company of its own, the base template's name (BC Process Studio) | the same |
| Footer | the template's footer text; `{page}` becomes the page number field. An empty footer looks as in the template that was copied: BC Process Studio for a copy of it, otherwise the document name, and the page number | the same, page 1 |
| Colour | headings, heading lines, step headings and table labels | the same |
| Font | the whole document | the same |

The colour is darkened until text in it has at least 4.5:1 contrast on white, and the editor
says so when that happens. Footer fields can be written in any registered language, for
example `{dokument}`, `{datum}`, `{sida}` or `{document}`, `{date}`, `{page}`. The date is
the date the document is exported, in the document language.

The preview in the editor is drawn from the same document plan as Word, so it shows the
built-in templates' own headers (for example the BC Process Studio band) as they are.

## Sections and default texts (phase 2)

- **Sections in the document:** cover page, table of contents, purpose, prerequisites,
  expected result and revision history can each be left out; the workflow is always shown.
  A section left out is only not shown: the document keeps its content and shows it again
  when the section is selected. The quality check still reads the whole document, so a
  section the template leaves out is not reported as missing.
- **Table of contents** (off by default) comes after the cover, or first without one. Word
  fills it in when it opens the file: it asks whether to update the document's fields, and
  the editor says to answer Yes. Documents without a table of contents open without that
  question. The preview lists the headings and steps without page numbers.
- **Default texts** for Purpose and Expected result. Order of precedence:
  - Purpose: the recording's own purpose, then the template's text, then the standard text.
  - Expected result: the document's own text, then the template's text, then the standard
    text from Settings → Document, then the built-in text.
  A template's text is the user's own text and is not translated.
- Built-in templates show every section except the table of contents, as before.
- Settings → Document now names the two company fields by what they do: *Business Central
  company* (library and file name `{company}`) and, in the template, *Company name in the
  document*.
- **Document language is not part of the template.** New documents already get the language
  set under Settings → Document, and each document's language can be changed in the
  document. A second place to choose the same default would be confusing.

## Phase 3: templates on other computers

A template keeps its id wherever it goes, so the documents that name it follow it on every
computer. The same rule applies everywhere: a template that is not here is added, an
identical one is left alone, and one here is replaced only by a version changed later
(`updatedAt`). A template changed later here is kept.

- **Library export and import.** The export file's header lists the own templates that the
  exported documents name (`templates`, left out when there are none, so earlier versions read
  the file as before). The import preview lists new templates and names each template that is
  updated, because the documents that use it change their look. An import that only brings
  newer templates can still be run. Templates are written after the documents. If the import
  fails they are put back, and undoing the import removes the templates it added and restores
  the ones it replaced. A template changed again after the import is left as it is.
- **Synchronisation.** Each computer's manifest lists all its own templates, logos included.
  A template changed later on another computer replaces the one here. When both computers
  changed it, the later change wins on both. A template removed here is not fetched again
  (the sync state remembers it) unless it is changed on another computer afterwards. Removing
  a template is not carried to other computers: their documents keep following it there.
  A manifest from an earlier version has no templates and changes nothing.
- **Sharing with a colleague.** In the template editor, *Save as file* writes a
  `.bcpt` file (`{ format: "bc-process-studio-template", formatVersion: 1, exportedAt,
  appVersion, template }`). It is reported as saved only when the browser has written it.
  *Import template…* in the list adds the template from such a file. When a different version
  of the same template is already here, the user is asked: replace their template (it then
  counts as changed now, so synchronisation does not bring the replaced version back), keep
  both (the file's template is added as a copy with a new id), or cancel. A file from a newer
  version, or one that is not a template, is refused with a message.
- The default template stays a choice per computer.

## Storage and compatibility

- Each own template is stored in `chrome.storage.local` under
  `t9_document_template_<templateId>`; the default template id is under
  `t9_default_document_template` (constants in `src/engine/storage-keys.js`).
- A template is `{ schemaVersion: 1, templateId, name, baseThemeId, company, color, font,
  footer, logo: { dataUrl, width, height } | null, sections: { cover, toc, purpose,
  prerequisites, expectedResult, revisionHistory }, purposeText, expectedResultText,
  createdAt, updatedAt }`. A template saved before phase 2 has no `sections` and shows every
  section, as before; earlier versions keep the new fields when they save. Unknown fields
  are kept. A template with a newer `schemaVersion` is not read or changed; the settings say
  how many such templates there are.
- A logo is drawn to a PNG of at most 800 × 300 pixels when it is chosen (PNG, JPG, SVG or
  WebP, at most 2 MB in).
- A document names its template in its library record (`theme.themeId`, with `displayName`).
  Built-in template ids are the built-in theme ids, so existing documents keep their look.
  A document naming a template that is not here (removed, or not yet imported or
  synchronised) keeps naming it and is shown with the default template.
- Bug reports are not affected.

## Code

- `src/document/document-template.js` — model, footer fields, colour contrast, theme
  overrides, storage functions.
- `src/exporters/word-export-pipeline.js` — `resolveTheme` lays an own template over its
  base theme; `arrangeSections` decides the planned sections; the logo is required media.
- `src/document/review-document-projector.js` — the template's purpose text.
- `src/exporters/word-document-adapter.mjs` — header, footer page field, cover logo and
  updating fields when there is a table of contents.
- `src/document/document-workspace.js`, `src/ui/document-workspace-view.js` — preview bands
  cover logo, table of contents, and heading and step colours as in Word.
- `src/document/library-transfer.js` — templates in the export header, the import plan,
  writing, rollback and undo.
- `src/document/library-sync.js` — templates in the manifest and which ones are fetched.
- `src/ui/dashboard.js` — loading templates, the settings editor, the template file, library
  batch and filter, import and synchronisation.
- Tests: `tests/document-template.test.mjs`, `tests/document-template-transfer.test.js`.
