# Visa mig (Show me)

A document can guide the user through its process inside Business Central. The user chooses
**Visa mig** in the review toolbar or in a document's menu in the library. A side panel opens
beside Business Central with one step at a time. The field or button of the step is outlined in
Business Central, and the guide moves on by itself when the user has done the step.

## Parts

| Part | File | Role |
| --- | --- | --- |
| Guide steps | `src/document/guide-steps.js` | The document's workflow steps (as Export Word presents them) with each step's target: a field by its AL name, an action by its AL name or as the client's New, the recorded caption as a fallback, or no target. |
| Guide job | `src/ui/dashboard.js` (`createGuide`, panel job `show-me`) | Builds the guide in a hidden library frame, as the recording panel's Word export and test jobs do. |
| Opening | `src/ui/dashboard.js` (`showMeGuide`) | Opens `guide-panel.html?projectId=…` in the side panel of the Business Central tab's window. The browser opens a panel only straight from a click, so the tab is looked up beforehand. |
| Panel | `src/ui/guide-panel.html`, `src/ui/guide-panel.js` | Shows the step, the hint and the screenshot; connects to the Business Central tab shown in its window (`chrome.tabs.connect`, port `t9-guide`). |
| In Business Central | `src/recorder/guide-overlay.js` | In every frame: finds the target, draws the ring (`pointer-events: none`), reports every second whether it sees the target and whether the step's page is shown, and reports `done`. |
| Actions | `src/recorder/al-identity-capture.js` (MAIN world) | On the event `bcps-guide-find`, looks the action up in the client's control registry and marks its button with `data-bcps-guide`. |

## How a step counts as done

- **Field:** the field (or a field with the same AL name, for another line) gets a new value that
  is not empty, when the user leaves it, presses Enter or chooses a value in its lookup list.
  A check box counts when it is turned. While the field's lookup list is open (the combo box
  says aria-expanded, or Business Central's Lookupform… page is shown below a field with a
  popup), Enter only filters the list and leaving the field chooses from it: the value counts
  when the list has closed, also when the focus is back in the field. The lookup list's own
  columns never count as the step's field, though they share AL names (the vendor list's Nr is
  No., as the item number on a line). Business Central filling the field itself after the user
  filled another one (the vendor's name from its number) also counts, once the user has typed or
  clicked in that frame since the step was shown.
- **Search hint:** the panel says what to do with the part outlined: open the search, type in the
  search box, or click the page's row when it is already in the list (as among the latest pages).
- **Action:** a click on the outlined button, or the same action recognised from its AL
  identity, such as a keyboard shortcut.
- **Search:** a page opened by searching. The ring follows the user: the search button in the navigation bar (by the name the recording saw, such as Sök, or Business Central's word for search), then the search box of the open search dialog, then the page's row in the results (it starts with the page's name, as Inköpsorder Listor). The search button is looked for only in the tab's own page (the navigation bar), never in the client's frame, where a button of the page could share its name. Clicking that row, or Enter in the box while it is shown, completes the step; so does the page itself being shown, when the recording kept its AL name.
- **No target:** the user chooses **Jag har gjort det**.

## Only what the user can see is outlined

Business Central keeps the list a card was opened from in the page beneath the card, with
buttons of the same AL name (Släpp on the list and on the card). A button or field with
something else on top of it is skipped, both in the overlay and in the MAIN-world lookup, so the
card's own is outlined. Something below the bottom of the window still counts as shown.

Of several fields with the same AL name, the one with keyboard focus (or in the row being worked
on) is outlined. Otherwise the one in the dialog opened last comes first, then one inside the
window, then the page's order. Without this, Direkt styckkostnad in Ändra tillämpad direkt
enhetskostnad lost to a field of the same name further down the page behind the dialog, and the
ring was out of sight until the field got focus.

## Paths are guided one click at a time

A step the document writes as a path ("Välj Rad → Tillämpat inköpspris och rabatt") is one step
in the document but one guide step per click: first **Rad**, then the action. Each part gets its
own sentence in the document's language from the step-text templates ("Välj Rad."). The parts are
found by the captions the recording saw. A step whose text no longer names every part, because
the user rewrote it, stays one step as written.

The panel never moves keyboard focus when the guide moves on by itself, so the user can keep
typing in Business Central. A click in the panel keeps the focus in the panel.

## What the user sees when the target is not found

- Not on a Business Central tab: go to the Business Central tab.
- No frame answers: the guide loads its scripts into a tab opened before the extension was
  installed or updated; if that fails, it asks for a reload (F5).
- Field or button on the page but beneath a window still open on top of it (a step that closes
  the window was not recorded as a step of its own, as the X of Tillämpat inköpspris och rabatt,
  which has no name): close the window, and it is outlined.
- Field or button not on the page shown: where it may be (a collapsed FastTab, or a menu such as
  Fler alternativ), and the page the step is done on when that page is not shown.

## Privacy and integrity

The guide reads Business Central's page and the extension's own document. It clicks, types and
changes nothing in Business Central, and sends nothing outside the browser. It does not record:
a guide is not evidence that a step succeeded.

## Not covered yet

- Values: the guide does not compare the value typed with the document's example value.
- Partner apps whose controls carry no AL name are found only by their recorded caption.
- An action inside a closed menu is not outlined until the menu is opened.
