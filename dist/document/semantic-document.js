(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCHEMA_VERSION = "1.0.0";
  const BLOCK_KINDS = Object.freeze([
    "heading",
    "paragraph",
    "step",
    "image",
    "table",
    "callout",
    "list",
    "revisionHistory",
    "pageBreak",
    "toc"
  ]);
  const CONTAINER_KINDS = new Set(["step", "callout"]);
  const FORBIDDEN_RENDERER_FIELDS = new Set([
    "font",
    "fonts",
    "margin",
    "margins",
    "pageSize",
    "pagination",
    "spacing",
    "twips"
  ]);

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  }

  function normalizeBlock(value) {
    const block = clone(object(value));
    if (!BLOCK_KINDS.includes(block.kind)) return block;
    block.sourceRef = object(block.sourceRef);
    if (block.kind === "heading" || block.kind === "paragraph") {
      block.text = typeof block.text === "string" ? block.text : "";
    }
    if (block.kind === "heading" && !Number.isInteger(block.level)) {
      block.level = 1;
    }
    if (CONTAINER_KINDS.has(block.kind)) {
      block.blocks = Array.isArray(block.blocks)
        ? block.blocks.map(normalizeBlock)
        : [];
    }
    if (block.kind === "list") {
      block.items = Array.isArray(block.items)
        ? block.items.map(item => ({
          ...clone(object(item)),
          blocks: Array.isArray(item?.blocks)
            ? item.blocks.map(normalizeBlock)
            : []
        }))
        : [];
    }
    if (block.kind === "table") {
      block.columns = Array.isArray(block.columns)
        ? clone(block.columns)
        : [];
      block.rows = Array.isArray(block.rows)
        ? block.rows.map(row => ({
          ...clone(object(row)),
          cells: Array.isArray(row?.cells)
            ? row.cells.map(cell => ({
              ...clone(object(cell)),
              blocks: Array.isArray(cell?.blocks)
                ? cell.blocks.map(normalizeBlock)
                : []
            }))
            : []
        }))
        : [];
    }
    if (block.kind === "revisionHistory") {
      block.entries = Array.isArray(block.entries) ? clone(block.entries) : [];
    }
    return block;
  }

  function normalize(value) {
    const input = clone(object(value));
    const normalized = {
      ...input,
      schemaVersion: typeof input.schemaVersion === "string"
        ? input.schemaVersion
        : SCHEMA_VERSION,
      documentId: typeof input.documentId === "string"
        ? input.documentId
        : "",
      metadata: object(input.metadata),
      sections: Array.isArray(input.sections)
        ? input.sections.map(section => ({
          ...clone(object(section)),
          kind: typeof section?.kind === "string" ? section.kind : "content",
          blocks: Array.isArray(section?.blocks)
            ? section.blocks.map(normalizeBlock)
            : []
        }))
        : [],
      assets: Array.isArray(input.assets)
        ? input.assets.map(asset => ({
          ...clone(object(asset)),
          kind: typeof asset?.kind === "string" ? asset.kind : "image",
          sourceRef: object(asset?.sourceRef)
        }))
        : []
    };
    return deepFreeze(normalized);
  }

  function issue(issues, code, path, message, severity = "error") {
    issues.push({ code, path, message, severity });
  }

  function validateId(value, path, ids, issues) {
    if (typeof value !== "string" || !value.trim()) {
      issue(issues, "missing-id", path, "A stable identifier is required.");
      return;
    }
    if (ids.has(value)) {
      issue(issues, "duplicate-id", path, `Duplicate identifier: ${value}.`);
    } else {
      ids.add(value);
    }
  }

  function validateSourceRef(sourceRef, path, issues) {
    if (sourceRef === undefined) return;
    if (!sourceRef || typeof sourceRef !== "object" ||
        Array.isArray(sourceRef)) {
      issue(issues, "invalid-source-reference", path,
        "Source references must be objects.");
      return;
    }
    for (const key of ["taskId", "annotationId", "screenshotRef"]) {
      if (sourceRef[key] !== undefined &&
          (typeof sourceRef[key] !== "string" || !sourceRef[key].trim())) {
        issue(issues, "invalid-source-reference", `${path}.${key}`,
          `${key} must be a non-empty string.`);
      }
    }
  }

  function validateBlock(block, path, context) {
    const { assetIds, ids, issues } = context;
    if (!block || typeof block !== "object" || Array.isArray(block)) {
      issue(issues, "malformed-block", path, "Blocks must be objects.");
      return;
    }
    validateId(block.blockId, `${path}.blockId`, ids, issues);
    if (typeof block.kind !== "string" ||
        !/^[a-z][A-Za-z0-9]*$/.test(block.kind)) {
      issue(issues, "invalid-block-kind", `${path}.kind`,
        "Block kind must be a lower camel-case identifier.");
      return;
    }
    if (!BLOCK_KINDS.includes(block.kind)) {
      issue(issues, "unsupported-block-kind", `${path}.kind`,
        `Unsupported future block kind: ${block.kind}.`, "warning");
      return;
    }
    validateSourceRef(block.sourceRef, `${path}.sourceRef`, issues);
    if (block.kind === "image" &&
        (typeof block.assetId !== "string" || !assetIds.has(block.assetId))) {
      issue(issues, "invalid-asset-reference", `${path}.assetId`,
        "Image blocks must reference an existing asset.");
    }
    if (block.kind === "heading" &&
        (!Number.isInteger(block.level) || block.level < 1 || block.level > 6)) {
      issue(issues, "invalid-heading-level", `${path}.level`,
        "Heading level must be an integer from 1 to 6.");
    }
    if (CONTAINER_KINDS.has(block.kind)) {
      validateBlocks(block.blocks, `${path}.blocks`, context);
    }
    if (block.kind === "list") validateList(block, path, context);
    if (block.kind === "table") validateTable(block, path, context);
    if (block.kind === "revisionHistory") {
      if (!Array.isArray(block.entries)) {
        issue(issues, "malformed-revision-history", `${path}.entries`,
          "Revision entries must be an array.");
      } else {
        block.entries.forEach((entry, index) => validateId(
          entry?.revisionId,
          `${path}.entries[${index}].revisionId`,
          ids,
          issues
        ));
      }
    }
  }

  function validateBlocks(blocks, path, context) {
    if (!Array.isArray(blocks)) {
      issue(context.issues, "malformed-block-list", path,
        "Blocks must be an array.");
      return;
    }
    blocks.forEach((block, index) =>
      validateBlock(block, `${path}[${index}]`, context));
  }

  function validateList(block, path, context) {
    if (!Array.isArray(block.items)) {
      issue(context.issues, "malformed-list", `${path}.items`,
        "List items must be an array.");
      return;
    }
    block.items.forEach((item, index) => {
      validateId(item?.itemId, `${path}.items[${index}].itemId`,
        context.ids, context.issues);
      validateBlocks(item?.blocks, `${path}.items[${index}].blocks`, context);
    });
  }

  function validateTable(block, path, context) {
    if (!Array.isArray(block.columns) || !Array.isArray(block.rows)) {
      issue(context.issues, "malformed-table", path,
        "Table columns and rows must be arrays.");
      return;
    }
    const columnIds = new Set();
    block.columns.forEach((column, index) => {
      validateId(column?.columnId, `${path}.columns[${index}].columnId`,
        context.ids, context.issues);
      if (typeof column?.columnId === "string" && column.columnId.trim()) {
        columnIds.add(column.columnId);
      }
    });
    block.rows.forEach((row, rowIndex) => {
      validateId(row?.rowId, `${path}.rows[${rowIndex}].rowId`,
        context.ids, context.issues);
      if (!Array.isArray(row?.cells)) {
        issue(context.issues, "malformed-table-row",
          `${path}.rows[${rowIndex}].cells`, "Table cells must be an array.");
        return;
      }
      row.cells.forEach((cell, cellIndex) => {
        const cellPath = `${path}.rows[${rowIndex}].cells[${cellIndex}]`;
        validateId(cell?.cellId, `${cellPath}.cellId`,
          context.ids, context.issues);
        if (!columnIds.has(cell?.columnId)) {
          issue(context.issues, "invalid-column-reference",
            `${cellPath}.columnId`, "Cell must reference an existing column.");
        }
        validateBlocks(cell?.blocks, `${cellPath}.blocks`, context);
      });
    });
  }

  function findRendererFields(value, path, issues) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_RENDERER_FIELDS.has(key)) {
        issue(issues, "renderer-specific-field", `${path}.${key}`,
          `${key} belongs to a future planner or renderer.`);
      }
      findRendererFields(child, `${path}.${key}`, issues);
    }
  }

  function validate(value) {
    const issues = [];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      issue(issues, "malformed-document", "$", "Document must be an object.");
      return { valid: false, issues };
    }
    const ids = new Set();
    validateId(value.documentId, "$.documentId", ids, issues);
    if (typeof value.schemaVersion !== "string" || !value.schemaVersion) {
      issue(issues, "invalid-schema-version", "$.schemaVersion",
        "Schema version must be a non-empty string.");
    } else if (value.schemaVersion !== SCHEMA_VERSION) {
      issue(issues, "future-schema-version", "$.schemaVersion",
        `Schema version ${value.schemaVersion} is preserved.`, "warning");
    }
    if (!Array.isArray(value.assets)) {
      issue(issues, "malformed-assets", "$.assets", "Assets must be an array.");
    }
    const assetIds = new Set();
    const assets = Array.isArray(value.assets) ? value.assets : [];
    for (const [index, asset] of assets.entries()) {
      const path = `$.assets[${index}]`;
      if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
        issue(issues, "malformed-asset", path, "Assets must be objects.");
        continue;
      }
      validateId(asset.assetId, `${path}.assetId`, ids, issues);
      if (typeof asset.assetId === "string" && asset.assetId.trim()) {
        assetIds.add(asset.assetId);
      }
      if (typeof asset.kind !== "string" || !asset.kind.trim()) {
        issue(issues, "invalid-asset-kind", `${path}.kind`,
          "Asset kind must be a non-empty string.");
      }
      validateSourceRef(asset.sourceRef, `${path}.sourceRef`, issues);
    }
    if (!Array.isArray(value.sections)) {
      issue(issues, "malformed-sections", "$.sections",
        "Sections must be an array.");
    }
    const context = { assetIds, ids, issues };
    const sections = Array.isArray(value.sections) ? value.sections : [];
    for (const [index, section] of sections.entries()) {
      const path = `$.sections[${index}]`;
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        issue(issues, "malformed-section", path, "Sections must be objects.");
        continue;
      }
      validateId(section.sectionId, `${path}.sectionId`, ids, issues);
      if (typeof section.kind !== "string" || !section.kind.trim()) {
        issue(issues, "invalid-section-kind", `${path}.kind`,
          "Section kind must be a non-empty string.");
      }
      validateBlocks(section.blocks, `${path}.blocks`, context);
    }
    findRendererFields(value, "$", issues);
    return {
      valid: !issues.some(entry => entry.severity === "error"),
      issues
    };
  }

  function create(documentId, options = {}) {
    return normalize({ ...clone(options), documentId });
  }

  function withSection(model, section) {
    return normalize({
      ...clone(model),
      sections: [...(model.sections || []), clone(section)]
    });
  }

  function withBlock(model, sectionId, block) {
    return normalize({
      ...clone(model),
      sections: (model.sections || []).map(section =>
        section.sectionId === sectionId
          ? { ...clone(section), blocks: [...section.blocks, clone(block)] }
          : clone(section)
      )
    });
  }

  function withAsset(model, asset) {
    return normalize({
      ...clone(model),
      assets: [...(model.assets || []), clone(asset)]
    });
  }

  function serialize(model) {
    return JSON.stringify(model);
  }

  function deserialize(text) {
    return normalize(JSON.parse(text));
  }

  return {
    BLOCK_KINDS,
    SCHEMA_VERSION,
    create,
    deepFreeze,
    deserialize,
    normalize,
    serialize,
    validate,
    withAsset,
    withBlock,
    withSection
  };
});
