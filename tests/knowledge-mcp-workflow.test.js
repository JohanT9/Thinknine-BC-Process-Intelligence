const assert = require("assert");
const workflow = require("../src/engine/knowledge-mcp-workflow");
const tasks = [
  { taskId: "t-1", knowledgeObjectRef: { objectType: "page", objectId: "9999", appId: "app-a" },
    knowledgeControlRef: { controlId: "submit", automationId: "submit-button" },
    pageCaption: "Sales Order https://example.test/path", actionCaption: "Post invoice",
    fieldCaption: "Email user@example.test value 123456", value: "private-record-value",
    screenshot: "screenshots/secret.png",
    knowledgeResolution: { object: { status: "unresolved" }, action: { status: "unresolved" } } },
  { taskId: "t-2", knowledgeObjectRef: { objectType: "page", objectId: "9999", appId: "app-a" },
    knowledgeControlRef: { controlId: "submit", automationId: "submit-button" },
    pageCaption: "Sales Order", actionCaption: "Post invoice",
    fieldCaption: "Email value", knowledgeResolution: { object: { status: "unresolved" },
      action: { status: "unresolved" } } },
  { taskId: "t-local", knowledgeObjectRef: { objectType: "page", objectId: "21" },
    knowledgeResolution: { object: { status: "resolved" }, action: { status: "resolved" } } },
  { taskId: "t-no-id", knowledgeObjectRef: {},
    knowledgeResolution: { object: { status: "unresolved" }, action: { status: "unresolved" } } }
];
const requests = workflow.buildRequests(tasks, "en-US");
assert.strictEqual(requests.length, 2, "deduplicates identical unresolved object and action lookups");
assert.deepStrictEqual(requests.map(item => item.kind), ["object", "action"]);
assert.deepStrictEqual(requests[0].taskIds, ["t-1", "t-2"]);
assert.strictEqual(requests[1].taskIds.length, 2);
assert.strictEqual(requests[1].request.context.pageCaption, "Sales Order");
assert.strictEqual(requests[1].request.context.actionCaption, "Post invoice");
assert.strictEqual(requests[1].request.context.fieldCaption, "Email value");
assert.strictEqual(requests.some(item => JSON.stringify(item).includes("private-record-value")), false);
assert.strictEqual(requests.some(item => JSON.stringify(item).includes("secret.png")), false);
assert.strictEqual(requests.some(item => JSON.stringify(item).includes("user@example.test")), false);
assert.strictEqual(workflow.buildRequests(tasks, "en-US", 1).length, 1);
const candidate = { candidateId: "candidate-page-9", objectRef: { objectType: "page",
  objectId: "9999" }, confidence: 0.69, provenance: { sourceId: "bc-core", sourceVersion: "2.0" } };
const suggestions = workflow.collectSuggestions(requests, [
  { key: requests[0].key, result: { status: "suggested", source: "mcp-unverified",
    requiresReview: true, remoteStatus: "resolved", candidates: [candidate] } },
  { key: requests[1].key, result: { status: "suggested", source: "mcp-unverified",
    requiresReview: false, remoteStatus: "resolved", candidates: [candidate] } }
]);
assert.strictEqual(suggestions.length, 2, "only attaches suggestions marked for review");
assert.strictEqual(suggestions[0].taskId, "t-1");
assert.strictEqual(suggestions[1].taskId, "t-2");
console.log("Knowledge MCP workflow only projects unresolved safe metadata and preserves review gating.");
