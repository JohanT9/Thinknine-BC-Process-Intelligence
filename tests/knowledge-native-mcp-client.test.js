const assert = require("assert");
const adapter = require("../src/engine/knowledge-mcp-adapter");
const bridge = require("../src/engine/knowledge-native-mcp-client");

const schemas = Object.fromEntries(Object.entries(adapter.TOOL_INPUT_SCHEMAS).map(([name, spec]) => {
  function toSchema(input) {
    const properties = Object.fromEntries(Object.entries(input.properties).map(([key, value]) =>
      [key, value.type === "object" ? toSchema(value) : { type: value.type,
        ...(value.maxLength ? { maxLength: value.maxLength } : {}),
        ...(value.enum ? { enum: value.enum } : {}) }]));
    return { type: "object", additionalProperties: false,
      ...(input.required.length ? { required: input.required } : {}), properties };
  }
  return [name, toSchema(spec)];
}));

function makePort() {
  const messages = [];
  const messageListeners = [];
  const disconnectListeners = [];
  const port = {
    messages,
    onMessage: { addListener: listener => messageListeners.push(listener) },
    onDisconnect: { addListener: listener => disconnectListeners.push(listener) },
    postMessage(message) {
      messages.push(message);
      if (message.id == null) return;
      let result;
      if (message.method === "initialize") result = { serverInfo: {
        name: "bc-process-studio-knowledge", version: "1.0.0" }, capabilities: { tools: {} } };
      if (message.method === "tools/list") result = { tools: Object.entries(schemas).map(([name, inputSchema]) => ({
        name, inputSchema, annotations: { readOnlyHint: true, destructiveHint: false }
      })) };
      if (message.method === "tools/call") result = { structuredContent: {
        status: "resolved", candidates: []
      } };
      queueMicrotask(() => messageListeners.forEach(listener => listener({
        jsonrpc: "2.0", id: message.id, result
      })));
    },
    disconnect() { disconnectListeners.forEach(listener => listener()); }
  };
  return port;
}

async function main() {
  let connectCount = 0;
  const port = makePort();
  const client = bridge.create({ connectNative: host => {
    assert.strictEqual(host, bridge.HOST);
    connectCount += 1;
    return port;
  } });
  assert.strictEqual(connectCount, 0, "The bridge must remain dormant until an explicit request");
  const listed = await client.listTools();
  assert.strictEqual(connectCount, 1);
  assert.deepStrictEqual(listed.map(tool => tool.name).sort(),
    [adapter.TOOL_ACTION, adapter.TOOL_OBJECT].sort());
  assert.ok(port.messages.some(message => message.method === "notifications/initialized"));
  const result = await client.callTool({ name: adapter.TOOL_OBJECT, arguments: {
    objectType: "page", objectId: "21", productFamily: "business-central"
  } });
  assert.strictEqual(result.structuredContent.status, "resolved");
  const callsBeforeInvalid = port.messages.filter(message => message.method === "tools/call").length;
  await assert.rejects(client.callTool({ name: "delete_everything", arguments: {} }),
    /not allowlisted/);
  assert.strictEqual(port.messages.filter(message => message.method === "tools/call").length,
    callsBeforeInvalid, "Unlisted tool calls must not reach the native host");
  client.close();

  let sent;
  const localRepository = {
    lookupObject: () => ({ status: "unresolved", candidates: [] }),
    resolveAction: () => ({ status: "unresolved", candidates: [] })
  };
  const remote = {
    listTools: async () => Object.entries(schemas).map(([name, inputSchema]) => ({ name, inputSchema })),
    callTool: async request => {
      sent = request;
      return { structuredContent: { status: "resolved", candidates: [{
        candidateId: "Sales.Release",
        action: { taskType: "ReleaseDocument", semanticAction: "ReleaseDocument", entity: "SalesOrder" },
        confidence: 0.99, provenance: { sourceId: "bc-sales", sourceVersion: "2.0.0" }
      }] } };
    }
  };
  const lookup = adapter.createMcpKnowledgeAdapter({
    client: remote, repository: localRepository, consent: true
  });
  const suggestion = await lookup.resolveAction({
    objectRef: { objectType: "page", objectId: "sales-order-page" },
    controlRef: { controlId: "release-action" },
    context: { pageCaption: "Sales Order https://tenant.example/path",
      actionCaption: "Release user@example.com 123456",
      fieldCaption: "Lot 7654321" },
    locale: "en-US"
  });
  assert.ok(sent, "An unresolved action with consent should call the read-only tool");
  assert.deepStrictEqual(Object.keys(sent.arguments).sort(),
    ["context", "controlRef", "locale", "objectRef"].sort());
  const transmitted = JSON.stringify(sent.arguments);
  for (const secret of ["tenant.example", "user@example.com", "123456", "7654321"])
    assert.ok(!transmitted.includes(secret), `Sensitive caption content was sent: ${secret}`);
  assert.strictEqual(suggestion.status, "suggested");
  assert.strictEqual(suggestion.candidates[0].confidence, 0.69);
  assert.strictEqual(suggestion.selectedCandidateId, null);
  assert.strictEqual(suggestion.requiresReview, true);
}

main().then(() => console.log("Knowledge MCP native client tests passed."))
  .catch(error => { console.error(error); process.exitCode = 1; });
