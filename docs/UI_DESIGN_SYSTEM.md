# BC Process Studio UI design system

## Purpose

BC Process Studio uses the interaction principles and teal-led colour scale of
Microsoft Dynamics 365 Business Central while retaining an independent Thinknine
identity. Primary actions and links use accessible BC teal, selected and
informational surfaces use pale cyan, and neutral content remains predominantly
white. The application is not a copy of Business Central and does not use
Microsoft product logos or imply Microsoft ownership.

The source of truth is `src/ui/design-system.css`. Page-specific CSS may describe
layout, but shared colours, typography, spacing, controls, focus, borders and
status presentation must use the semantic tokens from that file.

## Current implementation audit

The browser extension uses Manifest V3, plain HTML and browser JavaScript. It has
no frontend framework, component library, icon dependency, client-side router,
Storybook, formatter or type checker. CSS was previously embedded separately in
the dashboard, recorder popup, diagnostics page and technical report workspace.
The application uses Segoe UI with system fallbacks, native HTML controls and
native dialogs. Accessibility support already includes semantic landmarks,
labels, live regions, dialog focus management, keyboard commands, reduced-motion
handling and forced-colour rules. Swedish is the main recorder/review language;
the technical bug-report workspace is currently English. User-visible strings are
still embedded in the HTML and JavaScript; a message catalogue is future work.

The main visual inconsistencies were duplicated raw colours, three distinct
button treatments, card-heavy document results, large radii and shadows, and
different density across the popup, dashboard, diagnostics and bug workspace.
There was no central theme contract or automated design-system coverage.

## Principles

- Favour content over chrome and keep operational information compact.
- Use familiar page, action-bar, list, card and FactBox concepts where they help
  a Business Central user transfer existing knowledge.
- Keep the selected review step as the primary workspace context.
- Use one label for one action and use verb-first command labels.
- Keep secondary diagnostics and settings progressively disclosed.
- Never expose an unavailable product module in navigation.
- Communicate status with text and structure in addition to colour.
- Preserve keyboard access, visible focus and usable 200% browser zoom.

## Tokens

Token names describe intent rather than a particular colour. The core groups are:

- `--colorBackground*`, `--colorText*`, `--colorBorder*`
- `--colorBrand*` and `--colorFocusIndicator`
- `--colorStatusSuccess`, `Warning`, `Danger`, `Information`, `Recording`,
  `Draft`, `Review`, `Approved`, `Published` and `Ai`
- `--fontFamily*`, `--fontSize*` and `--lineHeightBase`
- `--space2` through `--space24`
- `--radius*`, `--shadow*`, `--controlHeight` and `--focusWidth`

Segoe UI is preferred when installed; no proprietary font is downloaded. Code,
identifiers and technical values use Cascadia Mono or Consolas fallbacks.

The current primary colour is `#008489`, with darker hover/pressed variants and
`#e4f5f5`/`#b7e8eb` for subtle and informational surfaces. Semantic success,
warning and danger colours remain distinct; teal must not replace status meaning.

## Component and page patterns

- Primary commands use the brand-filled treatment. Secondary commands use a
  neutral surface. Destructive commands use explicit danger text and border.
- Controls share height, border, radius, disabled state and focus treatment.
- The dashboard heading provides product identity and version context. The
  library keeps its scannable card grid with a secondary preview FactBox.
- Review Studio and BC Document Generator are full-height workspaces with
  command bars, tabs and compact status information. Document Generator uses
  the full available width without a permanent guidance panel.
- Native dialogs remain the modal primitive and retain existing focus handling.
- The popup keeps recording state persistent in text; active recording also has
  a semantic danger accent.
- Technical reports use the same tokens while preserving their denser,
  diagnostic purpose.

No icon runtime was added. The current interface is predominantly text-labelled,
which is clearer and cheaper than mixing icon families. New icons should use
individually imported Fluent System Icons when a build-supported icon layer is
introduced; critical actions must retain accessible text or names.

## Responsive and accessibility rules

At narrower widths secondary context collapses before the main task. Library
rows reduce their columns and Review Studio actions wrap below the selected step.
Animations and transitions are suppressed for reduced-motion users. Native
forced-colour mode is respected. All interactive elements require an accessible
name, a visible focus indicator, and keyboard operation. Dialogs must restore
focus on close. Never use colour as the sole status signal.

## Migration map and remaining work

| Existing area | Shared pattern | Status |
| --- | --- | --- |
| Dashboard / Knowledge Base | Heading, card grid, command bar, FactBox | Migrated |
| Review Studio | Document workspace, tabs, action bar, status strip | Migrated |
| Document Generator preview | Document canvas, view action bar, FactBox | Migrated |
| Recorder popup | Compact task dialog and persistent status | Migrated |
| Diagnostics | Compact technical list | Migrated |
| Technical bug report | Card/document workspace and dialogs | Migrated |
| Inline page-specific CSS | Layout-only rules | Transitional |
| User-visible string catalogue | Localisation service | Not yet available |
| Fluent icon package | Selective icon layer | Deferred until justified |
| Automated browser screenshots | Visual regression harness | Not present |

The transitional inline CSS must not gain new shared colour or control rules.
Future work should extract its layout rules incrementally, introduce a lightweight
message catalogue for Swedish and English, and add browser-driven screenshot and
accessibility checks when an end-to-end harness is adopted.

## Visual evidence

Headless Microsoft Edge captures verify the generated 4.7 UI at representative
widths. Because these are opened as local files rather than as an installed
extension, the red browser-API diagnostic in the captures is expected and is not
a product runtime state.

- [Knowledge Base at 1440 × 1000](assets/ui-4.7-dashboard-1440.png)
- [Knowledge Base at 820 × 1000](assets/ui-4.7-dashboard-820.png)
- [BC Process Recorder at 350 × 700](assets/ui-4.7-recorder-350.png)

## References

- [Business Central user-interface design](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-designing-user-interfaces)
- [Business Central control add-in style guide](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-control-addin-style)
- [Microsoft Fluent 2](https://fluent2.microsoft.design/)
- [Fluent 2 design tokens](https://fluent2.microsoft.design/design-tokens)
