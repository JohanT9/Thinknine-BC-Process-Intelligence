const assert = require("assert");
const fs = require("fs");
const path = require("path");
const background = fs.readFileSync(path.join(__dirname, "../src/recorder/background.js"), "utf8");
const start = background.indexOf('case "T9_TEST_KNOWLEDGE_MCP_CONNECTION":');
const end = background.indexOf('case "T9_SAVE_SETTINGS":', start);
assert.ok(start >= 0 && end > start, "MCP request cases must remain in the background listener");
const cases = background.slice(start, end);
let clientClosed = false;
let lastToolCall = null;
const knowledgeAdapter = require("../src/engine/knowledge-mcp-adapter");
const run = new Function("message", "sender", "chrome", "getSettings",
  "getKnowledgeMcpClient", "isKnowledgeMcpSettingsSender", "pageKnowledgePacksReady",
  "globalThis", "sendResponse", "knowledgeMcpClient", `return (async () => { switch (message.type) {
    ${cases} } })();`);

async function invoke(message, { enabled = false, allowedSender = true, clientError = null } = {}) {
  let result;
  const schema = (required, properties) => ({ type: "object", additionalProperties: false,
    required, properties });
  const str = (maxLength, values) => ({ type: "string", maxLength, ...(values ? { enum: values } : {}) });
  const tools = [
    { name: "bc_process_resolve_object", inputSchema: schema(
      ["objectType", "objectId", "productFamily"], {
        objectType: str(32, ["page", "table", "report", "codeunit", "enum", "unknown"]),
        objectId: str(160), appId: str(160), appVersion: str(160),
        productFamily: str(160, ["business-central", "aptean-food-and-beverage", "unknown"]),
        locale: str(8) }) },
    { name: "bc_process_resolve_action", inputSchema: schema(
      ["objectRef", "controlRef", "context"], {
        objectRef: schema(["objectType", "objectId"], {
          objectType: str(32, ["page", "table", "report", "codeunit", "enum", "unknown"]),
          objectId: str(160), appId: str(160), appVersion: str(160) }),
        controlRef: schema([], { controlId: str(160), automationId: str(160) }),
        context: schema([], { pageCaption: str(160), actionCaption: str(160), fieldCaption: str(160) }),
        locale: str(8) }) }
  ];
  const client = { listTools: async () => {
    if (clientError) throw clientError;
    return tools;
  }, async callTool(options) {
    lastToolCall = options;
    if (clientError) throw clientError;
    const isAction = options.name === "bc_process_resolve_action";
    return { structuredContent: { status: "resolved", candidates: [{
      candidateId: isAction ? "bc.action.post" : "bc.page.22",
      ...(isAction ? { action: { taskType: "PostDocument",
        semanticAction: "PostDocument", entity: "invoice" } }
        : { objectRef: { objectType: "page", objectId: "22" } }),
      confidence: 0.99, provenance: { sourceId: "bc-core", sourceVersion: "1.0.0" }
    }] } };
  }, close() { clientClosed = true; } };
  const chrome = { runtime: { id: "extension", getURL: page => `chrome-extension://extension/${page}`,
    connectNative: () => { throw new Error("Unexpected connection"); } } };
  await run(message, allowedSender ? { id: "extension", url: chrome.runtime.getURL("dashboard.html") }
    : { id: "extension", url: "https://businesscentral.dynamics.com/" }, chrome,
  async () => ({ knowledgeMcpEnabled: enabled, uiLocale: "en-US" }), () => client,
  sender => sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL("dashboard.html"),
  Promise.resolve({ repository: {} }), { BCKnowledgeMcpAdapter: knowledgeAdapter }, value => { result = value; }, client);
  return result;
}

async function main() {
  assert.deepStrictEqual(await invoke({ type: "T9_TEST_KNOWLEDGE_MCP_CONNECTION" }),
    { ok: false, reason: "knowledge-mcp-consent-required" });
  assert.deepStrictEqual(await invoke({ type: "T9_LOOKUP_KNOWLEDGE_MCP", kind: "action",
    request: { context: { actionCaption: "sensitive text" } } }),
  { ok: false, reason: "knowledge-mcp-consent-required" });
  assert.deepStrictEqual(await invoke({ type: "T9_TEST_KNOWLEDGE_MCP_CONNECTION" },
    { enabled: true, allowedSender: false }), { ok: false, reason: "dashboard-only" });
  assert.deepStrictEqual(await invoke({ type: "T9_TEST_KNOWLEDGE_MCP_CONNECTION" },
    { enabled: true }), { ok: true, toolCount: 2 });
  assert.deepStrictEqual(await invoke({ type: "T9_TEST_KNOWLEDGE_MCP_SAMPLE_LOOKUP" }),
    { ok: false, reason: "knowledge-mcp-consent-required" });
  assert.deepStrictEqual(await invoke({ type: "T9_TEST_KNOWLEDGE_MCP_SAMPLE_LOOKUP" },
    { enabled: true, allowedSender: false }), { ok: false, reason: "dashboard-only" });
  const sample = await invoke({ type: "T9_TEST_KNOWLEDGE_MCP_SAMPLE_LOOKUP" }, { enabled: true });
  assert.strictEqual(sample.ok, true);
  assert.strictEqual(sample.result.status, "suggested");
  assert.strictEqual(sample.result.remoteStatus, "resolved");
  assert.strictEqual(sample.result.requiresReview, true);
  assert.strictEqual(sample.result.candidates[0].objectRef.objectId, "22");
  assert.strictEqual(sample.result.candidates[0].confidence, 0.69);
  assert.deepStrictEqual(lastToolCall.arguments, { objectType: "page", objectId: "22",
    productFamily: "business-central", locale: "en-US" });
  const batch = await invoke({ type: "T9_LOOKUP_KNOWLEDGE_MCP_BATCH", lookups: [
    { key: "k1", kind: "object", request: { objectRef: { objectType: "page", objectId: "9999" },
      productFamily: "business-central", locale: "en-US" } },
    { key: "k2", kind: "action", request: { objectRef: { objectType: "page", objectId: "21" },
      context: { actionCaption: "Post" }, locale: "en-US" } }
  ] }, { enabled: true });
  assert.strictEqual(batch.ok, true);
  assert.deepStrictEqual(batch.results.map(item => item.key), ["k1", "k2"]);
  assert.ok(batch.results.every(item => item.result.status === "suggested" &&
    item.result.source === "mcp-unverified" && item.result.requiresReview),
  JSON.stringify(batch.results));
  const blockedBatch = await invoke({ type: "T9_LOOKUP_KNOWLEDGE_MCP_BATCH", lookups: [] });
  assert.deepStrictEqual(blockedBatch, { ok: false, reason: "knowledge-mcp-consent-required" });
  assert.deepStrictEqual(await invoke({ type: "T9_TEST_KNOWLEDGE_MCP_CONNECTION" },
    { enabled: true, clientError: new Error("Specified native messaging host not found.") }),
  { ok: false, reason: "knowledge-mcp-unavailable",
    detail: "Specified native messaging host not found." });
  assert.strictEqual(clientClosed, true, "The connection check must stop its temporary MCP host");
  console.log("Knowledge MCP consent and sender guards passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
