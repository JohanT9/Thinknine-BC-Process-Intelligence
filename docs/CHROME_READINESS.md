# Chrome readiness baseline

## Product position and verification result

Edge remains the verified production target. The source tree and MV3 package are
Chromium-compatible by design; there is no browser fork. Google Chrome
151.0.7922.109 is installed on the assessment machine, but an authenticated
Business Central recording was not available for an end-to-end manual run.
Therefore the Chrome manual verification result is **not completed**, and this
milestone does not claim Chrome product support.

## Compatibility matrix

| Surface | Assessment | Evidence / required check |
|---|---|---|
| Manifest V3, `background.service_worker`, `action` | Verified compatible statically | Standard Chromium MV3 fields; generated manifest parses and build checks pass. |
| Static content script, `all_frames`, `match_about_blank`, `run_at` | Verified compatible statically | Shared MV3 manifest syntax. |
| Dynamic content registration | Verified compatible statically | Uses `scripting.get/register/unregisterContentScripts`, `allFrames`, `matchOriginAsFallback`, `persistAcrossSessions`, and isolated world. |
| `match_origin_as_fallback` static equivalent | Compatible with small adjustment if needed | Runtime registration already uses the camel-case equivalent. Static manifest relies on `match_about_blank`; validate nested add-in frames manually before adding another declaration. |
| `chrome.runtime` messaging/URLs/options | Verified compatible statically | Chrome namespace and callback/promise forms used by Chromium MV3. |
| `chrome.storage.local`, `unlimitedStorage` | Verified compatible statically | Shared Chrome/Edge APIs; quota and persistence still require manual product testing. |
| `chrome.tabs` query/get/sendMessage/create | Verified compatible statically | No Edge namespace or Edge-only contract found. |
| `chrome.scripting.executeScript` | Verified compatible statically | Isolated-world injection only; host/activeTab permissions are declared. |
| `chrome.downloads.download` | Verified compatible statically | Permission declared; Chrome filename/save-as behavior requires manual test. |
| `chrome.tabs.captureVisibleTab` | Verified compatible statically | `activeTab` and tabs permissions declared; focus/window and multi-frame behavior require manual test. |
| Host permissions and BC content matches | Verified compatible statically | HTTPS production BC hosts are explicitly listed. |
| React/control-add-in frames | Unknown / needs manual test | Origin fallback registration exists, but real add-in origins, nested frames, and capture timing must be exercised. |
| Chrome Web Store packaging/policy | Unknown / separate release task | Current release ZIP and naming intentionally remain Edge-specific. |
| Edge-specific runtime APIs | None found | “Edge” occurrences are wording, scripts, release packaging, and the production target—not `browser.*` or proprietary runtime calls. |

## Manual Chrome verification checklist

Load `dist` unpacked in Chrome and run against a non-sensitive BC sandbox:

1. Install/reload; verify service worker starts without errors.
2. Start/stop recording from the popup and confirm badge state.
3. Record top-frame list/card interactions and nested standard BC frames.
4. Record an about:blank/srcdoc or origin-fallback frame where present.
5. Exercise a React/control add-in, lookup, dialog, value input, checkbox,
   navigation, and posting confirmation.
6. Confirm raw/canonical event counts, frame identity, screenshots, and capture
   timing in debug diagnostics.
7. Open Review, edit and annotate, reload the extension, and verify persistence.
8. Open Document Workspace and export Word; compare with Edge output.
9. Exercise Downloads with and without Save As and duplicate filenames.
10. Restart Chrome and verify dynamic content registration persists or is safely
    restored.

Record Chrome version, BC environment/version, OS, process fixture IDs, failures,
and exported artifacts. Only after this checklist passes should README, manifest,
release names, and support language state that Chrome is supported.

## Packaging direction

Keep one source tree and shared runtime. A future Chrome package may differ only
in store metadata, icons/policy declarations, release filename, or a manifest
field proven necessary by testing. Browser-specific business logic is prohibited.
