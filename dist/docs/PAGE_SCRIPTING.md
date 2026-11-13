# Page Scripting tests from a recording

Business Central's Page Scripting tool (preview) replays a flow from a YAML file, in the client
or with `@microsoft/bc-replay`. BC Process Studio writes such a file from an ordinary
recording, so the documentation and a replayable test come from one recording, without
symbols and for standard, ISV and customer code alike.

## What the user does and sees

1. Record the flow with BC Process Studio as usual.
2. In the library, choose ⋯ › **Save as Page Scripting test** on the document. The file goes
   to the browser's downloads, named after the document.
3. The message says how many steps the test has and names any step that could not be included
   (and why the test may then stop there). A recording made before this version says to
   record again.
4. In Business Central, open Page Scripting, open the file and play it.

The test is made from what the user did, not from every click: a record chosen in a lookup is
entered as its number, text typed and then erased is left out, repeated clicks count once, and
the answer to a question whose step is missing is left out too. Steps hidden in the document
do not change the test; the file is made from the recording.

## Findings (spike 2026-11-13, BC 29 online, sandbox)

A Page Scripting file can be produced from a BC Process Studio recording alone. Everything the
file needs is held by the web client's JavaScript objects (not by the HTML), readable from the
page's own world (MAIN), for standard, ISV and customer code alike:

| Page Scripting needs | Found in the client |
|---|---|
| `page`, `part`, `repeater`, `field` | element `_adapter.$logicalControl`: `designName` and its `_parent` chain (`name` may be numeric; `designName` is the AL name) |
| `action` (ribbon, menus, lines) | React prop `data-control-id` → `$logicalControl._context.controlRegistry.controlLookupById[id]` → `actionReference.targetName` (actionref) or `designName` |
| page-level telemetry | React `keytipProps.telemetryData` ("Control name", "Page name", "Page id") on ribbon buttons |
| dialog `automationId` | dialog `_adapter.$buildController._childAdapters.items[0].containerController.attachedForm.controlIdentifier` |

Replay results with a file reduced to what the recording knows (`invoke`, `input`,
`set-current-row` only; no `focus`, `page-shown`, `page-closed`, `runtimeRef`, `runtimeId`):
19 of 19 steps passed on a purchase order (new order, vendor and item lookups, new line,
delete line with confirmation, ISV action and ISV page, Release, Reopen). Without the dialog's
`automationId` replay stops at the confirmation. Without `repeater: Control1` field steps on
lines fail (earlier spike).

System operations are written as `invokeType` on a target, not as actions: New in a list
(`action: Control_New` + `New`), new line (`part` + `New`), delete line (`repeater` + `Delete`),
dialog Yes (`page: null` + `automationId` + `caption` + `Yes`), close a modal page (`page` +
`Cancel`). Lookups use `page: lookup:<field>`, `repeater: repeater` and `invoke` with
`AlwaysCommit: true`, after either typed text (`isFilterAsYouType`) or `set-current-row`.

Still open: how the client marks a system operation (the registry control for New line has a
GUID name), which row a lookup selection was (`relative`), value formats for dates and
decimals, and how stable these internal structures are across BC releases (twice a year).

## How it works

- `src/recorder/al-identity-capture.js` (MAIN world, `document_start`, all frames) reads the
  identity above on `pointerdown`, `focusin` and Enter/Space, and hands it to the content script
  as a JSON string in the synchronous CustomEvent `bcps-al-identity` on the element.
  `content.js` keeps it per element and adds it to the recorded event as `alIdentity`
  (`{ v: 1, kind: field | action | menu | system | dialog | row | control, path, field,
  action, operation, automationId, caption, rowIndex, value, trace }`). The only value read
  there is the text of the cell clicked in a list (`value`), the record a lookup choice picks.
- `src/document/page-script-export.js` turns the raw recording into steps: `navigate` to the
  first page, `invoke` for actions, system operations and dialog buttons, `input` for the last
  typed value of a field, and for a lookup choice an `input` of the chosen record's value (from
  the cell, or the quoted record in the row's accessible name, such as `Välj posten "30043"`).
  A search text and a row position depend on the data and do not replay reliably, so they are
  not written. Only when no value is known does the file use the lookup itself: an empty
  `input` with `isFilterAsYouType` that opens it, the typed filter, `set-current-row` and
  `invoke` on `lookup:<field>` › `repeater`. Text typed and then erased is not a step. Business
  Central's own line actions (New line, Delete line) are recognised by their fixed id; Delete
  targets the list of lines. OK on a page shown over another is `invokeType: LookupOk`, as Page
  Scripting records it (plain `OK` passes in replay but leaves the page open); closing a page
  with its ✕ is `Cancel`; a confirmation such as "Delete?" is `Yes`/`No` on `page: null` with
  its `automationId`. A masked value, a click without identity and an unrecognised
  system action are listed in `skipped`.
- Library › ⋯ › **Save as Page Scripting test** asks the background (`T9_BUILD_PAGE_SCRIPT`, not
  allowed from a page) for the file, hands it to downloads and names any step that was left
  out. A recording made before this version says to record again.
- Verified by replay in Business Central 29 (2026-11-13): a purchase order from the list with
  vendor and items entered by number, a manual price on a page over another (`LookupOk`),
  closing that page with its ✕, a new line and Release (14 of 14 steps), and Delete line from
  a line's ⋯ menu with Yes.

## Typed values and privacy

A Page Scripting test has to enter exactly what the user typed, but a process recording masks
amounts, email addresses and IDs (and customer, vendor and item numbers when chosen) at
capture. `T9PrivacyMask.keepTypedValue` (`src/engine/privacy-mask.js`), called where raw
events are stored in `background.js`, keeps the typed value of a `field-change` from the user
(`inputSource` `input` or `change`) beside the masked value as `typedValue` when masking
changed it. Values the client showed (`validated`, `focusout`), empty values and passwords,
secrets, tokens and keys are not kept. Only the Page Scripting export reads `typedValue`;
documents, Word/PDF exports and bug reports read the masked value as before. The raw recording
holds it on this computer, and it goes along in the recording ZIP, the library export (.bcps)
and library sync, like the values a bug report recording keeps.

## Limits

- A test that starts on a card page (for example Purchase Order) replays on whichever record
  is open; one that starts in a list is more predictable.
- The client's internal structures read in the page may change between Business Central
  releases (twice a year); the export says when it cannot name a step instead of guessing.
- Replay remains Microsoft's; BC Process Studio only writes the file.

## Shelved: keeping a saved Page Scripting file

An earlier prototype kept a Page Scripting file that the user saved in Business Central with
the document (capture of the file write in the page, a notice with Undo, and a stored record
`t9_page_script_<sessionId>`). It worked, but recording with two tools at once was too
cumbersome and Page Scripting's own pane was recorded as steps, so it was shelved unreleased in
favour of the export above. The code is kept as a patch outside the repository.
