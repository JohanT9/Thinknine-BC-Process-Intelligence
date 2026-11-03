(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeMcpClientManager = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function create(createClient, { setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    if (typeof createClient !== "function") throw new TypeError(
      "A knowledge MCP client factory is required.");
    let client = null;
    let activeLeases = 0;
    let idleTimer = null;
    function closeIdle(acquired) {
      idleTimer = null;
      if (activeLeases === 0 && client === acquired) {
        client = null;
        acquired.close();
      }
    }
    function acquire() {
      if (idleTimer) {
        clearTimer(idleTimer);
        idleTimer = null;
      }
      if (!client) client = createClient();
      const acquired = client;
      activeLeases += 1;
      let released = false;
      // keepAliveMs lets documents opened shortly after one another reuse the started host
      // instead of starting it again; without it the host stops with the last lease.
      return Object.freeze({ client: acquired, release({ keepAliveMs = 0 } = {}) {
        if (released) return;
        released = true;
        activeLeases = Math.max(0, activeLeases - 1);
        if (activeLeases !== 0 || client !== acquired) return;
        if (keepAliveMs > 0) idleTimer = setTimer(() => closeIdle(acquired), keepAliveMs);
        else closeIdle(acquired);
      } });
    }
    return Object.freeze({ acquire });
  }
  return Object.freeze({ create });
});
