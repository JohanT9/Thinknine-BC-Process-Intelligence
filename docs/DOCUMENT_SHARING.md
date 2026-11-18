# Share a document as a link

**Share link** puts the document's Word file in the user's own OneDrive and gives a view-only link for people in the user's organization. Recipients read it in Word for the web, without BC Process Studio, a license or Business Central.

## Where it starts

- **Review toolbar**, next to Export Word (`reviewShareLink`, toolbar command `share`, enabled like Export Word).
- **Library**: Share link in a document's ⋯ menu, and the **Shared** / **Shared · changed** marker on the row, which opens the same dialog. The marker compares the document's `modifiedAt` with the share's `sharedAt`.
- **Recording panel** done view, under the Word card: the first click shows where the file goes and who can read it, **Share** asks for the Graph permission from that click and runs the `share-link` panel job in the hidden library page, which reports each step and returns the link. The panel shows and copies the link.

All three use the same code (`documentShare.run` in `dashboard.js`) and the same stored share.

## What happens

1. The dialog states where the file goes (OneDrive › BC Process Studio) and who can read it before anything is sent.
2. The Word file is generated exactly as **Export Word** generates it, including value masking.
3. The extension requests the optional `https://graph.microsoft.com/*` host permission from the click, then a delegated `Files.ReadWrite` token through the same Entra public client and authorization-code + PKCE flow as the Outlook features (`src/bug-report/outlook-draft.js`, `authorize(scope)`).
4. A new file is uploaded with `PUT /me/drive/root:/BC Process Studio/<name>.docx:/content?@microsoft.graph.conflictBehavior=rename`, so another file of the same name is never replaced. Graph accepts up to 250 MB in one request, so no upload session (and no SharePoint host permission) is needed.
5. `POST /me/drive/items/{id}/createLink` with `type: view`, `scope: organization` makes the link; Graph returns the existing link when there is one.
6. The link is copied to the clipboard, and the dialog says so only after both calls succeeded.

**Update** replaces the same item (`PUT /me/drive/items/{id}/content`), so the link stays the same and OneDrive keeps the earlier versions. If the file was removed in OneDrive, a new file and link are made and the dialog says the link is new. **Stop sharing** deletes the link permission; the file stays in the user's OneDrive.

## Stored data

`t9_document_shares` in `chrome.storage.local` maps a document id to the share this computer made: OneDrive item id, permission id, link, file name, time and the review's `updatedAt` when it was shared (used for **Shared · update**), and the account (`tenantId:objectId`) that made it. A share made by another account is never updated or removed. The key is not part of any document and is never exported or synchronized. No token, file content or recipient is stored.

## Why OneDrive and Word

SharePoint Online does not show uploaded HTML files in the browser (it downloads them), so a web page in SharePoint is not an option. Storage at BC Process Studio was rejected so that customer data stays in the customer's Microsoft 365. Personal Microsoft accounts are not supported: sign-in uses the organizations endpoint, and personal OneDrive has no organization link scope.

## Entra configuration

Add Microsoft Graph delegated **Files.ReadWrite** to the existing app registration used for the license and Outlook features. It is requested only when a user shares. Tenants that require admin consent stop the first share; the dialog tells the user to ask an administrator to approve Files.ReadWrite for BC Process Studio.

## Failures

| Code | Cause | What the user is told |
| --- | --- | --- |
| `permission` | Graph host permission refused | Choose Share again and allow access |
| `consent` | Sign-in canceled, consent refused, 401 | Try again; ask an administrator to approve Files.ReadWrite |
| `denied` | 403 on upload | Check that the account has OneDrive |
| `policy` | 403 on createLink | The organization does not allow organization links; share from OneDrive |
| `quota` | 507 | OneDrive is full |
| `size` | Over 250 MB | Too large to upload |
| `network`, `busyService` | No answer, 408, 429, 5xx | Check the connection and try again |

## Verification

`tests/onedrive-share.test.js` covers the Graph calls, update and relink, account isolation, stop sharing and failure codes with a mock fetcher. `tests/document-share-ui.test.js` checks the dialog texts in every registered interface language. Mock tests do not prove that the app registration or a customer tenant is ready: live verification must cover consent, admin-required consent, a tenant that disallows organization links, update with the same link, a file removed in OneDrive and stop sharing.
