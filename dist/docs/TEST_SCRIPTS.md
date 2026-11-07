# Test scripts

A test script turns a process document into a manual test that can be run again, for example after a Business Central upgrade.

## Creating a run

**Run test** in a documentation card's menu in the document library builds the document the same way Word export does (`T9WordExportPipeline.createPresentation`), in the document language and with the user's edits, and takes the workflow steps from it (`src/document/test-script.js`). Bug reports and recordings in progress do not offer it. The run opens on its own page (`test-run.html`).

Each step keeps its number, the heading it is under and its instruction as the document reads. The expected result of a step starts from the verification notes written for it and is otherwise empty for the user to write; the recording's own observation of a step is not used, since it is generated text in one language and not a statement of what should happen. The process's expected result is shown when the user wrote one in the review.

## Running

The tester marks each step Passed, Failed, Skipped or Not run and can add a comment, a tester name and the environment tested. Every change is saved automatically with a visible state; a failed save keeps the changes on the page and offers a retry. The summary counts the results: the run has failed as soon as one step failed and has passed when every step passed or was skipped.

**Run again** starts a new run with the same steps and expected results and nothing tested. A run made later from the document takes the expected results written in the latest earlier run of the same document for steps that have none, matched by the step's identity in the document. Earlier runs of the document are listed with their results.

**Export Markdown** saves the run as a table in the document language and reports it as saved only after the browser has written the file.

## Bug report from a failed step

**Create bug report from this step** is offered on a failed step once the tester has described what happened. The report gets a recording of its own without events and holds the document's steps up to the failed one as the user's reproduction steps, the step's expected result and the tester's description as the actual result, and `source` naming the test run and step. The step then links to the report. Nothing is invented: the texts are the document's and the user's own.

## Storage

Each run is stored under `t9_test_run_<id>` (`TEST_RUN_PREFIX`) and names the recording it tests (`sessionId`). Runs use `schemaVersion` 1; unknown fields are kept and an unknown schema version is refused without changing the stored run. Deleting a document deletes its test runs; bug reports made from them are kept. Nothing is sent outside the browser.
