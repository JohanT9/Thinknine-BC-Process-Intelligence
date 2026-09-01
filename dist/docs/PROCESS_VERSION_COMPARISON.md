# Process version comparison

Review Studio can save immutable semantic snapshots of the Process Model and
compare them without changing the Review or generated document.

## Consultant workflow

1. Open **Process Overview** in Review Studio.
2. Select **Save version** when the process represents a useful checkpoint.
3. Select **Compare versions** and choose two saved versions, or one saved
   version and **Current**.
4. Review added, removed, modified and moved activities together with route
   and observed-state changes.

The first snapshot becomes version `1.0` and the baseline. Later snapshots use
minor version numbers. An unchanged semantic process is not saved again.

## Ownership and safety

- The Review owns complete `processVersions` and their immutable Process Model
  snapshots.
- Document Library stores summary metadata only: current version, baseline,
  count and last process-change date.
- Comparison is read-only. It never regenerates, reorders or edits Steps.
- Screenshot, annotation, theme and renderer changes are excluded from the
  semantic comparison.
- Existing Reviews without version history remain valid.

The comparison reuses `process-versioning.js`; the UI only orchestrates saving
and renders the resulting deterministic diff.
