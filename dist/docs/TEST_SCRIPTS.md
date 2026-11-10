# Test scripts

A test script turns a process document into a manual test that can be run again, for example after a Business Central upgrade.

## Creating a run

**Run test** in a documentation card's menu in the document library builds the document the same way Word export does (`T9WordExportPipeline.createPresentation`), in the document language and with the user's edits, and takes the workflow steps from it (`src/document/test-script.js`). Bug reports and recordings in progress do not offer it. The run opens on its own page (`test-run.html`).

Each step keeps its number, the heading it is under and its instruction as the document reads. The expected result of a step starts from the verification notes written for it and is otherwise empty for the user to write; the recording's own observation of a step is not used, since it is generated text in one language and not a statement of what should happen. The process's expected result is shown when the user wrote one in the review.

## Running

The tester marks each step Passed, Failed, Skipped or Not run and can add a comment, a tester name and the environment tested. Every change is saved automatically with a visible state; a failed save keeps the changes on the page and offers a retry. The summary counts the results: the run has failed as soon as one step failed and has passed when every step passed or was skipped.

**Run again** starts a new run with the same steps and expected results and nothing tested. A run made later from the document takes the expected results written in the latest earlier run of the same document for steps that have none, matched by the step's identity in the document. Earlier runs of the document are listed with their results.

**Prerequisites** say what must be in place before the test starts. **Test data** names the values the steps work with, such as a customer or an item; an expected result can name a value as `{Name}` (matched without regard to case), and the page and the panel show the expected result with the values filled in. An unknown name is left as written. A run made later from the document takes the prerequisites and test data of the latest earlier run when it has none of its own. The panel shows both in a collapsible block above the step.

**Export** saves the run as Markdown or as a CSV file for Excel, in the document language, and reports it as saved only after the browser has written the file. The CSV file has one row per step with the expected result filled in, starts with a byte order mark so that Excel reads it as UTF-8, separates columns with a comma for an English document and a semicolon otherwise, and keeps a cell that would start a formula as text.

**Test protocol** opens the run as a page to print or save as PDF (`test-protocol.html`): the outcome and counts, tester, environment, dates, prerequisites, test data, the steps with their results and comments, the screenshots (optional) and lines for the names, dates and signatures of the tester and the approver. The protocol reads in the document language; the toolbar above it follows the interface language and is not printed.

## Beside Business Central

**Run beside Business Central** on the test page opens the run in the browser's side panel next to the open Business Central tab (`src/ui/test-panel.html`), preferring a tab in the tested environment. The panel shows one step at a time with its expected result, the result choices, a comment and the step's screenshots. Choosing Passed or Skipped moves to the next step without a result; Failed stays on the step so that the tester can describe what happened. Previous, Next and Go to step move freely. The browser opens a panel only straight from a click, so the page looks up the Business Central tab beforehand; with no tab open it says so.

The page and the panel change the same stored run. Each sends only the fields that changed (`T9_UPDATE_TEST_RUN`), the background applies the changes to one run one at a time, and each page shows a change made in the other through storage while keeping its own changes that are still waiting to be saved.

## Screenshots

**Take screenshot** stores a picture of the Business Central tab with the step, up to ten per step. In the panel it is the tab shown beside it; on the test page that tab is shown for the moment of the capture and the page is shown again afterwards. Values on the page are measured as in a recording. The browser captures a tab only once the user has used the extension on it (`activeTab`), for example by choosing its toolbar button while the Business Central tab is shown; site access alone is not enough, and opening the popup from code does not count. Until then the capture fails with a message that says so (`test.screenshotNeedsAccess`), and the access lasts while the tab stays open on Business Central.

The test whose page or panel was opened last is the active test (`t9_active_test_run`). The toolbar popup on a Business Central tab shows it at the top, with its progress and **Continue test**, as long as it has steps not yet tested; it is not offered during a recording. **Continue test** opens it in the panel, and because it starts from the toolbar button, screenshots of that tab work without a further step.

Opening the popup on a Business Central tab is remembered for the browser session (`t9_test_access_tabs` in session storage) until the tab closes or leaves Business Central. On a tab where a test runs without that, the toolbar button gets a `!` that blinks a few times and then stays, with a tooltip saying what to do, and the panel shows the same instruction above the step (when the button is not pinned to the toolbar, `chrome.action.getUserSettings`, the instruction points to the browser’s Extensions menu instead and suggests pinning it, since the mark is not seen there); both go away when the popup is opened on the tab. A capture refused by the browser removes the tab from the list again. The mark is not set while recording, and clearing it gives the tab the button's own badge back. A screenshot can be opened full size or deleted. Screenshots are stored under `t9_test_shot_<recording id>:<test run id>:<screenshot id>` (`TEST_SCREENSHOT_PREFIX`), belong to the tested document in library export and sync, and are deleted with the document. **Run again** starts without screenshots.

## Bug report from a failed step

**Create bug report from this step** is offered on a failed step once the tester has described what happened. The report gets a recording of its own without events and holds the document's steps up to the failed one as the user's reproduction steps, the step's expected result and the tester's description as the actual result, and `source` naming the test run and step. The step's screenshots go with the report as its screenshots, with the measured values, so the report covers values the way it does for a recording. The step then links to the report. Nothing is invented: the texts are the document's and the user's own.

## Storage

Each run is stored under `t9_test_run_<id>` (`TEST_RUN_PREFIX`) and names the recording it tests (`sessionId`). Runs use `schemaVersion` 1; unknown fields are kept and an unknown schema version is refused without changing the stored run. Deleting a document deletes its test runs; bug reports made from them are kept. Nothing is sent outside the browser.
