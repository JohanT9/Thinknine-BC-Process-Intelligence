# BC Process Studio Knowledge Repository — phase 2A

## Runtime contract

`src/engine/knowledge-repository.js` exposes `BCKnowledgeRepository` in the browser
and CommonJS in Node. The repository imports the enabled local pack manifest as one
validated release. One missing, unexpected, duplicate or invalid required package
rejects that candidate release in full. Service worker and dashboard then create an
immutable in-memory repository from the same deterministic release identity.

The repository exposes `load`, `importRelease`, `validateManifest`, `validatePack`,
`validateRelease`, `createRepository`, `getRelease`, `lookupObject`, `resolveAction`,
`resolveConcept`, and atomic `activate`. Activation reconstructs object, concept and
rule indexes from the validated source manifest and packs. It never activates
caller-supplied derived indexes. A failed activation retains the previous release.

Resolution uses `resolved`, `ambiguous`, or `unresolved` and carries source-pack and
rule provenance. Equal best rules with conflicting outputs stay ambiguous; ties
with the same output choose a stable rule ID. Exact object lookup never treats a
caption as identity. A supplied app ID must match imported object scope.

## Imported records and known unknowns

| Record | Imported evidence |
|---|---|
| Releases | Framework version, deterministic content fingerprint, validated status. |
| Applications | A BC product-family record for BC-scoped packs; installed app ID/version and publisher remain unknown. |
| Objects | Four page object IDs from BC packages; source pack and page-rule identity are retained. |
| Controls | Zero; the six packages contain no verified stable control metadata. |
| Concepts | Task, action and entity labels derived from the 46 existing rule outputs. They retain pack/rule provenance and are not asserted to be a mastered BC taxonomy. |
| Aliases | 13 localized page labels with locale and source page rule. |
| Bindings and rules | Existing rule outputs, text patterns, priority, confidence, languages, aliases and source rule version. |
| Sources | The six bundled package identities, marked `imported-unverified`; no external documentation or installation metadata is fabricated. |

An `aptean-fb` pack identifies its knowledge-pack namespace. It does not identify
one installed Aptean application or publisher; app-level object IDs and controls
remain absent until source metadata supplies them.

The release fingerprint is two seeded 64-bit FNV-1a values over canonical JSON. It
is a stable local cache/release identifier, not a cryptographic authenticity proof.
Snapshots currently live in process memory and load from packaged files. There is no
remote database, update transport, multi-tenant scope or persistent release history
in phase 2A.

## Import validation

The importer checks manifest identity/path safety and versions; exact pack coverage;
unique pack/rule IDs; rule outputs, priorities and confidence range; regex syntax;
language and alias shape; page object/caption metadata; page-engine diagnostics; and
equal-priority identical rule predicates with conflicting outputs. It rejects an
incomplete release and reports actionable, language-neutral codes without including
captured business data.

Run `npm run knowledge:validate` to validate all enabled manifest packs from disk and
print a compact count report. At the 2026-09-24 import: six packs, 46 rules, four
page objects, zero controls, 90 rule-derived concepts, 13 page-caption aliases, six
source records, no conflicts or warnings.

## Phase 2B: identity and compatibility resolution

Page-definition metadata may now declare `applicationRef` (`appId`, `publisher`,
`appVersion`, and evidence status), an object evidence status, and explicit
compatibility bounds/app IDs. The importer validates those values, includes them in
the release digest, and builds application/object records from them. Existing packs
do not contain this evidence, so none are assigned invented publisher IDs or version
ranges. Their page IDs remain declared source metadata; they are not independently
verified against a Business Central installation.

`lookupObject` requires an object ID and supports app/version filters. Unknown
versions, IDs, apps and unsupported compatibility ranges remain unresolved.
`resolveControl` stays unresolved until a stable control ID is present in a verified
source. `resolveAction` can constrain scored rule candidates to the pack that owns
the exact resolved object; passing an unknown object cannot fall back to generic
text-only matching. The dashboard records these object, control and action results
alongside the canonical review projection without changing recorded evidence or
persisted reviews.

## Integration and next stage

Dashboard and service worker use strict release loading and configure the existing
page-identification engine from the validated release snapshot. During session
interpretation, an exact resolved page object now scopes repository action rules.
When that produces one unambiguous result, its classification and provenance are
used for the interpreted task. Missing page identity, unknown objects, absent
controls, or conflicting candidates retain the existing interpretation and expose
the repository resolution state for review. Captions alone do not trigger an
authoritative repository override.

The current packages have no stable control IDs or app compatibility ranges, so
those lookups remain unresolved until source metadata supplies them. A hosted central
service needs separate platform, identity, authorization, publishing and
customer-scope decisions.

The phase 3 MCP boundary is described in
[`KNOWLEDGE_MCP_CONTRACT.md`](KNOWLEDGE_MCP_CONTRACT.md). It is opt-in and injected;
there is no configured MCP client or remote server in this application. Remote
answers remain unverified review suggestions and cannot change classifications or
the active repository release.

The phase 4 AI fallback and confidence limits are described in
[`KNOWLEDGE_AI_FALLBACK.md`](KNOWLEDGE_AI_FALLBACK.md). It follows the local and
MCP resolvers, requires explicit consent, and returns only unselected suggestions.

The phase 5 local learning proposal contract is described in
[`KNOWLEDGE_FEEDBACK_LEARNING.md`](KNOWLEDGE_FEEDBACK_LEARNING.md). Proposals are
derived from active review history and remain separate from downloadable aggregate
improvement data and active knowledge releases.
