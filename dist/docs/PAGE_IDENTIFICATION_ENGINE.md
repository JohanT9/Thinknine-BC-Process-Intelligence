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
and stable `ruleId`. Definitions with different lower priorities are diagnosed
and the higher-priority definition wins. Equal top-priority definitions with
different semantic metadata return an `ambiguous-page-identification`
diagnostic and safe runtime/generic fallback without entity, table, record, or
document classification.

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
`captionRules`. The engine validates numeric identifiers, supported page types,
semantic entity shape, regular expressions, duplicates within a pack, and
conflicts between packs. Unknown definition properties are preserved for future
compatibility. Provider provenance is inherited from `packId`; pack priority is
part of conflict resolution and supports future customer-specific packs without
another provider framework.

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
