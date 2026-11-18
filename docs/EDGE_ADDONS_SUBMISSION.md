# Microsoft Edge Add-ons submission material

Checked against `src/ui/manifest.json` for version 4.7.265 after the removal of
Application Insights. Recheck the permission inventory and the data-handling
section whenever the manifest, the license service or an integration changes.

## Listing copy

- Product name: **BC Process Studio**
- Short description: Turn Business Central processes into reviewed, reusable
  process knowledge, professional documentation, tests and bug reports.
- Primary use case: Consultant-led capture, review, annotation and export of
  Business Central processes as documents, manual tests, Page Scripting tests
  and bug reports.
- Target users: Business Central consultants, process owners, testers and
  authorized implementation teams.
- Recommended category: Productivity. **HUMAN REVIEW REQUIRED**.
- Support contact: **HUMAN INPUT REQUIRED**.
- Privacy-policy URL/status: **HUMAN INPUT AND LEGAL APPROVAL REQUIRED**. The
  policy must cover everything in "Data that leaves the browser" below.
- Product website: **HUMAN INPUT REQUIRED**.

Long description: BC Process Studio captures authorized user interactions in
Microsoft Dynamics 365 Business Central, keeps the source events and
screenshots in the browser, and creates editable process documentation. Users
review generated steps, correct wording and structure, annotate screenshots and
export Word or PDF documents. The same recordings become manual test scripts,
Page Scripting tests and technical bug reports. Recordings, screenshots and
documents stay in the browser until the user exports, emails or synchronizes
them. Use requires a BC Process Studio license and a Microsoft work account;
the license check sends only technical identifiers, never recorded content.

The listing is shown in every registered language (Swedish, English, French,
German, Spanish, Danish, Finnish and Norwegian Bokmål). Translate the final,
approved copy into each of them; do not submit machine-translated legal text
without review.

## Permission inventory

| Permission | Actual use and source | Production status | Store explanation |
| --- | --- | --- | --- |
| `activeTab` | Active BC page access and visible-tab screenshot capture in `src/recorder/background.js` and popup orchestration | Required | Capture only the tab the user records. |
| `alarms` | Retries pending document-usage statistics every five minutes (`document-usage-sync` in `background.js`) | Required | Deliver the anonymous document count reliably when the network was unavailable. |
| `downloads` | Word, PDF, ZIP, test and library exports through `chrome.downloads.download` | Required | Save user-requested files locally. |
| `identity` | `chrome.identity.launchWebAuthFlow` for Microsoft sign-in: the license (`src/engine/consultant-license.js`) and, when the user chooses it, Outlook email (`src/bug-report/outlook-draft.js`) | Required | Sign in with the user's Microsoft work account. |
| `scripting` | Register/inject recorder scripts into eligible BC frames in background/popup | Required | Start reliable capture in standard and nested BC UI. |
| `sidePanel` | Recording panel and test run beside the Business Central tab (`src/ui/test-panel.html`), opened by the user | Required | Follow a recording or a manual test without leaving Business Central. |
| `storage` | Settings, recordings, reviews, screenshots, documents, tests, bug reports and diagnostics in `chrome.storage.local`; `managed_schema` lets an administrator turn technical diagnostics off by policy | Required | Preserve work between browser sessions. |
| `tabs` | Query the active tab, message frames, open the dashboard and capture the correct window | Required | Coordinate the selected recording tab and product UI. |
| `unlimitedStorage` | Retain screenshot-rich recordings and document projects beyond the normal extension quota | Required for current storage model | Avoid losing larger recording projects. |
| `webNavigation` | Enumerate frame topology for control add-ins and diagnostics in `background.js` | Required | Capture and diagnose Business Central nested frames. |
| `businesscentral.dynamics.com` and subdomains | Capture content scripts; one script runs in the page itself (`al-identity-capture.js`, `world: MAIN`) to read the control identity Business Central exposes | Required | Record only supported Business Central web environments. |
| License service host (`…swedencentral-01.azurewebsites.net`) | License check, trial, consultant registration, usage statistics in `src/engine/tenant-license.js` and `consultant-license.js`; `open-link.js` runs only on its `/open` page and opens the test named in an assignment-email link | Required | Check the license and open a test from an assignment email. |
| `login.microsoftonline.com` | Microsoft Entra token exchange for sign-in (`consultant-license.js`, `outlook-draft.js`) | Required | Complete Microsoft sign-in. |
| `graph.microsoft.com` (optional) | Requested at runtime with `chrome.permissions.request` only when the user chooses to create an Outlook draft, send an email or look up recipients (`Mail.ReadWrite`, `Mail.Send`, `People.Read`) | Optional | Email a report or test assignment from the user's own Outlook. |
| `web_accessible_resources`: `knowledge-packs/*.json` for `<all_urls>` | Public Business Central knowledge catalog read by the capture scripts | Required, scope to review | Read the built-in page and field catalog. See open item 1. |

Each permission has a concrete production call site. Human review must confirm
that the explanations match current Edge policy wording.

## Data that leaves the browser

These are technical facts for the privacy policy and the Partner Center data
disclosure, not legal advice.

| What | Sent to | When | Content |
| --- | --- | --- | --- |
| License check and trial | BC Process Studio license service | When the license is checked, for example when a recording starts | Random installation ID, Business Central tenant ID from the BC URL, extension version |
| Consultant sign-in and registration | Microsoft Entra, then the license service | When the user signs in | Microsoft access token; the service reads the user's identity (name, email, object ID, Entra tenant) from the verified token |
| Usage statistics | License service (`/v1/license/usage`) | After a document or bug report is first saved, retried every five minutes | Document type, creation time and a SHA-256 hash of the document's technical ID. No titles, steps, images or report content |
| Email by Outlook (optional) | Microsoft Graph | Only when the user creates a draft or sends | The report or test assignment the user chose to send, recipients; recipient suggestions read the user's People list |
| Library synchronization (optional) | A local folder the user chooses | When the user synchronizes | Document files; any further transfer is done by the user's own sync service, such as OneDrive |

Nothing else is sent. There is no analytics, no telemetry service and no AI
service. Application Insights is not queried; an Application Insights session
ID that Business Central itself shows in an error's details is kept as captured
evidence in the local report.

## Captured data and masking

Captured data can include clicks, selected controls, entered business values,
page/frame context, timestamps, screenshots and user-created review content. It
is stored in `chrome.storage.local` and leaves the browser only as described
above or when the user exports a file.

Masking applies to what is shown in documents, exports and bug reports:
configured sensitive input categories are suppressed there. Since 4.7.258 the
value a user types in a field is also kept unmasked in the local recording, next
to the masked value, so that a Page Scripting test can enter the same value
(`typedValue`, see [PAGE_SCRIPTING.md](PAGE_SCRIPTING.md)). It travels with the
recording when the user exports or synchronizes the library. Passwords,
secrets, tokens and keys are never stored. A screenshot may still contain any
information visible on screen.

Users delete projects through the product's deletion workflows. Uninstalling the
extension removes its storage namespace. Usage statistics already delivered are
kept by the license service until the administrator deletes them under their
retention policy.

## Certification notes for reviewers

Reviewers cannot use the extension without Business Central and a license.
Provide in the submission's notes for certification:

- a Business Central sandbox URL with demo data only, and a test user;
- a license or trial path that works for that tenant;
- the steps: open Business Central, choose **Record a process** in the
  toolbar, perform a few steps, choose **Stop**, review and export;
- that the Outlook and Graph features are optional and require the reviewer's
  own Microsoft account.

**HUMAN INPUT REQUIRED**: create and maintain the reviewer tenant and account.
Never give reviewers customer data or a personal account.

## Moving existing users to the store version

A store installation has a new extension ID and therefore its own storage.
Recordings and documents in an existing pilot installation are not moved
automatically. Before inviting pilot users, tell them to export their library
(or synchronize it to a folder) in the old installation, install the store
version, import it, check the result and only then remove the old installation.
See [EDGE_DISTRIBUTION.md](EDGE_DISTRIBUTION.md) and
[PACKAGING_AND_UPDATE_ARCHITECTURE.md](PACKAGING_AND_UPDATE_ARCHITECTURE.md).

## Required store assets

Humans must create sanitized, current screenshots, never fabricated or copied
from a customer environment:

1. Recording in a BC sandbox with the recording panel: the in-context workflow.
2. Review Workspace: generated steps and editing.
3. Screenshot annotation: rectangle/arrow editing without sensitive data.
4. Document Workspace: the professional generated document.
5. Word or PDF output: the exported result.
6. Test script or bug report, if it strengthens the listing.

Provide the store logo and any promotional tiles required at submission, using
the existing product identity. Exact dimensions and image count must be
confirmed in Partner Center because store requirements can change.

## Open items before submission

1. `web_accessible_resources` exposes `knowledge-packs/*.json` to every site
   (`<all_urls>`). Check whether the capture scripts need it from pages other
   than Business Central, and if not, limit `matches` to the Business Central
   hosts. A narrower scope is easier to justify to reviewers.
2. Privacy policy, support contact and website (see Listing copy).
3. Reviewer tenant and certification notes.
4. Migration guidance for pilot users, published before the store version is
   offered to them.
