(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BCKnowledgeNativeMcpClient = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const HOST = "com.thinknine.bcprocessstudio.knowledge";
  const PROTOCOL_VERSION = "2026-07-28";

  function create({ connectNative, timeoutMs = 12000 } = {}) {
    let port = null;
    let nextId = 0;
    let pending = new Map();
    let readyPromise = null;
    let toolCache = null;

    function failAll(message) {
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error(message));
      }
      pending.clear();
    }

    function close(message = "MCP native host disconnected") {
      const current = port;
      port = null;
      readyPromise = null;
      toolCache = null;
      failAll(message);
      try { current?.disconnect(); } catch { /* Port may already be closed. */ }
    }

    function receive(message) {
      if (!message || message.id == null || !pending.has(message.id)) return;
      const entry = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message || "MCP request failed"));
      else entry.resolve(message.result);
    }

    function request(method, params = {}) {
      if (!port) return Promise.reject(new Error("MCP native host is unavailable"));
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error("MCP native host request timed out"));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        try { port.postMessage({ jsonrpc: "2.0", id, method, params }); }
        catch (error) {
          clearTimeout(timer);
          pending.delete(id);
          reject(error);
        }
      });
    }

    async function initialize() {
      if (!connectNative) throw new Error("Native messaging is unavailable");
      if (!port) {
        port = connectNative(HOST);
        port.onMessage.addListener(receive);
        port.onDisconnect.addListener(() => {
          const reason = globalThis.chrome?.runtime?.lastError?.message || "MCP native host disconnected";
          port = null;
          readyPromise = null;
          toolCache = null;
          failAll(reason);
        });
      }
      const hello = await request("initialize", {
        protocolVersion: PROTOCOL_VERSION, capabilities: {},
        clientInfo: { name: "bc-process-studio", version: "1.0.0" }
      });
      if (!hello?.serverInfo?.name || !hello?.capabilities?.tools) {
        throw new Error("Connected native host is not the expected MCP knowledge server");
      }
      port.postMessage({ jsonrpc: "2.0", method: "notifications/initialized" });
      const result = await request("tools/list", {});
      const expected = new Set(["bc_process_resolve_object", "bc_process_resolve_action"]);
      const tools = Array.isArray(result?.tools) ? result.tools : [];
      if (tools.length !== expected.size || tools.some(tool => !expected.has(tool.name))) {
        throw new Error("MCP knowledge server advertises an unexpected tool set");
      }
      const contract = globalThis.BCKnowledgeMcpAdapter;
      if (!contract || tools.some(tool => {
        const spec = contract.TOOL_INPUT_SCHEMAS[tool.name];
        return !spec || !contract.validInputSchema(tool.inputSchema,
          spec.required, spec.properties);
      })) throw new Error("MCP knowledge server input schemas do not match the app contract");
      toolCache = tools;
      return tools;
    }

    async function ready() {
      if (toolCache) return toolCache;
      if (!readyPromise) {
        readyPromise = initialize().catch(error => {
          close();
          throw error;
        });
      }
      return readyPromise;
    }

    return Object.freeze({
      async listTools() { return ready(); },
      async callTool({ name, arguments: args }) {
        const tools = await ready();
        if (!tools.some(tool => tool.name === name)) throw new Error("MCP tool is not allowlisted");
        return request("tools/call", { name, arguments: args });
      },
      close
    });
  }

  return { HOST, PROTOCOL_VERSION, create };
});
