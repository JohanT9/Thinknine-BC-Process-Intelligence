(function (root, factory) {
  const schema = typeof module === "object" && module.exports
    ? require("./process-taxonomy-schema") : root.T9ProcessTaxonomySchema;
  const api = factory(schema);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessTaxonomy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (schema) {
  const COLLECTIONS = Object.freeze({ ProcessDomain: "domains",
    BusinessProcess: "businessProcesses", BCProcess: "bcProcesses",
    ProcessStep: "processSteps", ProcessDocument: "documents",
    ProcessAction: "actions", ProcessRelationship: "relationships",
    ProcessVariant: "variants" });

  function create(input = {}) {
    const validated = schema.validate(input);
    if (!validated.valid) {
      const error = new Error(`Invalid process taxonomy (${validated.errors.length} errors).`);
      error.diagnostics = validated.errors;
      throw error;
    }
    const taxonomy = validated.taxonomy;
    const entities = Object.values(COLLECTIONS).flatMap(name => taxonomy[name]);
    const byId = new Map(entities.map(entity => [entity.id, entity]));
    const byName = new Map();
    entities.forEach(entity => {
      const key = entity.name.toLocaleLowerCase("en");
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(entity);
    });

    function get(id, expectedType = null) {
      const entity = byId.get(String(id || "")) || null;
      return !expectedType || entity?.entityType === expectedType ? entity : null;
    }

    function find(query, entityType = null) {
      const text = String(query || "").trim().toLocaleLowerCase("en");
      if (!text) return [];
      return entities.filter(entity => (!entityType || entity.entityType === entityType) &&
        (entity.id.toLocaleLowerCase("en") === text ||
          entity.name.toLocaleLowerCase("en").includes(text)));
    }

    function children(id) {
      const entity = get(id);
      if (!entity) return [];
      if (entity.entityType === "ProcessDomain") return taxonomy.businessProcesses
        .filter(item => item.domainId === entity.id);
      if (entity.entityType === "BusinessProcess") return taxonomy.bcProcesses
        .filter(item => item.businessProcessId === entity.id);
      if (entity.entityType === "BCProcess") return entity.processStepIds
        .map(stepId => get(stepId, "ProcessStep")).filter(Boolean)
        .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id));
      if (entity.entityType === "ProcessStep") return entity.actionIds
        .map(actionId => get(actionId, "ProcessAction")).filter(Boolean);
      return [];
    }

    function ancestors(id) {
      const result = [];
      let entity = get(id);
      while (entity) {
        let parent = null;
        if (entity.entityType === "ProcessAction") parent = get(entity.processStepId);
        else if (entity.entityType === "ProcessStep") parent = get(entity.bcProcessId);
        else if (entity.entityType === "BCProcess") parent = get(entity.businessProcessId);
        else if (entity.entityType === "BusinessProcess") parent = get(entity.domainId);
        if (!parent) break;
        result.unshift(parent); entity = parent;
      }
      return result;
    }

    function hierarchy(id) {
      const entity = get(id);
      return entity ? [...ancestors(id), entity] : [];
    }

    function mapAction(actionId) {
      const action = get(actionId, "ProcessAction");
      if (!action) return null;
      const chain = hierarchy(action.id);
      return Object.freeze({ domain: chain.find(item => item.entityType === "ProcessDomain"),
        businessProcess: chain.find(item => item.entityType === "BusinessProcess"),
        bcProcess: chain.find(item => item.entityType === "BCProcess"),
        processStep: chain.find(item => item.entityType === "ProcessStep"), action });
    }

    function relationships(id, options = {}) {
      const direction = options.direction || "both";
      const type = options.type || null;
      return taxonomy.relationships.filter(relationship =>
        (!type || relationship.relationshipType === type) &&
        ((direction !== "incoming" && relationship.fromEntityId === id) ||
          (direction !== "outgoing" && relationship.toEntityId === id)));
    }

    function variants(bcProcessId) {
      return taxonomy.variants.filter(variant => variant.bcProcessId === bcProcessId);
    }

    function extend(extension = {}) {
      const merged = { ...taxonomy };
      Object.values(COLLECTIONS).forEach(name => {
        merged[name] = [...taxonomy[name], ...(extension[name] || [])];
      });
      merged.metadata = { ...taxonomy.metadata, ...(extension.metadata || {}) };
      return create(merged);
    }

    function validateRecordingReferences(input = {}) {
      const references = schema.normalizeRecordingReferences(input);
      const errors = [];
      const check = (field, type) => {
        if (references[field] && !get(references[field], type)) errors.push({
          code: "invalid-recording-taxonomy-reference", field,
          referenceId: references[field], expectedEntityType: type });
      };
      check("domainId", "ProcessDomain"); check("businessProcessId", "BusinessProcess");
      check("bcProcessId", "BCProcess"); check("variantId", "ProcessVariant");
      references.processStepIds.forEach(referenceId => {
        if (!get(referenceId, "ProcessStep")) errors.push({
          code: "invalid-recording-taxonomy-reference", field: "processStepIds",
          referenceId, expectedEntityType: "ProcessStep" });
      });
      references.actionMappings.forEach(mapping => {
        const action = get(mapping.processActionId, "ProcessAction");
        if (!action || (mapping.processStepId && action.processStepId !== mapping.processStepId)) {
          errors.push({ code: "invalid-recording-action-mapping",
            recordedActionId: mapping.recordedActionId,
            processActionId: mapping.processActionId,
            processStepId: mapping.processStepId });
        }
      });
      const process = get(references.bcProcessId, "BCProcess");
      const businessProcess = get(references.businessProcessId, "BusinessProcess");
      if (process && references.businessProcessId &&
          process.businessProcessId !== references.businessProcessId) errors.push({
        code: "inconsistent-recording-taxonomy-hierarchy", field: "businessProcessId" });
      if (businessProcess && references.domainId &&
          businessProcess.domainId !== references.domainId) errors.push({
        code: "inconsistent-recording-taxonomy-hierarchy", field: "domainId" });
      const variant = get(references.variantId, "ProcessVariant");
      if (variant && references.bcProcessId && variant.bcProcessId !== references.bcProcessId) {
        errors.push({ code: "inconsistent-recording-taxonomy-hierarchy",
          field: "variantId" });
      }
      return Object.freeze({ valid: errors.length === 0, errors, references });
    }

    return Object.freeze({ taxonomy, get, find, children, ancestors, hierarchy,
      mapAction, relationships, variants, extend, validateRecordingReferences,
      exactName(name, entityType = null) {
        return (byName.get(String(name || "").toLocaleLowerCase("en")) || [])
          .filter(entity => !entityType || entity.entityType === entityType);
      } });
  }

  return { COLLECTIONS, create };
});
