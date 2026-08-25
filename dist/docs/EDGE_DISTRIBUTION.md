# Edge distribution and managed updates

## Scope

BC Process Studio is installed as a Microsoft Edge extension.
There is no Windows application, service, native messaging host, Start menu
entry, desktop shortcut, or MSIX package. Microsoft Edge owns installation,
integrity validation, update checks, activation, and uninstall of extension
code.

The release tooling does not publish to Edge Add-ons or modify customer policy.
It creates reviewable artifacts for a publisher or enterprise administrator.

## Required identities

Create separate Beta and Stable listings under the verified publisher
organization. Record each 32-character listing ID in protected release
configuration as `EDGE_EXTENSION_ID`. Never change a listing ID for an existing
channel: `chrome.storage.local` is scoped to the extension identity.

`package.json.version` is authoritative. The build synchronizes it to the Edge
manifest and the release/deployment metadata. The packaging tests reject drift.

## Build a pilot package

In PowerShell:

```powershell
$env:RELEASE_CHANNEL = "beta"
$env:EDGE_EXTENSION_ID = "<verified-32-character-edge-listing-id>"
npm.cmd ci
npm.cmd run package:edge
```

For a non-secret local smoke build, the release script also accepts
`--extension-id=<id>`. CI should use environment configuration so publisher
identity is explicit per channel.

`package:edge` runs full CI, rebuilds `dist`, validates the listing ID, and
creates these files under ignored `release/`:

- `extension-edge-<version>.zip`: Edge Add-ons submission payload;
- `edge-enterprise-policy-<channel>.json`: reviewable managed-policy value;
- `edge-deployment-<channel>.json`: identity and update-owner evidence;
- `release-manifest.json`: artifact names and SHA-256 checksums.

The command fails without a real listing ID and never uploads anything.
Production store signing remains owned by Microsoft Edge Add-ons; no private
key, PFX, password, access token, or publisher credential belongs in Git.

## Pilot installation

### Edge Add-ons pilot

1. The publisher uploads the ZIP to the controlled Beta listing.
2. Complete Edge certification and staged availability configuration.
3. Install the resulting listing using the approved organizational process.
4. In `edge://extensions`, verify listing ID and version.
5. Run the consultant smoke checklist in `INSTALLERA.txt`.

### Managed enterprise pilot

An administrator reviews `edge-enterprise-policy-beta.json` and translates its
`ExtensionSettings` value into the organization's supported Microsoft Edge
policy management system. The policy force-installs the verified Edge Add-ons
listing and uses Microsoft's HTTPS store update service. Repository scripts do
not write registry keys, Group Policy, Intune, or another customer's systems.

An explicitly configured private HTTPS update source is permitted only for a
supported enterprise deployment. Its deployment manifest records
`enterprise-administrator` as update owner; it must not be combined with a
store-owned installation.

## Updates and active recording safety

Edge periodically obtains a certified update from the same listing. Extension
storage survives because the listing ID remains unchanged. The extension has no
custom update poller and cannot force an update during an active recording.
Edge service-worker replacement must continue to rely on the existing persisted
session and Canonical Recording recovery contracts.

Use a staged Beta rollout before Stable. Validate an actual version transition
with representative Canonical Recording, Review, overrides, manual steps,
notes, annotations, hierarchy, Process Versions, and settings. Pause rollout
and publish a corrected forward release on failure; never clear or downgrade
customer data.

## Uninstall and data

Edge uninstall removes extension code. Browser behavior may also remove its
extension-scoped storage. Uninstall is therefore not an update or rollback
mechanism. Export/backup remains required before intentional removal or channel
migration. Enterprise policy removal must be coordinated by the administrator.

## Failure behavior

If download, certification, network access, integrity validation, or update
installation fails, Edge retains the currently installed extension. The
repository adds no fallback downloader and no executable update endpoint.
Administrators diagnose store and policy status through Edge management tools.

## Production gate

Production readiness still requires a verified publisher, reserved Beta and
Stable listing IDs, store certification, privacy/support metadata, controlled
pilot evidence, a real upgrade/data-preservation test, and staged rollout
approval. Those external steps cannot be proven by a local ZIP build.
