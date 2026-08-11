(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessVersioning = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const VERSION_SCHEMA_VERSION = "1.0.0";
  const DIFF_SCHEMA_VERSION = "1.0.0";
  const DIFF_VERSION = "1.0.0";
  const STATUSES = Object.freeze(["draft", "review", "approved", "superseded"]);
  const PROVENANCE = Object.freeze([
    "manual-snapshot", "generated-baseline", "imported", "regenerated"
  ]);

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean).map(String))].sort();
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key =>
        `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function stableId(prefix, values) {
    let hash = 2166136261;
    for (const character of values.map(String).join("\u001f")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `${prefix}:${(hash >>> 0).toString(36)}`;
  }

  function semanticMetadata(value) {
    const excluded = /^(screenshot|annotation|theme|renderer|layout|pixel|geometry|ui|word|docx|createdAt|updatedAt|processOrderSource)/i;
    return Object.fromEntries(Object.entries(object(value))
      .filter(([key]) => !excluded.test(key)).sort(([left], [right]) =>
        left.localeCompare(right)).map(([key, item]) => [key, clone(item)]));
  }

  function semanticNode(node) {
    const authored = ["manual", "user-adjusted"].includes(node.provenance);
    return {
      nodeId: String(node.nodeId || ""), nodeType: node.nodeType || "activity",
      ...(authored ? { title: String(node.title || ""),
        description: String(node.description || "") } : {}),
      sourceStepIds: unique(node.sourceStepIds),
      sourceSubtaskIds: unique(node.sourceSubtaskIds),
      sourceSectionIds: unique(node.sourceSectionIds),
      sourceEventIds: unique(node.sourceEventIds),
      sourceSemanticActionIds: unique(node.sourceSemanticActionIds),
      manualSourceIds: unique(node.manualSourceIds), provenance: node.provenance || "generated",
      processOrder: Number.isFinite(node.processOrder) ? node.processOrder : null,
      containerId: node.containerId || null,
      metadata: authored ? semanticMetadata(node.metadata) : {}
    };
  }

  function semanticTransition(value) {
    return { transitionId: String(value.transitionId || ""),
      fromNodeId: String(value.fromNodeId || ""), toNodeId: String(value.toNodeId || ""),
      transitionType: value.transitionType || "unknown", label: String(value.label || ""),
      condition: value.condition ?? null, provenance: value.provenance || "generated",
      sourceEventIds: unique(value.sourceEventIds),
      metadata: semanticMetadata(value.metadata) };
  }

  function semanticContainer(value) {
    const authored = ["manual", "user-adjusted"].includes(value.provenance);
    return { subprocessId: String(value.subprocessId || ""),
      ...(authored ? { title: String(value.title || "") } : {}),
      sourceSectionId: value.sourceSectionId || null,
      sourceSubtaskId: value.sourceSubtaskId || null,
      nodeIds: unique(value.nodeIds), parentSubprocessId: value.parentSubprocessId || null,
      provenance: value.provenance || "generated",
      metadata: authored ? semanticMetadata(value.metadata) : {
        containerType: value.metadata?.containerType || null
      } };
  }

  function semanticSnapshot(model = {}) {
    return deepFreeze({ startNodeIds: unique(model.startNodeIds),
      endNodeIds: unique(model.endNodeIds),
      nodes: (model.nodes || []).map(semanticNode).sort((a, b) =>
        a.nodeId.localeCompare(b.nodeId)),
      transitions: (model.transitions || []).map(semanticTransition).sort((a, b) =>
        a.transitionId.localeCompare(b.transitionId)),
      subprocesses: (model.subprocesses || []).map(semanticContainer).sort((a, b) =>
        a.subprocessId.localeCompare(b.subprocessId)),
      metadata: semanticMetadata(model.metadata) });
  }

  function semanticFingerprint(model) {
    return stableId("process-fingerprint", [stableStringify(semanticSnapshot(model))]);
  }

  function versionNumber(value) {
    const result = String(value || "");
    if (!/^\d+\.\d+$/.test(result)) {
      throw new TypeError("Process version number must use major.minor format.");
    }
    return result;
  }

  function normalizeVersion(value = {}) {
    const input = clone(object(value));
    const snapshot = clone(object(input.processSnapshot));
    return deepFreeze({ ...input,
      processVersionId: String(input.processVersionId || ""),
      schemaVersion: String(input.schemaVersion || VERSION_SCHEMA_VERSION),
      versionNumber: versionNumber(input.versionNumber),
      versionSequence: Number.isFinite(input.versionSequence) ? input.versionSequence : 0,
      processModelId: String(input.processModelId || snapshot.processModelId || ""),
      processModelVersion: String(input.processModelVersion || snapshot.modelVersion || ""),
      semanticFingerprint: String(input.semanticFingerprint ||
        semanticFingerprint(snapshot)),
      recordingId: String(input.recordingId || snapshot.recordingId || ""),
      parentVersionId: input.parentVersionId ? String(input.parentVersionId) : null,
      createdAt: input.createdAt || null, createdBy: input.createdBy || null,
      creationReason: String(input.creationReason || ""),
      title: String(input.title || snapshot.title || ""),
      description: String(input.description || ""),
      versionNotes: String(input.versionNotes || ""),
      status: STATUSES.includes(input.status) ? input.status : "draft",
      baseline: Boolean(input.baseline), processSnapshot: snapshot,
      sourceRecordingRevision: input.sourceRecordingRevision ?? null,
      sourceHierarchyRevision: input.sourceHierarchyRevision ?? null,
      sourceOverrideRevision: input.sourceOverrideRevision ?? null,
      provenance: PROVENANCE.includes(input.provenance)
        ? input.provenance : "manual-snapshot",
      metadata: clone(object(input.metadata)), futureFields: clone(object(input.futureFields))
    });
  }

  function createVersion(model, options = {}, existingVersions = []) {
    const snapshot = clone(object(model));
    const fingerprint = semanticFingerprint(snapshot);
    const history = existingVersions.map(normalizeVersion);
    const latest = history.slice().sort((a, b) => b.versionSequence - a.versionSequence)[0];
    if (latest?.semanticFingerprint === fingerprint && !options.allowMetadataOnly) {
      return deepFreeze({ created: false, reason: "identical-semantic-snapshot",
        message: `No process changes since version ${latest.versionNumber}.`,
        existingVersionId: latest.processVersionId, version: null });
    }
    const number = versionNumber(options.versionNumber || (history.length ? "1.1" : "1.0"));
    if (history.some(item => item.versionNumber === number)) {
      throw new Error(`Process version ${number} already exists.`);
    }
    const sequence = Number.isFinite(options.versionSequence)
      ? options.versionSequence : (Math.max(-1, ...history.map(item => item.versionSequence)) + 1);
    const parentVersionId = options.parentVersionId === undefined
      ? latest?.processVersionId || null : options.parentVersionId;
    const id = options.processVersionId || stableId("process-version", [
      snapshot.processModelId || "", fingerprint, parentVersionId || "", sequence, number
    ]);
    return deepFreeze({ created: true, reason: null, message: null,
      existingVersionId: null, version: normalizeVersion({
        ...options, processVersionId: id, versionNumber: number,
        versionSequence: sequence, processModelId: snapshot.processModelId,
        processModelVersion: snapshot.modelVersion,
        semanticFingerprint: fingerprint, recordingId: snapshot.recordingId,
        parentVersionId, processSnapshot: snapshot,
        provenance: options.provenance || (options.baseline
          ? "generated-baseline" : "manual-snapshot")
      }) });
  }

  function traceKey(node) {
    const groups = [node.sourceStepIds, node.sourceSemanticActionIds, node.sourceEventIds]
      .map(unique).filter(values => values.length);
    return groups.length ? groups.map(values => values.join("\u001e")).join("\u001d") : null;
  }

  function matchNodes(fromNodes, toNodes) {
    const matches = [];
    const unmatchedFrom = new Map(fromNodes.map(node => [node.nodeId, node]));
    const unmatchedTo = new Map(toNodes.map(node => [node.nodeId, node]));
    for (const [id, from] of unmatchedFrom) {
      if (!unmatchedTo.has(id)) continue;
      matches.push({ from, to: unmatchedTo.get(id), strategy: "node-id" });
      unmatchedFrom.delete(id); unmatchedTo.delete(id);
    }
    const fromTrace = new Map();
    const toTrace = new Map();
    for (const node of unmatchedFrom.values()) {
      const key = traceKey(node);
      if (key) fromTrace.set(key, fromTrace.has(key) ? null : node);
    }
    for (const node of unmatchedTo.values()) {
      const key = traceKey(node);
      if (key) toTrace.set(key, toTrace.has(key) ? null : node);
    }
    for (const [key, from] of fromTrace) {
      const to = toTrace.get(key);
      if (!from || !to) continue;
      matches.push({ from, to, strategy: "stable-traceability" });
      unmatchedFrom.delete(from.nodeId); unmatchedTo.delete(to.nodeId);
    }
    return { matches, removed: [...unmatchedFrom.values()], added: [...unmatchedTo.values()] };
  }

  function differences(left, right, fields) {
    return fields.filter(field => stableStringify(left[field]) !== stableStringify(right[field]));
  }

  function nodeChanges(fromModel, toModel) {
    const matched = matchNodes(fromModel.nodes || [], toModel.nodes || []);
    const changes = matched.added.map(node => ({ changeType: "added", nodeId: node.nodeId,
      after: clone(node), provenance: node.provenance, categories: ["structural"] }))
      .concat(matched.removed.map(node => ({ changeType: "removed", nodeId: node.nodeId,
        before: clone(node), provenance: node.provenance, categories: ["structural"] })));
    for (const match of matched.matches) {
      const left = semanticNode(match.from); const right = semanticNode(match.to);
      const movedFields = differences(left, right, ["processOrder", "containerId",
        "sourceSubtaskIds", "sourceSectionIds"]);
      const modifiedFields = differences(left, right, ["nodeType", "title", "description",
        "manualSourceIds", "provenance", "metadata"]);
      if (movedFields.length) changes.push({ changeType: "moved", nodeId: match.to.nodeId,
        previousNodeId: match.from.nodeId, matchStrategy: match.strategy,
        changedFields: movedFields, before: clone(match.from), after: clone(match.to),
        provenance: match.to.provenance, categories: ["flow", "structural"] });
      if (modifiedFields.length) changes.push({ changeType: "modified",
        nodeId: match.to.nodeId, previousNodeId: match.from.nodeId,
        matchStrategy: match.strategy, changedFields: modifiedFields,
        before: clone(match.from), after: clone(match.to),
        provenance: match.to.provenance, categories: ["content"] });
      if (!movedFields.length && !modifiedFields.length) changes.push({
        changeType: "unchanged", nodeId: match.to.nodeId,
        previousNodeId: match.from.nodeId, matchStrategy: match.strategy,
        provenance: match.to.provenance, categories: [] });
    }
    return { changes, matches: matched.matches };
  }

  function mappedEndpoint(id, matches) {
    return matches.find(match => match.from.nodeId === id)?.to.nodeId || id;
  }

  function transitionChanges(fromModel, toModel, matches) {
    const from = new Map((fromModel.transitions || []).map(value => [value.transitionId, value]));
    const to = new Map((toModel.transitions || []).map(value => [value.transitionId, value]));
    const changes = [];
    for (const [id, left] of [...from]) {
      if (!to.has(id)) continue;
      const right = to.get(id);
      const fields = differences(semanticTransition(left), semanticTransition(right),
        ["fromNodeId", "toNodeId", "transitionType", "label", "condition",
          "provenance", "metadata"]);
      changes.push({ changeType: fields.length ? "transition-modified" : "unchanged",
        transitionId: id, changedFields: fields, before: clone(left), after: clone(right),
        provenance: right.provenance, categories: fields.length ? ["flow"] : [] });
      from.delete(id); to.delete(id);
    }
    const toByEndpoints = new Map();
    for (const value of to.values()) {
      const key = `${value.fromNodeId}\u001f${value.toNodeId}`;
      toByEndpoints.set(key, toByEndpoints.has(key) ? null : value);
    }
    for (const [id, left] of [...from]) {
      const key = `${mappedEndpoint(left.fromNodeId, matches)}\u001f` +
        mappedEndpoint(left.toNodeId, matches);
      const right = toByEndpoints.get(key);
      if (!right) continue;
      const fields = differences(semanticTransition(left), semanticTransition(right),
        ["transitionType", "label", "condition", "provenance", "metadata"]);
      changes.push({ changeType: fields.length ? "transition-modified" : "unchanged",
        transitionId: right.transitionId, previousTransitionId: id,
        matchStrategy: "mapped-endpoints", changedFields: fields,
        before: clone(left), after: clone(right), provenance: right.provenance,
        categories: fields.length ? ["flow"] : [] });
      from.delete(id); to.delete(right.transitionId);
    }
    from.forEach(value => changes.push({ changeType: "transition-removed",
      transitionId: value.transitionId, before: clone(value),
      provenance: value.provenance, categories: ["flow"] }));
    to.forEach(value => changes.push({ changeType: "transition-added",
      transitionId: value.transitionId, after: clone(value),
      provenance: value.provenance, categories: ["flow"] }));
    return changes;
  }

  function containerChanges(fromModel, toModel) {
    const from = new Map((fromModel.subprocesses || []).map(value => [value.subprocessId, value]));
    const to = new Map((toModel.subprocesses || []).map(value => [value.subprocessId, value]));
    const changes = [];
    for (const [id, left] of from) {
      if (!to.has(id)) { changes.push({ changeType: "removed", subprocessId: id,
        before: clone(left), provenance: left.provenance }); continue; }
      const right = to.get(id);
      const fields = differences(semanticContainer(left), semanticContainer(right),
        ["title", "nodeIds", "parentSubprocessId", "sourceSectionId",
          "sourceSubtaskId", "provenance", "metadata"]);
      changes.push({ changeType: fields.length ? "container-changed" : "unchanged",
        subprocessId: id, changedFields: fields, before: clone(left), after: clone(right),
        provenance: right.provenance });
    }
    for (const [id, right] of to) if (!from.has(id)) changes.push({
      changeType: "added", subprocessId: id, after: clone(right),
      provenance: right.provenance });
    return changes;
  }

  function versionLike(value, label = "current") {
    if (value?.processSnapshot) return normalizeVersion(value);
    const snapshot = clone(object(value));
    const fingerprint = semanticFingerprint(snapshot);
    return { processVersionId: `${label}:${fingerprint}`,
      processSnapshot: snapshot, semanticFingerprint: fingerprint };
  }

  function compareProcessVersions(fromValue, toValue, options = {}) {
    const from = versionLike(fromValue, "current-from");
    const to = versionLike(toValue, "current-to");
    const nodeResult = nodeChanges(from.processSnapshot, to.processSnapshot);
    const transitions = transitionChanges(from.processSnapshot, to.processSnapshot,
      nodeResult.matches);
    const containers = containerChanges(from.processSnapshot, to.processSnapshot);
    const nodes = nodeResult.changes;
    const fromSemantic = semanticSnapshot(from.processSnapshot);
    const toSemantic = semanticSnapshot(to.processSnapshot);
    const metadataChanges = ["startNodeIds", "endNodeIds", "metadata"]
      .filter(field => stableStringify(fromSemantic[field]) !==
        stableStringify(toSemantic[field])).map(field => ({
        changeType: "modified", field, before: clone(fromSemantic[field]),
        after: clone(toSemantic[field]), categories: [field === "metadata"
          ? "metadata" : "flow"]
      }));
    const count = (values, type) => values.filter(value => value.changeType === type).length;
    const summary = { addedNodes: count(nodes, "added"), removedNodes: count(nodes, "removed"),
      modifiedNodes: count(nodes, "modified"), movedNodes: count(nodes, "moved"),
      addedTransitions: count(transitions, "transition-added"),
      removedTransitions: count(transitions, "transition-removed"),
      modifiedTransitions: count(transitions, "transition-modified"),
      changedContainers: containers.filter(value => value.changeType !== "unchanged").length,
      modifiedMetadata: metadataChanges.length };
    const changed = Object.values(summary).some(Boolean);
    return deepFreeze({ processDiffId: stableId("process-diff", [
      from.processVersionId, to.processVersionId, DIFF_VERSION
    ]), schemaVersion: DIFF_SCHEMA_VERSION, diffVersion: DIFF_VERSION,
    fromProcessVersionId: from.processVersionId,
    toProcessVersionId: to.processVersionId, nodeChanges: nodes,
    transitionChanges: transitions, containerChanges: containers,
    metadataChanges, summary: { ...summary, changed,
      text: changed ? `${Object.values(summary).reduce((sum, value) =>
        sum + (Number(value) || 0), 0)} semantic process changes detected.` :
        "No semantic process changes detected." },
    futureFields: clone(object(options.futureFields)) });
  }

  function history(values = []) {
    return deepFreeze(values.map(normalizeVersion).sort((left, right) =>
      left.versionSequence - right.versionSequence ||
      String(left.createdAt || "").localeCompare(String(right.createdAt || ""))));
  }

  function baseline(values = []) {
    return history(values).filter(value => value.baseline || value.status === "approved").at(-1) || null;
  }

  function compareCurrentToBaseline(currentModel, values = []) {
    const value = baseline(values);
    return value ? compareProcessVersions(value, currentModel) : null;
  }

  function libraryMetadata(values = []) {
    const ordered = history(values);
    const current = ordered.at(-1) || null;
    const base = baseline(ordered);
    return deepFreeze({ currentVersion: current?.versionNumber || "",
      currentVersionId: current?.processVersionId || "", versionCount: ordered.length,
      baselineVersion: base?.versionNumber || "", baselineVersionId: base?.processVersionId || "",
      approvedVersion: ordered.filter(value => value.status === "approved").at(-1)
        ?.versionNumber || "", lastProcessChangeAt: current?.createdAt || "" });
  }

  return { DIFF_SCHEMA_VERSION, DIFF_VERSION, PROVENANCE, STATUSES,
    VERSION_SCHEMA_VERSION, baseline, compareCurrentToBaseline,
    compareProcessVersions, createVersion, deepFreeze, history, libraryMetadata,
    matchNodes, normalizeVersion, semanticFingerprint, semanticSnapshot,
    stableId, stableStringify };
});
