# Windows report sharing

## Status and limits

The user's Explorer test confirmed that their Outlook installation accepts a
shared text file as an attachment in an editable message. This does not yet
verify the helper-to-Outlook end-to-end flow or ZIP acceptance.

The helper uses Microsoft's desktop DataTransferManager interop pattern:
https://learn.microsoft.com/en-us/windows/apps/develop/windows-integration/integrate-sharesheet-send

The share contract supplies a file and title metadata, not a guaranteed email
recipient or subject. The helper displays the configured support address and
report title with copy buttons. The user selects Outlook and pastes them if
necessary. No mail is sent automatically. No mailbox permissions are requested.

## Build

Requires .NET 8 SDK on Windows. From the repository root:

```powershell
dotnet publish native/windows-share/BCProcessStudio.Share.csproj -c Release -r win-x64 --self-contained true -o release/windows-share
```

The complete output directory must remain together. It includes its runtime;
end users do not need to install .NET separately. ARM64 needs a separate publish
using `win-arm64`. This first pilot package is unsigned; production distribution
requires signing and IT deployment review. Do not bypass security warnings.

## Per-user registration

Find BC Process Studio's extension ID in Edge's extensions page. In the published
helper directory, run:

```powershell
.\Register-Helper.ps1 -ExtensionId YOUR_32_CHARACTER_EXTENSION_ID -ValidateOnly
.\Register-Helper.ps1 -ExtensionId YOUR_32_CHARACTER_EXTENSION_ID
```

The script writes a native-host manifest beside the EXE and registers only this
host under HKCU for Edge and Chrome. It does not change system policy or register
for other extension IDs. Keep the directory in place. Enterprise policy may
require IT approval for native messaging. Registration is NOT run by the build.
On this test machine, script execution policy blocked Register-Helper.ps1 before
it could run. No registry entries were written by that attempt. Do not bypass
execution policy; use an IT-approved script execution/deployment method or a
future signed installer. This remains an installation gate for the pilot.
Different Edge/Chrome store IDs require separate configured allowed origins in
a future deployment package; this pilot deliberately registers one ID.

Reload the extension after updating `dist` because `nativeMessaging` was added.
Existing email delivery is preserved until Windows sharing is explicitly selected.
Settings → Open bug report in email → Windows sharing. Save settings.
Email error report opens the helper; Share attached report opens Windows sharing.
Missing helper registration is shown as an error; there is no silent send or
fallback. The old `.eml` download remains an explicit settings option.

## Verification

```powershell
.\BCProcessStudio.Share.exe --test
.\BCProcessStudio.Share.exe --self-test
```

`--test` uses synthetic data and opens a visible helper. Select Share and Outlook.
Check that `felrapport.zip` arrives, then inspect its Markdown and JSON entries.
Confirm whether title metadata is used as Outlook's subject. Copy and paste the
support address if needed. Do not send the test message.
`--self-test` emits a native-messaging framed JSON response (not console text).

Reports are saved under LocalAppData/Thinknine/BCProcessStudio/SharedReports in
unique directories with fixed entry names. No arbitrary input path is accepted.
The JSON includes the explicitly selected report data and embedded screenshots.
Local copies are retained so asynchronous sharing can read the file; the helper
shows their location. There is no automatic recursive cleanup in this pilot.
Users/IT must manage these potentially sensitive local report copies.
Request size is limited to 24 MB; this is not the recipient mailbox's size limit.

## Removal

Close the helper. Remove only the two native-host registry entries named
`com.thinknine.bcprocessstudio.share` under the HKCU Edge/Chrome NativeMessagingHosts
paths listed in Register-Helper.ps1, after checking that their default values
point to this installation. The helper directory and retained reports can then
be removed manually. No registry removal is performed automatically.
