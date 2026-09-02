(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessTaxonomySchema = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** @typedef {{id:string,name:string,description?:string,namespace?:string}} ProcessDomain */
  /** @typedef {{id:string,name:string,domainId:string}} BusinessProcess */
  /** @typedef {{id:string,name:string,businessProcessId:string,processStepIds:string[],documentIds:string[],variantIds:string[]}} BCProcess */
  /** @typedef {{id:string,name:string,bcProcessId:string,sequence:number,actionIds:string[],documentIds:string[]}} ProcessStep */
  /** @typedef {{id:string,name:string,documentType:string,pageIds:string[],tableIds:string[]}} ProcessDocument */
  /** @typedef {{id:string,name:string,processStepId:string,actionType:string,pageIds:string[],controlNames:string[],bcActionNames:string[]}} ProcessAction */
  /** @typedef {{id:string,name:string,relationshipType:string,fromEntityId:string,toEntityId:string}} ProcessRelationship */
  /** @typedef {{id:string,name:string,bcProcessId:string,processStepIds:string[],conditions:Object}} ProcessVariant */
  const SCHEMA_VERSION = "1.0.0";
  const ENTITY_TYPES = Object.freeze([
    "ProcessDomain", "BusinessProcess", "BCProcess", "ProcessStep",
    "ProcessDocument", "ProcessAction", "ProcessRelationship", "ProcessVariant"
  ]);
  const RELATIONSHIP_TYPES = Object.freeze([
    "precedes", "follows", "creates", "posts", "releases", "consumes",
    "produces", "references", "branches_to", "returns_to"
  ]);

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function strings(value) {
    return [...new Set(array(value).map(String).map(item => item.trim()).filter(Boolean))];
  }

  function identity(value, entityType) {
    const id = String(value?.id || "").trim();
    const name = String(value?.name || "").trim();
    return { ...clone(object(value)), id, name, entityType,
      description: String(value?.description || "").trim(),
      metadata: clone(object(value?.metadata)),
      futureFields: clone(object(value?.futureFields)) };
  }

  function normalizeEntity(type, value = {}) {
    const base = identity(value, type);
    if (type === "ProcessDomain") return deepFreeze({ ...base,
      namespace: String(value.namespace || "bc").trim() || "bc" });
    if (type === "BusinessProcess") return deepFreeze({ ...base,
      domainId: String(value.domainId || "").trim() });
    if (type === "BCProcess") return deepFreeze({ ...base,
      businessProcessId: String(value.businessProcessId || "").trim(),
      processStepIds: strings(value.processStepIds),
      documentIds: strings(value.documentIds), variantIds: strings(value.variantIds) });
    if (type === "ProcessStep") return deepFreeze({ ...base,
      bcProcessId: String(value.bcProcessId || "").trim(),
      sequence: Number.isFinite(value.sequence) ? value.sequence : 0,
      actionIds: strings(value.actionIds), documentIds: strings(value.documentIds) });
    if (type === "ProcessDocument") return deepFreeze({ ...base,
      documentType: String(value.documentType || "record").trim(),
      pageIds: strings(value.pageIds), tableIds: strings(value.tableIds) });
    if (type === "ProcessAction") return deepFreeze({ ...base,
      processStepId: String(value.processStepId || "").trim(),
      actionType: String(value.actionType || "interaction").trim(),
      pageIds: strings(value.pageIds), controlNames: strings(value.controlNames),
      bcActionNames: strings(value.bcActionNames) });
    if (type === "ProcessRelationship") return deepFreeze({ ...base,
      relationshipType: String(value.relationshipType || "").trim(),
      fromEntityId: String(value.fromEntityId || "").trim(),
      toEntityId: String(value.toEntityId || "").trim() });
    if (type === "ProcessVariant") return deepFreeze({ ...base,
      bcProcessId: String(value.bcProcessId || "").trim(),
      processStepIds: strings(value.processStepIds),
      conditions: clone(object(value.conditions)) });
    throw new Error(`Unsupported taxonomy entity type: ${type}`);
  }

  function normalize(input = {}) {
    const value = clone(object(input));
    const result = { ...value, schemaVersion: SCHEMA_VERSION,
      taxonomyId: String(value.taxonomyId || "bc-process-taxonomy").trim(),
      name: String(value.name || "Business Central Process Taxonomy").trim(),
      domains: array(value.domains).map(item => normalizeEntity("ProcessDomain", item)),
      businessProcesses: array(value.businessProcesses)
        .map(item => normalizeEntity("BusinessProcess", item)),
      bcProcesses: array(value.bcProcesses).map(item => normalizeEntity("BCProcess", item)),
      processSteps: array(value.processSteps).map(item => normalizeEntity("ProcessStep", item)),
      documents: array(value.documents).map(item => normalizeEntity("ProcessDocument", item)),
      actions: array(value.actions).map(item => normalizeEntity("ProcessAction", item)),
      relationships: array(value.relationships)
        .map(item => normalizeEntity("ProcessRelationship", item)),
      variants: array(value.variants).map(item => normalizeEntity("ProcessVariant", item)),
      metadata: clone(object(value.metadata)), futureFields: clone(object(value.futureFields)) };
    return deepFreeze(result);
  }

  function validate(input = {}) {
    const taxonomy = normalize(input);
    const errors = [];
    const collections = [taxonomy.domains, taxonomy.businessProcesses,
      taxonomy.bcProcesses, taxonomy.processSteps, taxonomy.documents,
      taxonomy.actions, taxonomy.relationships, taxonomy.variants];
    const entities = collections.flat();
    const ids = new Map();
    for (const entity of entities) {
      if (!entity.id) errors.push({ code: "missing-id", entityType: entity.entityType });
      if (!entity.name) errors.push({ code: "missing-name", entityId: entity.id });
      if (entity.id && ids.has(entity.id)) errors.push({ code: "duplicate-id",
        entityId: entity.id, entityTypes: [ids.get(entity.id), entity.entityType] });
      if (entity.id) ids.set(entity.id, entity.entityType);
    }
    const requireReference = (entity, field, expected) => {
      const reference = entity[field];
      if (!reference || ids.get(reference) !== expected) errors.push({
        code: "invalid-reference", entityId: entity.id, field,
        referenceId: reference || null, expectedEntityType: expected });
    };
    taxonomy.businessProcesses.forEach(entity =>
      requireReference(entity, "domainId", "ProcessDomain"));
    taxonomy.bcProcesses.forEach(entity => {
      requireReference(entity, "businessProcessId", "BusinessProcess");
      entity.processStepIds.forEach(referenceId => {
        if (ids.get(referenceId) !== "ProcessStep") errors.push({ code: "invalid-reference",
          entityId: entity.id, field: "processStepIds", referenceId,
          expectedEntityType: "ProcessStep" });
      });
      entity.documentIds.forEach(referenceId => {
        if (ids.get(referenceId) !== "ProcessDocument") errors.push({
          code: "invalid-reference", entityId: entity.id, field: "documentIds",
          referenceId, expectedEntityType: "ProcessDocument" });
      });
    });
    taxonomy.processSteps.forEach(entity => {
      requireReference(entity, "bcProcessId", "BCProcess");
      entity.actionIds.forEach(referenceId => {
        if (ids.get(referenceId) !== "ProcessAction") errors.push({
          code: "invalid-reference", entityId: entity.id, field: "actionIds",
          referenceId, expectedEntityType: "ProcessAction" });
      });
      entity.documentIds.forEach(referenceId => {
        if (ids.get(referenceId) !== "ProcessDocument") errors.push({
          code: "invalid-reference", entityId: entity.id, field: "documentIds",
          referenceId, expectedEntityType: "ProcessDocument" });
      });
    });
    taxonomy.actions.forEach(entity =>
      requireReference(entity, "processStepId", "ProcessStep"));
    taxonomy.variants.forEach(entity => {
      requireReference(entity, "bcProcessId", "BCProcess");
      entity.processStepIds.forEach(referenceId => {
        const step = taxonomy.processSteps.find(item => item.id === referenceId);
        if (!step || step.bcProcessId !== entity.bcProcessId) errors.push({
          code: "invalid-variant-step", entityId: entity.id, referenceId,
          bcProcessId: entity.bcProcessId });
      });
    });
    taxonomy.relationships.forEach(entity => {
      if (!RELATIONSHIP_TYPES.includes(entity.relationshipType)) errors.push({
        code: "invalid-relationship-type", entityId: entity.id,
        relationshipType: entity.relationshipType });
      if (!ids.has(entity.fromEntityId) || !ids.has(entity.toEntityId)) errors.push({
        code: "invalid-relationship-endpoint", entityId: entity.id,
        fromEntityId: entity.fromEntityId, toEntityId: entity.toEntityId });
    });
    return deepFreeze({ valid: errors.length === 0, errors, taxonomy });
  }

  function normalizeRecordingReferences(input = {}) {
    const value = object(input);
    return deepFreeze({ taxonomyId: String(value.taxonomyId || "bc-process-taxonomy"),
      domainId: value.domainId ? String(value.domainId) : null,
      businessProcessId: value.businessProcessId ? String(value.businessProcessId) : null,
      bcProcessId: value.bcProcessId ? String(value.bcProcessId) : null,
      variantId: value.variantId ? String(value.variantId) : null,
      processStepIds: strings(value.processStepIds),
      actionMappings: array(value.actionMappings).map(mapping => deepFreeze({
        recordedActionId: String(mapping.recordedActionId || ""),
        processActionId: String(mapping.processActionId || ""),
        processStepId: String(mapping.processStepId || "")
      })).filter(mapping => mapping.recordedActionId && mapping.processActionId),
      classifiedBy: String(value.classifiedBy || "manual"),
      confidence: Number.isFinite(value.confidence) ? value.confidence : null });
  }

  return { ENTITY_TYPES, RELATIONSHIP_TYPES, SCHEMA_VERSION, normalize,
    normalizeEntity, normalizeRecordingReferences, validate };
});
