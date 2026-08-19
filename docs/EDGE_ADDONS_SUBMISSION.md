# Microsoft Edge Add-ons submission material

## Listing copy

- Product name: **Thinknine BC Process Intelligence**
- Short description: Record Business Central work and turn it into reviewable,
  reusable process documentation.
- Primary use case: Consultant-led capture, review, annotation, document
  workspace inspection, and Word export for Business Central processes.
- Target users: Business Central consultants, process owners, and authorized
  implementation teams.
- Recommended category: Productivity. **HUMAN REVIEW REQUIRED**.
- Support contact: **HUMAN INPUT REQUIRED**.
- Privacy-policy URL/status: **HUMAN INPUT AND LEGAL APPROVAL REQUIRED**.
- Product website: **HUMAN INPUT REQUIRED**.

Long description: Thinknine BC Process Intelligence records authorized user
interactions in Microsoft Dynamics 365 Business Central, preserves traceable
source events and screenshots locally, and creates editable professional
documentation. Users review generated steps, correct wording and structure,
annotate screenshots, inspect the document, and export Word files. No external
analytics, AI service, or application-content upload is part of the extension.

## Permission inventory

| Permission | Actual use and source | Production status | Store explanation |
| --- | --- | --- | --- |
| `activeTab` | Active BC page access and visible-tab screenshot capture in `src/recorder/background.js` and popup orchestration | Required | Capture only the tab the user records. |
| `downloads` | Word/ZIP export through `chrome.downloads.download` in `src/recorder/background.js` | Required | Save user-requested documentation locally. |
| `scripting` | Register/inject recorder scripts into eligible BC frames in background/popup | Required | Start reliable capture in standard and nested BC UI. |
| `storage` | Persist settings, raw/canonical recordings, reviews, screenshots, documents, and diagnostics locally | Required | Preserve work between browser sessions. |
| `tabs` | Query the active tab, message frames, open dashboard, and capture the correct window | Required | Coordinate the explicitly selected recording tab and product UI. |
| `unlimitedStorage` | Retain screenshot-rich recordings and document projects beyond the normal extension quota | Required for current storage model | Avoid losing larger authorized recording projects. |
| `webNavigation` | Enumerate frame topology for control add-ins and diagnostics in `background.js` | Required | Capture and diagnose Business Central nested frames. |
| BC host permissions | Content scripts run only on `businesscentral.dynamics.com` and its subdomains | Required | Record only supported Business Central web environments. |

No permission was removed: each has a concrete production call site. Human
review must confirm that the explanations match current Edge policy wording.

## Technical privacy and data handling

Captured data can include clicks, selected controls, entered business values,
page/frame context, timestamps, screenshots, and user-created review content.
Privacy masking suppresses configured sensitive input categories, but a
screenshot may still contain any information visible on screen. Data is stored
in `chrome.storage.local` and exported only when the user requests a local file.

The extension contains no external analytics, telemetry, AI API, or application
content upload. It communicates with Business Central because it runs in the
authorized BC page; store distribution itself is handled by Edge. Users delete
projects through product deletion workflows. Browser uninstall may remove the
entire extension storage namespace. These are technical facts, not legal advice.

## Required store assets

Humans must create sanitized, current screenshots—never fabricated or copied
from a customer environment:

1. Recording in a BC sandbox: show the supported in-context workflow.
2. Review Workspace: show generated steps and editing.
3. Screenshot annotation: show rectangle/arrow editing without sensitive data.
4. Document Workspace: show the professional generated document.
5. Word output: show the exported result and value proposition.
6. Process Model only if it materially improves store positioning.

Provide store icon sizes required by the current Partner Center form using the
existing product identity, plus any promotional tile required at submission.
Exact dimensions and image count must be confirmed in Partner Center because
store requirements can change.
