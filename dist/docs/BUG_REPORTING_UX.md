# Bug Reporting UX

Bug Reporting is a first-class recording mode beside Process Documentation. From the extension popup, a consultant selects **Report a Bug** once and immediately reproduces the problem in Business Central. Naming is intentionally deferred until Stop, so no title, severity, destination, telemetry, or AI configuration blocks capture.

While recording, text—not color alone—identifies the active mode. Error detection is acknowledged without interrupting the Business Central dialog. Failure to collect diagnostics does not invalidate the recording.

Stopping finalizes the canonical recording, creates a local Bug Report draft with a deterministic evidence-based title, and opens its Technical Report Workspace directly. The title remains editable in the automatically saved report. Process-documentation recordings retain their separate naming and language flow.

The workspace prioritizes editable human context, reproduction, expected result, actual-result context, captured errors, and screenshots. Reproduction wording can be corrected and irrelevant steps excluded in a collapsed inline editor without modifying the captured source events. Excluded steps remain available there and can be included again after saving or reopening. Exact BC error text is visible and copyable. The captured error screenshot is shown first and supporting screenshots are collapsed. Environment, diagnostics, structured/raw AL call stack, objects, telemetry, timeline, and traceability are progressively disclosed under **Technical details**. A readiness message is shown only when required information is missing.

Open report-information, reproduction, screenshot, and technical-detail disclosures retain their open state while edits and autosaves re-render the report.

Edited reproduction wording can be reset to its generated source text. Pressing Enter in a step field commits the change through the same reversible autosave history.

New reports receive an editable title in the document language. When captured
error evidence identifies a reproduction step, its Business Central action,
field, or page supplies the title context. A user-entered title is never replaced.

At narrow widths and high zoom, header actions wrap, reproduction editing becomes
single-column, and the sharing dialog is bounded by the visual viewport. Controls
remain reachable without horizontal page scrolling.

Sharing choices, inclusion status, and accessible dialog labels follow the
selected interface language. Captured Business Central evidence remains verbatim.

The main report reads as one continuous document with subtle section dividers. Card borders are reserved for editable input, required attention, and collapsed technical content instead of surrounding every generated section.

Reproduction screenshot captions identify the visible report step they support. Error screenshots keep their explicit error-evidence label.

**Mask values** is chosen in each report. A bug report recording keeps the values it captures, except passwords, secrets, tokens and API keys, which are always masked at capture; other recordings mask as before. When a report is created, its steps are derived twice: from the captured values, and from the values masked as a recording masks them (amounts, email addresses and IDs, plus customer, vendor and item numbers when those settings are on), with placeholders in the document language. A masked step is used only when it comes from exactly the same recorded events, since a placeholder can make interpretation drop or merge a step; the step's own values are also replaced where they are marked in its text, so no value the mask hides remains. New reports mask by default. The choice applies to the report view, PDF, email, summary and issue package, survives regeneration and is stored with the report (`privacy.maskValues`). Step text the user edited is shown as written, and the step editor starts from the text the report shows, so editing a masked step does not bring its values back. Captured Business Central error messages and screenshots are not masked, and reports made before this change keep the values they were recorded with.
A collapsed screenshot chooser lets users exclude irrelevant images and restore them later. The choice affects the report and shared package only; captured source assets remain unchanged.

When the user adds context about what happened, that description appears before the exact captured Business Central error in the rendered report and remains present in exports and shared issue packages.

Telemetry is optional and user-triggered. The report is shared as a PDF by email or saved as a PDF or Markdown file; Email PDF is emphasised once the report is complete and states the expected result.

**Send directly** sends the report from the signed-in user's own mailbox through Microsoft Graph (`/me/sendMail`, delegated **Mail.Send**), with a copy saved in Sent Items. Nothing passes through BC Process Studio's own services. The permission is requested only for direct sending, so drafts (Mail.ReadWrite) keep working where Mail.Send is not approved. The email is prepared first and shown with recipient, subject and attachment; it is sent only from that confirmation. The To field starts with the support address and, like the Cc field, accepts several addresses separated by commas or semicolons; repeats are dropped and an invalid address is marked at its field, so nothing is sent until every address is valid. While the user types, the fields suggest addresses that reports have been sent to from this browser (up to 20, kept only in the extension's local storage under `t9RecentRecipientsV1` and saved only after a confirmed send) and, once the user has approved delegated **People.Read** through the Search people in Microsoft 365 button, matching people from Graph `/me/people`. The typed text is sent to Microsoft Graph only for that search; typing only ever tries silent sign-in, so a sign-in window opens only from the button. Suggestions are a listbox with arrow-key, Enter and Escape handling; Escape closes the list without closing the dialog. A request without a confirmed answer is reported as possibly sent, the confirmation closes, and nothing is retried automatically.

**Copy summary** puts the title, severity, visible reproduction steps, expected result and actual result (the user's description and the captured Business Central errors, verbatim) on the clipboard in the document language, as formatted HTML and plain text. It sends nothing itself.

Autosave never redraws the report on its own: a save that does not change the report updates only the save status. When an edit redraws the report, the focused field keeps its focus, cursor and any text typed into it that is not yet committed. Exports show progress, disable the export actions while they run and report a file as saved only after the browser download has completed. Regenerating from the recording is confirmed in a translated dialog with Cancel focused.

Advanced merge, split, and screenshot-change controls remain in Review; the bug-report workspace intentionally exposes only wording correction and report inclusion.
