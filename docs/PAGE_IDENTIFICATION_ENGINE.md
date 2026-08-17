# Business Central Page Identification Engine

## Ownership

`engine/page-identification-engine.js` is the single owner of Business Central
page classification. The recorder captures `pageId`, caption, document title,
and frame/top URLs. Canonical Recording preserves those source facts. Knowledge
Packs provide modular definitions. No UI, Screenshot Intelligence, renderer, or
Entity Memory component performs registry lookup.

BC UI Identification adapts captured evidence to the engine and carries the
resolved result as derived metadata. Event Normalization enriches both current
and historical schema-version-1 events in memory. Entity Memory consumes the
resolved `entity`; its compatibility caption entry point delegates to this same
service and owns no page patterns.

The complete runtime flow is:

```text
observed recorder metadata -> immutable raw event -> Canonical Recording
  -> Page Identification Engine -> normalized resolved page context
  -> Step Group -> Semantic Action -> Review task -> Semantic Document
  -> existing Document Plan / Workspace / Word export
```

## Resolution precedence

Resolution is deterministic:

1. An exact normalized `pageObjectId` match, corroborated by the capture
   contract before the engine is invoked, has confidence `1` and source
   `page-object-id`.
2. A scoped, unambiguous localized caption rule has confidence `0.75` and
   source `caption-rule`. Caption matches never provide `tableId` or
   `recordType`.
3. A verified but unknown runtime Page Object ID is retained with confidence
   `0.6` and source `runtime-metadata`.
4. A caption or empty context that cannot be classified is preserved with
   confidence `0.25` and source `generic-fallback`.

Every result also has a stable opaque `pageIdentity`. A numeric observed ID uses
`bc:page:<pageObjectId>`. A page without one uses a deterministic
`bc:observed:<hash>` based only on observed page-level metadata. This supports
page continuity without treating a caption, legacy semantic `pageId`, or URL as
an entity. Query strings are excluded from this opaque identity.

Candidates are ordered by resolution kind, pack priority, definition priority,
and stable `ruleId`. Conflicting semantic definitions never replace one another
silently. A conflict returns an `ambiguous-page-identification` safe fallback
unless exactly one higher-priority definition contains a valid explicit
`override` targeting the existing provider and rule. Pack array order never
changes the result.

## Knowledge Pack extension

`pageDefinitions` is optional. Existing packs containing only `rules` remain
valid.

```json
{
  "packId": "bc-sales",
  "priority": 200,
  "pageDefinitions": [
    {
      "ruleId": "Sales.SalesOrder",
      "pageObjectId": "42",
      "entity": "SalesOrder",
      "pageType": "document",
      "recordType": "SalesOrder",
      "documentType": "sales-order",
      "captionRules": [
        { "locale": "en-US", "pattern": "^Sales Order$" }
      ]
    }
  ],
  "rules": []
}
```

Required definition fields are `ruleId` and at least one of `pageObjectId` or
`localizedCaptions`/`captionRules`. The engine validates numeric identifiers, supported page types,
semantic entity shape, regular expressions, duplicates within a pack, and
conflicts between packs. Unknown definition properties are preserved for future
compatibility. Provider provenance is inherited from `packId`; pack priority is
part of conflict resolution and supports future customer-specific packs without
another provider framework.

### Localization

New definitions should use exact localized aliases:

```json
"localizedCaptions": {
  "en-US": ["Sales Order"],
  "sv-SE": ["Förs.order", "Försäljningsorder"],
  "da-DK": ["Salgsordre"]
}
```

Matching ignores only capitalization, surrounding/repeated whitespace, Unicode
presentation form, and common punctuation. It does not strip customer prefixes
or suffixes. The original caption remains unchanged in the result. Caption
results include `matchedLocale`, `matchedAlias`, `matchedRule`, `provider`,
`source: caption-rule`, and confidence `0.75`. They never expose `tableId` or
`recordType`. Existing narrowly scoped `captionRules` remain compatible for
older packs, but exact aliases are preferred.

### Aptean definitions

Aptean definitions belong in `aptean-fb.json` unless their size later justifies
functional Aptean packs. Existing semantic action and field rules remain
unchanged. An Aptean `pageObjectId` is accepted only with:

```json
"verification": {
  "source": "installed-symbols",
  "evidence": "relative symbol/package reference and object name"
}
```

Allowed sources are `installed-symbols`, `extension-metadata`,
`verified-source`, and `observed-runtime`. A `tableId` additionally requires an
independent `tableVerification` record. This repository currently contains no
Aptean symbols, AL source, extension metadata, or sufficiently evidenced
runtime captures. Consequently no production Aptean Page Object IDs were added.
Quality Control, Quality Holds, Non-Conformance, Claims, Catch Weight, Shop Floor
Production, Mobile Warehouse Registration, Packaging, Daily Forecast,
Weighbridge, Trade Management, Grower Return, and Labeling remain deliberately
unverified omissions.

### Customer-specific packs

Start from [customer-page-pack.json](examples/customer-page-pack.json). Store
the local JSON beside the packaged Knowledge Packs and add a descriptor to the
local `knowledge-packs/index.json`:

```json
{
  "file": "knowledge-packs/customer-pages.local.json",
  "packId": "customer-contoso-pages",
  "enabled": true,
  "optional": true
}
```

No engine change is required. Missing or malformed packs are skipped with a
diagnostic; other packs and generic recording continue. Pack and definition
priorities provide deterministic ordering. To replace an existing definition,
the customer definition must explicitly record the target and reason:

```json
"override": {
  "targetRuleId": "Sales.SalesOrder",
  "targetProvider": "bc-sales",
  "reason": "Tenant extension replaces the standard page object.",
  "priority": 600
}
```

The override priority must equal the owning pack priority. Invalid, missing, or
multiple overrides produce safe validation/fallback behavior rather than a
silent Microsoft or Aptean replacement. Customer page data stays local; loading
uses extension resources only and introduces no network service.

## Canonical Recording boundary

Resolved identity is additive derived metadata beside the unchanged canonical
`raw` event. It includes provider, rule, source, confidence, and diagnostics
where available. It never changes `pageId`, fabricates `tableId`, or becomes a
second evidence store. Missing or invalid definitions cannot prevent capture.

Historical recordings are enriched only while being processed; they are not
rewritten. Resolved context preserves `pageObjectId`, legacy `pageId`, original
caption, document title, frame/top URL, frame depth, and control-add-in state
when observed. Generic fallback deliberately omits `entity`, `tableId`,
`recordType`, and `documentType`. Its diagnostics contain rule identifiers and
safe identity metadata, never entered values or unrelated URL query values.

Screenshot selection compares `pageIdentity` first, then `pageObjectId`, then
legacy `pageId`/caption compatibility keys. It does not classify pages. A
generic unknown page therefore participates in continuity scoring but cannot
overwrite Entity Memory's established semantic entity.

## Ownership cleanup

There is no `CAPTION_RULES` page registry or Entity Memory caption registry.
Entity Memory delegates compatibility caption inference to this engine. The
dashboard delegates page resolution and Knowledge Pack semantic matching to
engine-owned services; it retains only loading, diagnostics, and UI
orchestration. Existing Knowledge Pack `pagePatterns` remain business-semantic
constraints for action/field rules and are not consulted as a second page
registry.
