import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(here, "../src/server.js");
const repoRoot = path.resolve(here, "../../..");
const require = createRequire(import.meta.url);
const adapter = require(path.join(repoRoot, "src/engine/knowledge-mcp-adapter.js"));
const repositoryModule = require(path.join(repoRoot, "src/engine/knowledge-repository.js"));
const localManifest = require(path.join(repoRoot, "src/knowledge-packs/index.json"));
const localPacks = localManifest.packs.filter(item => item.enabled).map(item => ({
  packId: item.packId, pack: require(path.join(repoRoot, "src", item.file))
}));
const localImport = repositoryModule.importRelease(localManifest, localPacks);
assert.equal(localImport.ok, true, "The extension's bundled local catalog must validate");
const localRepository = repositoryModule.createRepository(localImport.snapshot);
const localPage22 = localRepository.lookupObject({ objectType: "page", objectId: "22" });
assert.equal(localPage22.status, "resolved",
  "Page 22 should be included in the extension's bundled standard-page catalog");
assert.equal(localPage22.candidates[0].displayName, "Customers");
const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "pipe"] });
let output = "";
let errors = "";
const pending = new Map();
let nextId = 0;

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", chunk => {
  output += chunk;
  const lines = output.split("\n");
  output = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    const message = JSON.parse(line);
    if (message.id != null && pending.has(message.id)) {
      const settle = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) settle.reject(new Error(message.error.message || "MCP request failed"));
      else settle.resolve(message.result);
    }
  }
});
child.stderr.on("data", chunk => { errors += chunk; });

function request(method, params) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

try {
  const initialized = await request("initialize", {
    protocolVersion: "2026-07-28", capabilities: {},
    clientInfo: { name: "knowledge-mcp-smoke-check", version: "1.0.0" }
  });
  assert.equal(initialized.serverInfo.name, "bc-process-studio-knowledge");
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const listed = await request("tools/list", {});
  assert.deepEqual(listed.tools.map(tool => tool.name).sort(),
    [adapter.TOOL_ACTION, adapter.TOOL_OBJECT].sort());
  for (const tool of listed.tools) {
    const contract = adapter.TOOL_INPUT_SCHEMAS[tool.name];
    assert.ok(adapter.validInputSchema(tool.inputSchema, contract.required, contract.properties),
      `Tool schema does not match extension contract: ${tool.name}`);
    assert.equal(tool.annotations?.readOnlyHint, true);
    assert.equal(tool.annotations?.destructiveHint, false);
  }

  const objectResult = await request("tools/call", {
    name: adapter.TOOL_OBJECT,
    arguments: { objectType: "page", objectId: "21", productFamily: "business-central" }
  });
  assert.equal(objectResult.structuredContent.status, "resolved");
  assert.equal(objectResult.structuredContent.candidates[0].objectRef.objectId, "21");

  const externalObjectResult = await request("tools/call", {
    name: adapter.TOOL_OBJECT,
    arguments: { objectType: "page", objectId: "22", productFamily: "business-central",
      appVersion: "28.5.0", locale: "en-US" }
  });
  assert.equal(externalObjectResult.structuredContent.status, "resolved",
    "The MCP catalog should expose the same standard-page identity without duplicating it");
  assert.equal(externalObjectResult.structuredContent.candidates[0].objectRef.objectId, "22");
  const externalObjectSuggestion = adapter.parseToolResult("object", externalObjectResult);
  assert.equal(externalObjectSuggestion.status, "suggested");
  assert.equal(externalObjectSuggestion.requiresReview, true);
  assert.equal(externalObjectSuggestion.candidates[0].confidence, 0.69);
  assert.equal(externalObjectSuggestion.candidates[0].provenance.sourceUri,
    "https://learn.microsoft.com/en-us/dynamics365/business-central/application/base-application/page/microsoft.sales.customer.customer-list");
  assert.equal(externalObjectSuggestion.candidates[0].provenance.sourceId, "microsoft-learn-bc28-22");

  const actionResult = await request("tools/call", {
    name: adapter.TOOL_ACTION,
    arguments: { objectRef: { objectType: "page", objectId: "42" }, controlRef: {},
      context: { pageCaption: "Sales Order", actionCaption: "Post" }, locale: "en-US" }
  });
  assert.equal(actionResult.structuredContent.status, "resolved");
  assert.equal(actionResult.structuredContent.candidates[0].action.semanticAction, "PostDocument");

  const externalActionResult = await request("tools/call", {
    name: adapter.TOOL_ACTION,
    arguments: { objectRef: { objectType: "page", objectId: "22" }, controlRef: {},
      context: { pageCaption: "Customers", actionCaption: "New" }, locale: "en-US" }
  });
  assert.equal(externalActionResult.structuredContent.status, "resolved",
    "MCP should use its supplemental page with shared generic action knowledge");
  assert.equal(externalActionResult.structuredContent.candidates[0].action.semanticAction,
    "CreateNew");

  let rejectedExtraInput = false;
  try {
    const invalidResult = await request("tools/call", { name: adapter.TOOL_OBJECT,
      arguments: { objectType: "page", objectId: "21", productFamily: "business-central", tenantId: "forbidden" } });
    rejectedExtraInput = invalidResult.isError === true;
  } catch { rejectedExtraInput = true; }
  assert.equal(rejectedExtraInput, true, "Unknown tenant input must be rejected");
  console.log("Knowledge MCP server smoke check passed.");
} catch (error) {
  console.error(error);
  if (errors.trim()) console.error(errors.trim());
  process.exitCode = 1;
} finally {
  child.kill();
}
