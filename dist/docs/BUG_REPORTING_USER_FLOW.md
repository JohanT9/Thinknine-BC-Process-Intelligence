# Bug Reporting User Flow

1. Open Business Central and the BC Process Studio extension.
2. Choose **Report a Bug**. Recording begins in one action.
3. Reproduce the problem. If BC shows an error, its observable text, details, and screenshot are captured when available. Silent functional problems are also supported.
4. Choose **Stop and open bug report**. The local draft opens directly with an automatically generated, editable title.
5. The report focuses the first required field that is still missing.
6. Review the generated title and reproduction, then add what should have happened and any useful actual-result context.
7. Review the captured BC error and evidence. Expand **Technical details** only when needed.
8. Changes save automatically. Email the report as a PDF, export the PDF or Markdown, or optionally fetch telemetry.

No BC error dialog is required. Missing telemetry configuration never blocks saving or exporting the report.

## Reporting an error that is already shown

When an error message is already open in Business Central, choose **Report the error shown now** in the extension popup instead of recording.

1. The extension starts a bug recording, captures the open error dialog (message, details and a screenshot) through the same path as a live capture, and stops the recording immediately. Nothing was captured before the user chose the action.
2. If no error dialog is open in the tab, the recording is discarded, nothing is saved and the popup explains that the error must be open.
3. The report opens without recorded steps. It asks for them and opens the step editor, where the user adds, edits and removes their own steps. Written steps are kept when the report is regenerated from the recording.
