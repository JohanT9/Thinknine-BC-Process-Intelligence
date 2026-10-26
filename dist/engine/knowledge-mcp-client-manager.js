(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeMcpClientManager = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function create(createClient) {
    if (typeof createClient !== "function") throw new TypeError(
      "A knowledge MCP client factory is required.");
    let client = null;
    let activeLeases = 0;
    function acquire() {
      if (!client) client = createClient();
      const acquired = client;
      activeLeases += 1;
      let released = false;
      return Object.freeze({ client: acquired, release() {
        if (released) return;
        released = true;
        activeLeases = Math.max(0, activeLeases - 1);
        if (activeLeases === 0 && client === acquired) {
          client = null;
          acquired.close();
        }
      } });
    }
    return Object.freeze({ acquire });
  }
  return Object.freeze({ create });
});
