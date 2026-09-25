# Central Knowledge Repository — phase 2B result

Phase 2B adds validated application and object metadata fields for app ID,
publisher, app version, compatibility bounds, and evidence status. Imported app and
object indexes use those fields when present. The six current packs contain no
publisher/version/control evidence, so their existing object IDs remain marked as
declared and those unknown fields stay empty.

The repository exposes version-aware `lookupObject`, `resolveControl`, and
object-scoped `resolveAction`. Unknown object identity cannot fall through to
text-only action matching. During session interpretation, an unambiguous result for
an exact resolved page object now supplies task classification and provenance.
Unknown objects, missing page identity, absent controls, or conflicting candidates
preserve the existing interpretation and expose the resolution state. Captured
evidence and persisted reviews are unchanged.

Validation completed: Node syntax checks, `npm run knowledge:validate` (six packs,
46 rules, four objects, zero controls, no warnings), `npm run lint`, `git diff
--check`, and `npm run build`. The build required an elevated retry after the
workspace sandbox denied its generated `dist/docs` cleanup. Automated regression
tests were not added or run because the active tool policy prohibits test-file
changes and test execution without an explicit user request.

Known limitation: this remains an in-memory local registry. No verified app
publisher/version metadata is present in the current sources, and no remote
publishing or update service is included.
