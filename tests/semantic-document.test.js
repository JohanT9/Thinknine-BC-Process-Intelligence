const assert = require("assert");
const model = require("../src/document/semantic-document");

function validDocument() {
  return {
    schemaVersion: model.SCHEMA_VERSION,
    documentId: "document-1",
    metadata: { title: "Process", futureMetadata: { preserve: true } },
    assets: [{
      assetId: "asset-1",
      kind: "image",
      sourceRef: { screenshotRef: "screenshots/one.png" },
      futureAssetField: "preserve"
    }],
    sections: [{
      sectionId: "section-1",
      kind: "workflow",
      futureSectionField: 42,
      blocks: [
        { blockId: "heading-1", kind: "heading", level: 1, text: "Workflow" },
        {
          blockId: "step-1",
          kind: "step",
          sourceRef: { taskId: "task-1" },
          blocks: [{
            blockId: "paragraph-1", kind: "paragraph", text: "Open the order."
          }, {
            blockId: "image-1",
            kind: "image",
            assetId: "asset-1",
            sourceRef: {
              taskId: "task-1",
              annotationId: "annotation-1",
              screenshotRef: "screenshots/one.png"
            }
          }]
        },
        {
          blockId: "list-1",
          kind: "list",
          items: [{
            itemId: "item-1",
            blocks: [{
              blockId: "list-paragraph-1",
              kind: "paragraph",
              text: "Prerequisite"
            }]
          }]
        },
        {
          blockId: "table-1",
          kind: "table",
          columns: [{ columnId: "column-1", label: "Name" }],
          rows: [{
            rowId: "row-1",
            cells: [{
              cellId: "cell-1",
              columnId: "column-1",
              blocks: [{
                blockId: "cell-paragraph-1",
                kind: "paragraph",
                text: "Value"
              }]
            }]
          }]
        },
        {
          blockId: "revision-history-1",
          kind: "revisionHistory",
          entries: [{ revisionId: "revision-1", version: "1.0" }]
        },
        { blockId: "toc-1", kind: "toc" },
        { blockId: "page-break-1", kind: "pageBreak" },
        {
          blockId: "callout-1",
          kind: "callout",
          calloutType: "note",
          blocks: []
        }
      ]
    }],
    futureDocumentField: { preserve: true }
  };
}

const input = validDocument();
const before = JSON.stringify(input);
const normalized = model.normalize(input);
assert.strictEqual(JSON.stringify(input), before);
assert.ok(Object.isFrozen(normalized));
assert.ok(Object.isFrozen(normalized.sections));
assert.ok(Object.isFrozen(normalized.sections[0].blocks[1].sourceRef));
assert.throws(() => normalized.sections.push({}), TypeError);
assert.strictEqual(normalized.futureDocumentField.preserve, true);
assert.strictEqual(normalized.metadata.futureMetadata.preserve, true);
assert.strictEqual(normalized.assets[0].futureAssetField, "preserve");
assert.strictEqual(normalized.sections[0].futureSectionField, 42);
assert.deepStrictEqual(model.validate(normalized), { valid: true, issues: [] });

const defaults = model.normalize({ documentId: "defaults" });
assert.strictEqual(defaults.schemaVersion, model.SCHEMA_VERSION);
assert.deepStrictEqual(defaults.metadata, {});
assert.deepStrictEqual(defaults.sections, []);
assert.deepStrictEqual(defaults.assets, []);

const futureBlock = {
  blockId: "future-block-1",
  kind: "numberedMarker",
  futureGeometry: { x: 0.2, y: 0.4 },
  futureProperties: { preserve: true }
};
const futureDocument = model.normalize({
  ...validDocument(),
  schemaVersion: "2.0.0",
  sections: [{
    sectionId: "future-section", kind: "future", blocks: [futureBlock]
  }]
});
assert.deepStrictEqual(futureDocument.sections[0].blocks[0], futureBlock);
const futureValidation = model.validate(futureDocument);
assert.strictEqual(futureValidation.valid, true);
assert.deepStrictEqual(
  futureValidation.issues.map(issue => issue.code),
  ["future-schema-version", "unsupported-block-kind"]
);

const serialized = model.serialize(normalized);
const reloaded = model.deserialize(serialized);
assert.deepStrictEqual(reloaded, normalized);
assert.ok(Object.isFrozen(reloaded));
assert.strictEqual(reloaded.sections[0].sectionId, "section-1");
assert.strictEqual(reloaded.assets[0].assetId, "asset-1");

const created = model.create("created-document", {
  metadata: { title: "Created" }, futureRoot: true
});
const withSection = model.withSection(created, {
  sectionId: "created-section", kind: "content", blocks: []
});
const withAsset = model.withAsset(withSection, {
  assetId: "created-asset",
  kind: "diagram",
  sourceRef: { screenshotRef: "diagram-source" }
});
const withBlock = model.withBlock(withAsset, "created-section", {
  blockId: "created-image", kind: "image", assetId: "created-asset"
});
assert.strictEqual(created.sections.length, 0);
assert.strictEqual(withSection.assets.length, 0);
assert.strictEqual(withAsset.sections[0].blocks.length, 0);
assert.strictEqual(withBlock.sections[0].blocks.length, 1);
assert.strictEqual(model.validate(withBlock).valid, true);

function issueCodes(document) {
  return model.validate(document).issues.map(issue => issue.code);
}

const duplicate = validDocument();
duplicate.sections[0].blocks.push({
  blockId: "heading-1", kind: "paragraph", text: "Duplicate"
});
assert.ok(issueCodes(duplicate).includes("duplicate-id"));

const missingIds = validDocument();
delete missingIds.documentId;
delete missingIds.sections[0].sectionId;
delete missingIds.assets[0].assetId;
delete missingIds.sections[0].blocks[0].blockId;
assert.ok(issueCodes(missingIds).filter(code => code === "missing-id").length >= 4);

const missingAsset = validDocument();
missingAsset.sections[0].blocks[1].blocks[1].assetId = "missing";
assert.ok(issueCodes(missingAsset).includes("invalid-asset-reference"));

const invalidAnnotationReference = validDocument();
invalidAnnotationReference.sections[0].blocks[1].blocks[1]
  .annotationRefs = [{}];
assert.ok(issueCodes(invalidAnnotationReference).includes(
  "invalid-annotation-reference"
));

const malformedKind = validDocument();
malformedKind.sections[0].blocks[0].kind = "Invalid kind";
assert.ok(issueCodes(malformedKind).includes("invalid-block-kind"));

for (const malformed of [
  null,
  [],
  { documentId: "bad", schemaVersion: "1.0.0", sections: {}, assets: [] },
  { documentId: "bad", schemaVersion: "1.0.0", sections: [], assets: {} }
]) {
  assert.strictEqual(model.validate(malformed).valid, false);
}

const emptyAssetId = validDocument();
emptyAssetId.assets[0].assetId = "";
emptyAssetId.sections[0].blocks[1].blocks[1].assetId = "";
assert.ok(issueCodes(emptyAssetId).includes("missing-id"));
assert.ok(issueCodes(emptyAssetId).includes("invalid-asset-reference"));

const invalidSource = validDocument();
invalidSource.sections[0].blocks[1].sourceRef = { taskId: "" };
assert.ok(issueCodes(invalidSource).includes("invalid-source-reference"));

const rendererSpecific = validDocument();
rendererSpecific.sections[0].blocks[0].twips = 1440;
assert.ok(issueCodes(rendererSpecific).includes("renderer-specific-field"));
assert.strictEqual(model.normalize(rendererSpecific)
  .sections[0].blocks[0].twips, 1440);

const oldDocument = model.normalize({
  documentId: "legacy-document",
  sections: [{ sectionId: "legacy-section", blocks: [] }]
});
assert.strictEqual(oldDocument.schemaVersion, model.SCHEMA_VERSION);
assert.strictEqual(oldDocument.sections[0].kind, "content");
assert.strictEqual(model.validate(oldDocument).valid, true);

assert.deepStrictEqual(model.BLOCK_KINDS, [
  "heading", "paragraph", "step", "image", "table", "callout", "list",
  "revisionHistory", "pageBreak", "toc"
]);

console.log("Semantic document model behaviour tests passed.");
