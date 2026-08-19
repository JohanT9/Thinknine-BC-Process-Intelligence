# Extension update lifecycle

## Browser-owned update

The same Edge Add-ons listing owns install and update. Edge downloads, validates,
and activates certified extension versions. Product code does not poll for,
download, or install executable updates. Users can verify the version in
`edge://extensions` and compare it with the product diagnostics.

If an update appears stuck, finish any active recording, wait for it to persist,
restart Edge normally, and recheck the version. Collect browser version,
extension version, recording health, frame diagnostics, and pipeline versions.
Do not include entered values or screenshots by default and do not delete
storage as a troubleshooting shortcut.

## Real update acceptance test

1. Install pilot A from the controlled listing without Developer mode.
2. Create the sanitized representative state described in `PILOT_RELEASE.md`.
3. Publish pilot B to the same listing and wait for Edge delivery.
4. Verify B is active and the listing ID is unchanged.
5. Verify recording, Review edits, annotations, hierarchy, Process Version,
   regeneration, Document Workspace, and Word export.

This repository has not performed that browser-delivered A-to-B sequence. It is
a mandatory human pilot check and must remain unchecked until evidenced.

## Update during recording

Raw Events and Canonical evidence already persisted in `chrome.storage.local`
survive code replacement under the same ID. Edge does not promise seamless
continuation of an in-memory recording. An interrupted session must remain
diagnosable and must not be presented as completed. After restart, preserve its
evidence and start the next recording cleanly. Existing canonical hardening and
control-add-in tests cover persisted recovery contracts; a real forced update
during recording remains a manual pilot scenario.

## Failure and recovery

Download, network, integrity, certification, or installation failures are owned
by Edge; the currently installed certified version remains the working version.
Pause rollout on a product defect and ship a corrected forward release. Binary
rollback and user-data recovery are separate: preserve storage, export evidence
where possible, and escalate before attempting any destructive action.
