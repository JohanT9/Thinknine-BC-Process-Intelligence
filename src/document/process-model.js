(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCHEMA_VERSION = "1.0.0";
  const MODEL_VERSION = "1.0.0";
  const NODE_TYPES = Object.freeze([
    "start", "activity", "decision", "end", "subprocess", "information"
  ]);
  const TRANSITION_TYPES = Object.freeze([
    "sequence", "conditional", "alternate", "return", "unknown"
  ]);
  const OVERRIDE_TYPES = Object.freeze([
    "rename-node", "set-node-type", "set-process-order", "create-decision",
    "create-transition", "remove-generated-transition", "create-manual-activity",
    "create-subprocess", "move-node", "set-start", "set-end"
  ]);

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function stableId(prefix, values) {
    let hash = 2166136261;
    for (const character of values.map(String).join("\u001f")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `${prefix}:${(hash >>> 0).toString(36)}`;
  }

  function unique(values) {
    return [...new Set((values || []).filter(value => value !== null &&
      value !== undefined && value !== "").map(String))];
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function stepId(step) {
    return String(step?.stepId || step?.taskId || step?.manualStepId || "");
  }

  function sourceIds(step, primary, fallback) {
    return unique(step?.[primary] || step?.[fallback] || []);
  }

  function isHidden(step) {
    return step?.visibility === "hidden" || step?.deleted === true;
  }

  function isManual(step) {
    return step?.provenance === "manual" || step?.manuallyAdded === true ||
      step?.taskType === "ManualInformation" || Boolean(step?.manualStepId);
  }

  function manualProjection(step) {
    const type = step?.stepType || step?.manualModel?.stepType || "information";
    if (["prerequisite", "information"].includes(type)) return "information";
    if (type === "instruction") return "activity";
    if (type === "verification" && step?.metadata?.processActivity === true) {
      return "activity";
    }
    return null;
  }

  function titleFor(step) {
    return String(step?.title || step?.instruction || step?.derivedStep?.title ||
      step?.derivedStep?.instruction || "Untitled activity").trim();
  }

  function normalizeNode(value = {}) {
    const input = clone(object(value));
    return deepFreeze({ ...input,
      nodeId: String(input.nodeId || ""),
      nodeType: NODE_TYPES.includes(input.nodeType) ? input.nodeType : "activity",
      title: String(input.title || ""), description: String(input.description || ""),
      sourceStepIds: unique(input.sourceStepIds),
      sourceSubtaskIds: unique(input.sourceSubtaskIds),
      sourceSectionIds: unique(input.sourceSectionIds),
      sourceEventIds: unique(input.sourceEventIds),
      sourceSemanticActionIds: unique(input.sourceSemanticActionIds),
      manualSourceIds: unique(input.manualSourceIds),
      provenance: ["generated", "manual", "user-adjusted"].includes(input.provenance)
        ? input.provenance : "generated",
      sequence: Number.isFinite(input.sequence) ? input.sequence : 0,
      recordedOrder: Number.isFinite(input.recordedOrder) ? input.recordedOrder : null,
      presentationOrder: Number.isFinite(input.presentationOrder)
        ? input.presentationOrder : null,
      processOrder: Number.isFinite(input.processOrder) ? input.processOrder : null,
      containerId: input.containerId ? String(input.containerId) : null,
      metadata: clone(object(input.metadata)), futureFields: clone(object(input.futureFields))
    });
  }

  function normalizeTransition(value = {}) {
    const input = clone(object(value));
    return deepFreeze({ ...input, transitionId: String(input.transitionId || ""),
      fromNodeId: String(input.fromNodeId || ""), toNodeId: String(input.toNodeId || ""),
      transitionType: TRANSITION_TYPES.includes(input.transitionType)
        ? input.transitionType : "unknown",
      label: String(input.label || ""), condition: input.condition ?? null,
      sourceEventIds: unique(input.sourceEventIds),
      provenance: ["generated", "manual", "user-adjusted"].includes(input.provenance)
        ? input.provenance : "generated",
      sequence: Number.isFinite(input.sequence) ? input.sequence : 0,
      metadata: clone(object(input.metadata)), futureFields: clone(object(input.futureFields))
    });
  }

  function normalizeSubprocess(value = {}) {
    const input = clone(object(value));
    return deepFreeze({ ...input, subprocessId: String(input.subprocessId || ""),
      title: String(input.title || ""),
      sourceSectionId: input.sourceSectionId ? String(input.sourceSectionId) : null,
      sourceSubtaskId: input.sourceSubtaskId ? String(input.sourceSubtaskId) : null,
      nodeIds: unique(input.nodeIds),
      parentSubprocessId: input.parentSubprocessId
        ? String(input.parentSubprocessId) : null,
      provenance: input.provenance || "generated", metadata: clone(object(input.metadata)),
      futureFields: clone(object(input.futureFields)) });
  }

  function normalizeOverride(value = {}, index = 0) {
    const input = clone(object(value));
    const type = OVERRIDE_TYPES.includes(input.type) ? input.type : String(input.type || "");
    return deepFreeze({ ...input,
      processOverrideId: String(input.processOverrideId || stableId("process-override", [
        type, input.targetNodeId || input.targetTransitionId || input.manualNodeId || "", index
      ])), type,
      targetNodeId: input.targetNodeId ? String(input.targetNodeId) : null,
      targetTransitionId: input.targetTransitionId ? String(input.targetTransitionId) : null,
      provenance: "manual", metadata: clone(object(input.metadata)),
      futureFields: clone(object(input.futureFields)) });
  }

  function flattenHierarchy(input) {
    const resolved = input.resolvedHierarchy || input.hierarchy || {};
    const recordedIds = resolved.recordedOrder || (input.steps || []).map(stepId);
    const recorded = new Map(recordedIds.map((id, index) => [String(id), index]));
    const values = [];
    for (const section of resolved.sections || []) {
      for (const step of section.directSteps || []) values.push({ step, section, subtask: null });
      for (const subtask of section.subtasks || []) {
        for (const step of subtask.steps || []) values.push({ step, section, subtask });
      }
    }
    for (const step of resolved.unassignedSteps || []) {
      values.push({ step, section: null, subtask: null });
    }
    if (!values.length) {
      for (const step of input.steps || []) values.push({ step, section: null, subtask: null });
    }
    return values.map((entry, presentationOrder) => ({ ...entry, presentationOrder,
      recordedOrder: recorded.get(stepId(entry.step)) ?? presentationOrder }));
  }

  function generatedNode(entry, recordingId) {
    const id = stepId(entry.step);
    const nodeType = isManual(entry.step) ? manualProjection(entry.step) : "activity";
    if (!id || isHidden(entry.step) || !nodeType) return null;
    const manual = isManual(entry.step);
    return normalizeNode({
      nodeId: stableId("process-node", [MODEL_VERSION, recordingId, "step", id]),
      nodeType, title: titleFor(entry.step),
      description: String(entry.step.description || entry.step.comment || ""),
      sourceStepIds: unique(entry.step.sourceStepIds || [id]),
      sourceSubtaskIds: entry.subtask ? [entry.subtask.subtaskId] : [],
      sourceSectionIds: entry.section ? [entry.section.sectionId] : [],
      sourceEventIds: sourceIds(entry.step, "sourceEventIds", "sourceEventNos"),
      sourceSemanticActionIds: sourceIds(entry.step, "sourceSemanticActionIds",
        "semanticActionIds"),
      manualSourceIds: manual ? [entry.step.manualStepId || id] : [],
      provenance: manual ? "manual" : "generated",
      sequence: entry.presentationOrder, recordedOrder: entry.recordedOrder,
      presentationOrder: entry.presentationOrder, processOrder: entry.presentationOrder,
      metadata: { stepType: entry.step.stepType || null }
    });
  }

  function buildContainers(entries, nodes, recordingId) {
    const subprocesses = [];
    const nodeByStep = new Map(nodes.flatMap(node =>
      node.sourceStepIds.map(id => [id, node])));
    const sections = new Map();
    entries.forEach(entry => {
      if (entry.section) sections.set(entry.section.sectionId, entry.section);
    });
    for (const section of sections.values()) {
      const sectionNodeIds = nodes.filter(node =>
        node.sourceSectionIds.includes(String(section.sectionId))).map(node => node.nodeId);
      subprocesses.push(normalizeSubprocess({
        subprocessId: stableId("process-phase", [MODEL_VERSION, recordingId, section.sectionId]),
        title: section.title, sourceSectionId: section.sectionId, nodeIds: sectionNodeIds,
        metadata: { containerType: "phase" }
      }));
      const subtasks = new Map();
      entries.filter(entry => entry.section?.sectionId === section.sectionId && entry.subtask)
        .forEach(entry => subtasks.set(entry.subtask.subtaskId, entry.subtask));
      for (const subtask of subtasks.values()) {
        const stepIds = (subtask.steps || []).map(stepId);
        const childNodes = stepIds.map(id => nodeByStep.get(id)).filter(Boolean);
        if (childNodes.length < 2) continue;
        const subprocessId = stableId("process-subprocess", [
          MODEL_VERSION, recordingId, subtask.subtaskId
        ]);
        subprocesses.push(normalizeSubprocess({ subprocessId, title: subtask.title,
          sourceSectionId: section.sectionId, sourceSubtaskId: subtask.subtaskId,
          nodeIds: childNodes.map(node => node.nodeId),
          parentSubprocessId: stableId("process-phase", [
            MODEL_VERSION, recordingId, section.sectionId
          ]), metadata: { containerType: "subtask" } }));
        childNodes.forEach(node => { nodeByStep.set(node.sourceStepIds[0],
          normalizeNode({ ...node, containerId: subprocessId })); });
      }
    }
    return { subprocesses, nodes: nodes.map(node =>
      nodeByStep.get(node.sourceStepIds[0]) || node) };
  }

  function manualNodeFromOverride(override, recordingId, type) {
    const metadata = override.metadata || {};
    const manualId = override.manualNodeId || override.processOverrideId;
    return normalizeNode({ nodeId: override.nodeId || stableId("manual-process-node", [
      recordingId, manualId
    ]), nodeType: type, title: override.title || metadata.title ||
      (type === "decision" ? "Decision" : "Manual activity"),
      description: override.description || metadata.description || "",
      manualSourceIds: [manualId], provenance: "manual",
      sequence: Number.isFinite(override.sequence) ? override.sequence : Number.MAX_SAFE_INTEGER,
      processOrder: Number.isFinite(override.processOrder) ? override.processOrder : null,
      metadata: clone(metadata), futureFields: clone(override.futureFields) });
  }

  function applyOverrides(baseNodes, overrides, recordingId) {
    let nodes = baseNodes.slice();
    const orphanedOverrides = [];
    const extraTransitions = [];
    const removedTransitionIds = new Set();
    let explicitOrder = null;
    let startNodeIds = null;
    let endNodeIds = null;
    for (const override of overrides) {
      const index = nodes.findIndex(node => node.nodeId === override.targetNodeId ||
        node.sourceStepIds.includes(override.targetStepId));
      if (["rename-node", "set-node-type", "move-node"].includes(override.type)) {
        if (index < 0) { orphanedOverrides.push({ override, reason: "missing-node-target" }); continue; }
        const current = nodes[index];
        nodes[index] = normalizeNode({ ...current,
          ...(override.type === "rename-node" ? {
            title: override.title || override.metadata.title || current.title
          } : {}),
          ...(override.type === "set-node-type" ? {
            nodeType: override.nodeType || override.metadata.nodeType
          } : {}),
          ...(override.type === "move-node" ? {
            processOrder: override.processOrder ?? override.metadata.processOrder
          } : {}), provenance: "user-adjusted" });
      } else if (override.type === "create-decision") {
        nodes.push(manualNodeFromOverride(override, recordingId, "decision"));
      } else if (override.type === "create-manual-activity") {
        nodes.push(manualNodeFromOverride(override, recordingId, "activity"));
      } else if (override.type === "create-transition") {
        extraTransitions.push(override);
      } else if (override.type === "remove-generated-transition") {
        if (!override.targetTransitionId) orphanedOverrides.push({ override,
          reason: "missing-transition-target" });
        else removedTransitionIds.add(override.targetTransitionId);
      } else if (override.type === "set-process-order") {
        explicitOrder = unique(override.nodeIds || override.metadata.nodeIds);
      } else if (override.type === "set-start") {
        startNodeIds = unique(override.nodeIds || [override.targetNodeId]);
      } else if (override.type === "set-end") {
        endNodeIds = unique(override.nodeIds || [override.targetNodeId]);
      } else if (override.type === "create-subprocess") {
        orphanedOverrides.push({ override, reason: "manual-subprocess-not-projected" });
      } else if (override.type) {
        orphanedOverrides.push({ override, reason: "unsupported-override-type" });
      }
    }
    if (explicitOrder) {
      const available = new Set(nodes.map(node => node.nodeId));
      const missing = explicitOrder.filter(id => !available.has(id));
      if (missing.length) orphanedOverrides.push({
        override: overrides.find(item => item.type === "set-process-order"),
        reason: "missing-order-node", missingNodeIds: missing
      });
      const rank = new Map(explicitOrder.map((id, index) => [id, index]));
      nodes = nodes.map(node => normalizeNode({ ...node,
        processOrder: rank.get(node.nodeId) ?? node.processOrder }));
    }
    nodes.sort((left, right) => (left.processOrder ?? Number.MAX_SAFE_INTEGER) -
      (right.processOrder ?? Number.MAX_SAFE_INTEGER) ||
      left.sequence - right.sequence || left.nodeId.localeCompare(right.nodeId));
    nodes = nodes.map((node, index) => normalizeNode({ ...node, sequence: index,
      processOrder: node.processOrder ?? index }));
    return { nodes, extraTransitions, removedTransitionIds, orphanedOverrides,
      startNodeIds, endNodeIds };
  }

  function transition(fromNodeId, toNodeId, type, sequence, options = {}) {
    return normalizeTransition({ transitionId: options.transitionId || stableId(
      "process-transition", [MODEL_VERSION, fromNodeId, toNodeId, type,
        options.label || "", options.condition || ""]),
    fromNodeId, toNodeId, transitionType: type, sequence,
    label: options.label || "", condition: options.condition ?? null,
    sourceEventIds: options.sourceEventIds || [],
    provenance: options.provenance || "generated", metadata: options.metadata,
    futureFields: options.futureFields });
  }

  function project(value = {}) {
    const input = clone(object(value));
    const recordingId = String(input.recordingId || input.resolvedHierarchy?.recordingId || "");
    const entries = flattenHierarchy(input);
    let generated = entries.map(entry => generatedNode(entry, recordingId)).filter(Boolean);
    const containers = buildContainers(entries, generated, recordingId);
    generated = containers.nodes;
    const overrides = (input.overrides || []).map(normalizeOverride);
    const applied = applyOverrides(generated, overrides, recordingId);
    const start = normalizeNode({ nodeId: stableId("process-node", [
      MODEL_VERSION, recordingId, "start"
    ]), nodeType: "start", title: input.startTitle || "Start", sequence: -1,
    processOrder: -1, metadata: { boundary: "neutral" } });
    const end = normalizeNode({ nodeId: stableId("process-node", [
      MODEL_VERSION, recordingId, "end"
    ]), nodeType: "end", title: input.endTitle || "End",
    sequence: applied.nodes.length, processOrder: applied.nodes.length,
    metadata: { boundary: "neutral" } });
    const nodes = [start, ...applied.nodes, end];
    const generatedTransitions = [];
    const ordered = nodes;
    for (let index = 0; index < ordered.length - 1; index += 1) {
      generatedTransitions.push(transition(ordered[index].nodeId,
        ordered[index + 1].nodeId, "sequence", index));
    }
    const explicitOrigins = new Set(applied.extraTransitions.map(item => item.fromNodeId));
    let transitions = generatedTransitions.filter(item =>
      !applied.removedTransitionIds.has(item.transitionId) &&
      !(nodes.find(node => node.nodeId === item.fromNodeId)?.nodeType === "decision" &&
        explicitOrigins.has(item.fromNodeId)));
    for (const override of applied.extraTransitions) {
      transitions.push(transition(override.fromNodeId, override.toNodeId,
        override.transitionType || "unknown", transitions.length, {
          transitionId: override.transitionId, label: override.label,
          condition: override.condition, sourceEventIds: override.sourceEventIds,
          provenance: "manual", metadata: override.metadata,
          futureFields: override.futureFields
        }));
    }
    const processModel = {
      ...input.futureTopLevelFields,
      processModelId: stableId("process-model", [MODEL_VERSION, recordingId]),
      schemaVersion: input.schemaVersion || SCHEMA_VERSION,
      modelVersion: input.modelVersion || MODEL_VERSION,
      recordingId, title: String(input.title || "Documented process"),
      description: String(input.description || ""),
      startNodeIds: applied.startNodeIds || [start.nodeId],
      endNodeIds: applied.endNodeIds || [end.nodeId],
      nodes, transitions, subprocesses: containers.subprocesses,
      metadata: { processOrderSource: overrides.some(item =>
        item.type === "set-process-order" || item.type === "move-node")
        ? "override" : "presentation-order", ...(input.metadata || {}) },
      provenance: { origin: "process-model-projector", modelVersion: MODEL_VERSION,
        generated: true, ...(input.provenance || {}) },
      createdAt: input.createdAt || null, updatedAt: input.updatedAt || input.createdAt || null,
      processOverrides: overrides,
      orphanedOverrides: applied.orphanedOverrides,
      futureFields: clone(object(input.futureFields))
    };
    return deepFreeze(processModel);
  }

  function validate(model, options = {}) {
    const diagnostics = [];
    const nodes = model?.nodes || [];
    const transitions = model?.transitions || [];
    const nodeIds = new Set();
    const transitionIds = new Set();
    const add = (code, severity, details = {}) => diagnostics.push({ code, severity,
      ...details });
    nodes.forEach(node => {
      if (!node.nodeId || nodeIds.has(node.nodeId)) add("duplicate-node-id", "error",
        { nodeId: node.nodeId });
      nodeIds.add(node.nodeId);
    });
    const pairs = new Set();
    transitions.forEach(value => {
      if (!value.transitionId || transitionIds.has(value.transitionId)) {
        add("duplicate-transition-id", "error", { transitionId: value.transitionId });
      }
      transitionIds.add(value.transitionId);
      if (!nodeIds.has(value.fromNodeId) || !nodeIds.has(value.toNodeId)) {
        add("orphan-transition", "error", { transitionId: value.transitionId });
      }
      if (value.fromNodeId === value.toNodeId && value.provenance !== "manual") {
        add("accidental-self-loop", "error", { transitionId: value.transitionId });
      }
      const pair = `${value.fromNodeId}\u001f${value.toNodeId}\u001f${value.transitionType}`;
      if (pairs.has(pair)) add("duplicate-transition", "warning",
        { transitionId: value.transitionId });
      pairs.add(pair);
    });
    if (!(model?.startNodeIds || []).length || model.startNodeIds.some(id => !nodeIds.has(id))) {
      add("missing-start", "error");
    }
    if (!(model?.endNodeIds || []).length || model.endNodeIds.some(id => !nodeIds.has(id))) {
      add("missing-end", "error");
    }
    const outgoing = new Map();
    transitions.forEach(item => {
      if (!outgoing.has(item.fromNodeId)) outgoing.set(item.fromNodeId, []);
      outgoing.get(item.fromNodeId).push(item.toNodeId);
    });
    const reachable = new Set(model?.startNodeIds || []);
    const queue = [...reachable];
    while (queue.length) {
      for (const id of outgoing.get(queue.shift()) || []) {
        if (!reachable.has(id)) { reachable.add(id); queue.push(id); }
      }
    }
    nodes.filter(node => ["activity", "decision", "information"].includes(node.nodeType) &&
      !reachable.has(node.nodeId)).forEach(node => add("unreachable-node", "warning",
      { nodeId: node.nodeId }));
    nodes.filter(node => node.nodeType === "decision" && node.provenance === "manual" &&
      (outgoing.get(node.nodeId) || []).length < 2).forEach(node =>
      add("manual-decision-incomplete", "warning", { nodeId: node.nodeId }));
    const subprocessIds = new Set((model?.subprocesses || []).map(item => item.subprocessId));
    (model?.subprocesses || []).forEach(item => {
      if (item.parentSubprocessId && !subprocessIds.has(item.parentSubprocessId)) {
        add("orphan-subprocess-parent", "error", { subprocessId: item.subprocessId });
      }
      item.nodeIds.filter(id => !nodeIds.has(id)).forEach(nodeId =>
        add("orphan-subprocess-node", "error", { subprocessId: item.subprocessId, nodeId }));
    });
    for (const orphan of model?.orphanedOverrides || []) {
      add("orphaned-process-override", "warning", {
        processOverrideId: orphan.override?.processOverrideId, reason: orphan.reason
      });
    }
    if (options.validStepIds) {
      const valid = new Set(options.validStepIds.map(String));
      nodes.flatMap(node => node.sourceStepIds.map(id => ({ node, id })))
        .filter(item => !valid.has(item.id)).forEach(item =>
          add("broken-source-reference", "warning", { nodeId: item.node.nodeId,
            sourceStepId: item.id }));
    }
    return deepFreeze({ valid: !diagnostics.some(item => item.severity === "error"),
      diagnostics });
  }

  function outline(model) {
    return (model?.nodes || []).slice().sort((left, right) =>
      left.processOrder - right.processOrder).map(node => ({
      nodeId: node.nodeId, nodeType: node.nodeType, title: node.title,
      provenance: node.provenance, containerId: node.containerId
    }));
  }

  return { MODEL_VERSION, NODE_TYPES, OVERRIDE_TYPES, SCHEMA_VERSION,
    TRANSITION_TYPES, deepFreeze, normalizeNode, normalizeOverride,
    normalizeSubprocess, normalizeTransition, outline, project, stableId, validate };
});
