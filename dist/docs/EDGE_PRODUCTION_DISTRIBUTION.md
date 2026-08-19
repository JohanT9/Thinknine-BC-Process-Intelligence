# Edge production distribution

## Decision

Use one controlled Microsoft Edge Add-ons listing identity for the initial
pilot and intended Stable product, provided Partner Center visibility controls
support the tester group. This minimizes operational overhead, exercises the
real automatic-update path, and avoids a later storage-breaking channel move.
A separate Beta listing ID is not required unless publisher policy or a need for
long-lived parallel release trains proves otherwise.

Enterprise policy may force-install the same verified listing for managed
consultant devices. Edge remains the binary integrity and update owner. There
is no unpacked installation, Windows installer, bootstrapper, or custom updater.

## Release boundary

The repository prepares a validated ZIP, checksums, commit-bound release
manifest, release notes, and optional reviewed policy metadata. A human owns
Partner Center login, visibility, legal/privacy approval, final copy, tester
assignment, submission, certification, staged rollout, and publication.

## Identity and channels

`package.json.version` is authoritative. The listing ID must remain stable.
The pilot is a release channel and not a product fork. Pilot artifacts identify
version, full Git commit, timestamp, channel, and SHA-256.

## Recovery

On a defective release, pause rollout and submit a corrected forward version.
Enterprise administrators may pin a known version only where their supported
Edge management mechanism permits it. Never uninstall or clear storage as the
first recovery step. Preserve Canonical Recording and project state and collect
non-sensitive diagnostics before any user-data action.
