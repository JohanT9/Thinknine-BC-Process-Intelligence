(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.sessionGraph = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function operationFromTask(task) {
    return {
      operationId: task.taskId,
      type: task.taskType,
      semanticAction: task.semanticAction || "",
      instruction: task.instruction || "",
      actionCaption: task.actionCaption || "",
      fieldCaption: task.fieldCaption || "",
      confidence: task.confidence ?? 0.5,
      screenshot: task.screenshot || null,
      sourceEventNos: task.sourceEventNos || []
    };
  }

  function build(session, tasks, entityNodes) {
    const nodes = (entityNodes || []).map(node => ({ ...node, operations: [] }));
    const fallback = {
      nodeId: "Session-1",
      entity: "Session",
      recordValue: "",
      firstEventNo: null,
      lastEventNo: null,
      pageCaptions: [],
      operations: []
    };

    for (const task of tasks || []) {
      const node = nodes.find(candidate =>
        candidate.entity === task.entity ||
        candidate.pageCaptions.some(page =>
          String(task.pageCaption || "").toLowerCase().includes(String(page).toLowerCase()) ||
          String(page).toLowerCase().includes(String(task.pageCaption || "").toLowerCase())
        )
      ) || fallback;

      node.operations.push(operationFromTask(task));
    }

    if (fallback.operations.length) nodes.push(fallback);

    return {
      graphVersion: "1.0.0",
      sessionId: session?.id || "",
      sessionName: session?.name || "",
      nodes,
      edges: nodes.slice(1).map((node, index) => ({
        from: nodes[index].nodeId,
        to: node.nodeId,
        type: "Then"
      }))
    };
  }

  return { build, operationFromTask };
});
