(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeMcpWorkflow = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VALID_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
  const validId = value => typeof value === "string" && VALID_ID.test(value);
  const cleanCaption = value => typeof value === "string"
    ? value.replace(/[\u0000-\u001f]+/gu, " ")
      .replace(/https?:\/\/\S+|\b[^\s@]+@[^\s@]+\.[^\s@]+|\b\d{5,}\b/giu, "")
      .replace(/\s{2,}/gu, " ")
      .trim().slice(0, 160) : "";
  const unresolved = value => !value || value.status === "unresolved";

  function normalizeObjectRef(value = {}) {
    const objectId = String(value.objectId || value.pageObjectId || "");
    if (!validId(objectId)) return null;
    const objectType = ["page", "table", "report", "codeunit", "enum", "unknown"]
      .includes(value.objectType) ? value.objectType : "page";
    return { objectType, objectId,
      ...(validId(value.appId) ? { appId: value.appId } : {}),
      ...(typeof value.appVersion === "string" && value.appVersion.length <= 160
        ? { appVersion: value.appVersion } : {}) };
  }

  function buildRequests(tasks = [], locale = null, limit = 40) {
    const requests = [];
    const bySignature = new Map();
    const normalizedLocale = typeof locale === "string" &&
      /^[a-z]{2,3}-[A-Z]{2}$/u.test(locale) ? locale : null;
    const add = (kind, request, signature, taskId) => {
      let item = bySignature.get(signature);
      if (!item) {
        if (requests.length >= Math.max(0, Math.min(40, Number(limit) || 0))) return;
        item = { key: "knowledge-lookup-" + requests.length,
          kind, request, taskIds: [] };
        bySignature.set(signature, item);
        requests.push(item);
      }
      if (taskId && !item.taskIds.includes(taskId)) item.taskIds.push(taskId);
    };

    for (const task of Array.isArray(tasks) ? tasks : []) {
      const resolution = task?.knowledgeResolution || {};
      const objectRef = normalizeObjectRef(task?.knowledgeObjectRef || {});
      if (!objectRef) continue;
      const taskId = typeof task.taskId === "string" ? task.taskId.slice(0, 160) : "";
      const objectKey = [objectRef.objectType, objectRef.objectId,
        objectRef.appId || "", objectRef.appVersion || ""].join("|");
      const objectResolution = resolution.object || resolution;
      if (unresolved(objectResolution)) {
        add("object", { objectRef, productFamily: "business-central",
          ...(normalizedLocale ? { locale: normalizedLocale } : {}) },
        "object|" + objectKey, taskId);
      }
      if (unresolved(resolution.action || resolution)) {
        const control = task.knowledgeControlRef || {};
        const controlRef = {
          ...(validId(control.controlId) ? { controlId: control.controlId } : {}),
          ...(typeof control.automationId === "string" && control.automationId.length <= 160
            ? { automationId: control.automationId } : {})
        };
        const context = {
          pageCaption: cleanCaption(task.pageCaption || task.context?.currentPageCaption),
          actionCaption: cleanCaption(task.actionCaption),
          fieldCaption: cleanCaption(task.fieldCaption)
        };
        const signature = ["action", objectKey, controlRef.controlId || "",
          controlRef.automationId || "", cleanCaption(task.pageCaption || task.context?.currentPageCaption),
          cleanCaption(task.actionCaption),
          context.fieldCaption, normalizedLocale || ""].join("|");
        add("action", { objectRef, controlRef, context,
          ...(normalizedLocale ? { locale: normalizedLocale } : {}) },
        signature, taskId);
      }
    }
    return requests;
  }

  function collectSuggestions(requests = [], results = []) {
    const byKey = new Map((Array.isArray(requests) ? requests : [])
      .map(item => [item.key, item]));
    const suggestions = [];
    for (const response of Array.isArray(results) ? results : []) {
      const request = byKey.get(response?.key);
      const result = response?.result;
      if (!request || result?.status !== "suggested" ||
          result.source !== "mcp-unverified" || result.requiresReview !== true ||
          !Array.isArray(result.candidates)) continue;
      for (const candidate of result.candidates) {
        for (const taskId of request.taskIds) {
          suggestions.push({ taskId, kind: request.kind, candidate,
            remoteStatus: result.remoteStatus });
        }
      }
    }
    return suggestions;
  }

  return Object.freeze({ buildRequests, collectSuggestions, normalizeObjectRef });
});
