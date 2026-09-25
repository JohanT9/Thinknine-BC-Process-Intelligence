(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BCKnowledgeResolution = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const terminal = result => result?.status === "resolved" || result?.status === "ambiguous" ||
    result?.status === "suggested";
  function create({ repository = null, mcp = null, ai = null, releaseId = null } = {}) {
    const release = repository?.getRelease?.(releaseId);
    const allowedCandidates = release ? {
      taskTypes: [...new Set(release.rules.map(rule => rule.taskType))],
      semanticActions: [...new Set(release.rules.map(rule => rule.semanticAction))]
    } : { taskTypes: [], semanticActions: [] };
    return Object.freeze({
      async resolveObject(request = {}) {
        const local = repository?.lookupObject?.(request.objectRef || {}, releaseId) ||
          { status: "unresolved", candidates: [] };
        if (terminal(local)) return { ...local, source: "local-knowledge" };
        if (mcp?.resolveObject) return mcp.resolveObject(request);
        return local;
      },
      async resolveAction(request = {}) {
        const local = repository?.resolveAction?.({ objectRef: request.objectRef || {},
          controlRef: request.controlRef || {}, context: request.context || {},
          language: request.locale || null }, releaseId) ||
          { status: "unresolved", candidates: [] };
        if (terminal(local)) return { ...local, source: "local-knowledge" };
        if (mcp?.resolveAction) {
          const remote = await mcp.resolveAction(request);
          if (terminal(remote)) return remote;
        }
        if (!ai?.propose) return { status: "unresolved", candidates: [],
          reason: "no-resolution-provider" };
        return ai.propose({ ...request, localResolution: local, allowedCandidates });
      }
    });
  }
  return { create };
});
