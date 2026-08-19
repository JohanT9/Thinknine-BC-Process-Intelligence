# Packaging and update architecture

## Executive summary

Thinknine BC Process Intelligence 4.6 is a Manifest V3 browser extension. The
repository contains no Windows executable, service, native messaging host, or
local companion application. **No Windows installer is required** for the
current product. Production distribution should therefore use the browser's
trusted extension channel instead of wrapping the extension in an installer.

For pilots, use a controlled Edge Add-ons listing or centrally managed Edge
enterprise policy. For general commercial distribution, use Edge Add-ons as
the stable distribution and update owner. A future Windows package is justified
only if a genuine native component is introduced.

## Current distribution assessment

`src` is authoritative. `npm run build` creates the complete extension runtime
in `dist`: manifest, service worker, content scripts, UI, engines, Knowledge
Packs, documentation, icons, and the bundled Word adapter. `npm run release:zip`
packages that runtime and emits a checksum-bearing release manifest.

Today `dist` is loaded unpacked for development. The existing GitHub ZIP is a
release/offline artifact, not an automatic production update mechanism. There
are no native/local Windows components and nothing requires an executable.

## Components requiring installation

Only the browser extension needs installation. Node.js, npm, source files,
tests, and build scripts are development/release dependencies and must not be
required on a consultant workstation once store distribution is available.

A Windows installer currently owns nothing. If a later native messaging host
or diagnostics application is approved, an MSIX package may own only that
native component, its registration, shortcuts, configuration, and uninstall
metadata. It must not also update the store-owned extension.

## Recommended production distribution

### Initial beta and pilot

Preferred order:

1. Controlled/private Edge Add-ons publication when tenant/account controls
   permit it.
2. Edge enterprise policy deployment for centrally managed customers.
3. A signed, checksum-verified ZIP only for controlled offline evaluation,
   following Microsoft's supported enterprise extension deployment model.

Unpacked `dist` remains development-only and is not a commercial installation
experience.

### General commercial distribution

Publish through Edge Add-ons. The store owns extension installation, stable
extension identity, integrity validation, and updates. Consultants install once
without manually loading `dist`. Chrome Web Store may later package the same
runtime source after Chrome product verification.

## Extension identity and update ownership

A production listing must retain one publisher account and listing identity;
changing signing/listing identity can produce a different extension ID and lose
access to the original extension storage namespace. Development, Beta, and
Stable may intentionally use different listing IDs, but an installed channel's
identity must remain stable.

There is exactly one update owner per installed component:

| Component | Update owner |
| --- | --- |
| Development extension | Developer reloads the unpacked build |
| Beta Edge extension | Edge Add-ons or enterprise administrator |
| Stable Edge extension | Edge Add-ons |
| Future Chrome extension | Chrome Web Store |
| Future native Windows component | MSIX/App Installer or enterprise software management |

No custom extension self-updater is introduced. The manifest has no competing
`update_url`; a private deployment may add only the browser-supported metadata
required by its chosen enterprise mechanism.

## Version model

`package.json.version` is the product and release version source. Build writes
that value into the generated manifest and product placeholders. The checked-in
source manifest is validated against it to expose drift. A release such as
`4.7.0` maps to product, extension, release-manifest, and any future installer
version where the packaging format permits it.

Canonical Recording, normalization, Step Grouping, Semantic Document, Process
Model, and other schema/algorithm versions remain independent. A product update
does not imply a data migration or schema-version increase.

## Update channels

- **Development**: unpacked local `dist`; developer-controlled reload; may move
  to any development build and is not a customer update channel.
- **Beta**: controlled Edge Add-ons/enterprise pilot identity; receives tested
  beta releases. Upgrade to Stable is an explicit channel migration because a
  separate listing has a separate extension ID/storage namespace.
- **Stable**: public or approved organizational Edge Add-ons identity; receives
  production releases only and never automatically downgrades to Beta.

Cross-channel migration must export/import data explicitly if listing IDs
differ. Silent storage transfer between extension IDs is not available.

## Data preservation and schema compatibility

Customer state belongs to `chrome.storage.local`, not `dist`. This includes
Canonical Recordings, Raw Events, legacy event projections, screenshots,
Reviews, Step Overrides, Manual Information Steps, Notes, Annotations,
Sections/Subtasks, Process Models, Process Versions, settings, and Document
Library metadata. Store updates replace extension code while retaining storage
for the same extension ID. Build/release scripts never clear this storage.

Uninstalling the extension or changing extension identity can remove or isolate
data. Backup/export capability is therefore a recommended follow-up before
broad commercial rollout. Existing model normalizers and compatibility adapters
remain the only migration authority; packaging must not rewrite recordings.

## Rollback and recovery

Browser stores control rollout and do not guarantee end-user self-service
rollback. Recovery uses staged rollout, release pausing, a corrected forward
release, and enterprise pinning where supported. A future MSIX component may use
its package manager's supported rollback policy.

Code rollback must never perform destructive data rollback. Older product code
may be unable to interpret newer additive fields; it must preserve unknown data
or refuse unsafe writes. Historical recordings and Process Versions are never
rewritten simply because a binary version changed.

## Signing and release security

Edge Add-ons and Chrome Web Store publisher identities own extension signing.
Future Windows packages require a trusted code-signing certificate. Certificates,
private keys, passwords, store credentials, and tokens belong in protected CI
secrets or enterprise signing infrastructure, never Git.

Release artifacts receive SHA-256 checksums in `release-manifest.json`. The
extension must not download executable code dynamically, broaden host access for
distribution, bypass browser/Windows warnings, or communicate with an external
update service.

## Release artifacts and manifest

The current justified artifacts are:

- `extension-edge-<version>.zip`
- `release-manifest.json`
- GitHub-generated release notes / `CHANGELOG.md`

The release manifest schema contains manifest version, product version, channel,
publication time, minimum compatible product version, artifact component and
browser, media type, SHA-256, and release-notes reference. It describes release
evidence; it does not duplicate store update metadata.

An `extension-chrome-<version>.zip` is added only after Chrome verification.
MSIX and `.appinstaller` artifacts are added only when a native Windows component
exists. Building empty installer shells is explicitly out of scope.

## Enterprise and offline distribution

Managed customers can deploy the Edge listing and pin/allow it through Microsoft
Edge enterprise extension policies. Exact policy configuration is customer IT
ownership and is not embedded in product code.

Offline packages are optional for disconnected environments. They require a
documented, supported enterprise installation and update process, stable signing,
checksum verification, and an administrator-owned cadence. Offline support must
not become a second updater or complicate the initial Edge Add-ons path.

## Chrome future strategy

Chrome uses the same `src` tree, domain modules, storage contracts, and build.
Only store metadata, icons/policy declarations, package naming, or a generated
manifest delta may differ. Chrome Web Store becomes the sole Chrome extension
update owner after the manual checklist in `CHROME_READINESS.md` passes. No
application-logic fork is permitted.

## Security, performance, and limitations

Packaging adds no runtime permission, network call, background polling, native
process, or dynamic code. Release hashing occurs only in the release script.
Known limitations are that production store listings/signing are not yet
created, end-user backup/export is incomplete, store rollback is constrained,
and the actual Chrome product remains unverified.

## Recommended P2 implementation

1. Establish the verified publisher organization and reserve Stable/Beta Edge
   listing identities.
2. Add icons, privacy/support metadata, store policy review, and pilot release.
3. Add explicit encrypted/local backup and restore validation before wider use.
4. Add CI provenance/signing controls and staged release approval.
5. Complete Chrome manual verification, then generate a Chrome store package.
6. Reassess MSIX only if a real native requirement appears.

## Self review

- Do we need a Windows installer now? **No.** There is no native component.
- Can production avoid manually loading `dist`? **Yes**, through Edge Add-ons or
  managed enterprise deployment.
- Is there one updater per component? **Yes.** Browser store/policy for the
  extension; a package manager only for a future native component.
- Will updates preserve customer data? **Yes**, while the extension identity is
  stable and the extension is updated rather than uninstalled.
