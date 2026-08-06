# Presentation Grammar 4.6 R3.2

## Executive summary

Presentation Grammar is the renderer-neutral owner of visual instruction
grammar. It makes actions, interface elements and user values immediately
distinguishable in both Document Workspace and Word without changing Review,
workflow meaning, screenshots or document structure.

## Pipeline and responsibility

```text
Review -> Projector -> Semantic Document -> Semantic Interaction Rules
  -> Language Excellence -> Presentation Grammar -> Screenshot Intelligence
  -> Profile -> Theme -> Planner -> Document Workspace / Word
```

Language Excellence owns wording quality. Presentation Grammar consumes that
output and attaches immutable presentation runs to paragraph blocks. Each run
contains natural text and a semantic presentation role. The planner only carries
those runs into the Document Plan; renderers translate them to DOM or DOCX.

The layer does not access Review, source events, image bytes, UI, Planner or a
renderer. Results are cached only for immutable document revisions. Unknown
fields and future block kinds survive unchanged.

## Philosophy and formatting rules

The grammar separates three concepts:

| Concept | Representation | Example |
| --- | --- | --- |
| Action | normal text | `Ange` |
| Interface element | quotation marks | `"Antal"` |
| Entered or selected value | bold | **500** |
| Keyboard shortcut | monospace | `Ctrl+S` |
| Technical identifier | monospace | `Table 27` |

Structured Semantic Actions are authoritative. For legacy prose, the existing
markers remain compatible: `__value__` becomes a bold value, `**label**` becomes
a quoted interface element and backticks become monospace. Unmarked legacy text
is preserved as natural text.

## Wording hierarchy and examples

Presentation Grammar uses the Semantic Action's explicit action type, target
field and selected value. It never guesses from screenshots or visual position.

- Before: `Välj **136** i "Nr".`
- After: `Välj "Nr" **136**.`
- Before: `Ange **500** i Antal.`
- After: `Ange **500** i "Antal".`
- Before: `Sätt "Spärrad" till **Nej**.`
- After: `Inaktivera "Spärrad".`

The boolean form is used only when the Semantic Interaction Rules Engine has
already established enable/disable intent.

## Renderer neutrality and accessibility

The plain paragraph text is the concatenation of all runs and contains no
formatting markers. Screen readers therefore receive a normal sentence without
spoken Markdown artifacts. Document Workspace maps bold to `strong` and
monospace to `code`. Word maps the same runs to bold and fixed-width `TextRun`
properties. Quotation marks remain part of natural accessible text.

## Extension strategy

New presentation roles can be added to the run contract without changing
semantic actions. New action types should add one deterministic grammar mapping
and behavior tests. Renderers may map a supported role visually, but must retain
the run text when the role is unknown. Future PDF or HTML adapters consume the
same Document Plan runs and must not recreate grammar rules.

## Compatibility and verification

Existing Reviews need no migration and Presentation Grammar output is never
persisted back to Review. Tests cover structured selection, field entry,
options, booleans, legacy text, shortcuts, identifiers, immutable processing,
future-field preservation, Document Workspace output, screen-reader text and
DOCX bold formatting.
