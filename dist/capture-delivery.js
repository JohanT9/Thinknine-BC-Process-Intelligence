(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9CaptureDelivery = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // The browser may stop the extension's background worker at any time. A captured event stays
  // in the page until the worker confirms it was stored, and is sent again if it was not. The
  // worker ignores an event it already stored, so a repeat is safe. After a failure, later
  // events wait so that they still arrive in order. An event that cannot be delivered after the
  // last attempt is reported as lost, never dropped silently.
  const RETRY_DELAYS_MS = Object.freeze([250, 1000, 3000, 8000, 15000]);

  function create({ transport, schedule = setTimeout, onLost = () => {},
    delays = RETRY_DELAYS_MS } = {}) {
    const queue = [];
    let blocked = false;
    let timer = null;

    function settle(entry, delivered) {
      if (delivered) {
        queue.splice(queue.indexOf(entry), 1);
      } else {
        entry.state = "waiting";
        entry.attempts += 1;
        blocked = true;
        if (entry.attempts > delays.length) {
          queue.splice(queue.indexOf(entry), 1);
          onLost(entry.message, entry.attempts);
        }
      }
      if (!blocked) return;
      if (!queue.some(item => item.state === "waiting")) {
        if (!queue.some(item => item.state === "sending")) blocked = false;
        return;
      }
      if (queue.some(item => item.state === "sending") || timer) return;
      const next = queue.find(item => item.state === "waiting");
      const delay = next.attempts ? delays[Math.min(next.attempts, delays.length) - 1] : 0;
      timer = schedule(() => { timer = null; send(next); }, delay);
    }

    function send(entry) {
      entry.state = "sending";
      let answered = false;
      const answer = delivered => {
        if (answered) return;
        answered = true;
        settle(entry, delivered);
      };
      try {
        transport(entry.message, response => answer(response?.ok === true));
      } catch {
        answer(false);
      }
    }

    function deliver(message) {
      const entry = { message, attempts: 0, state: "waiting" };
      queue.push(entry);
      if (!blocked) send(entry);
    }

    function pending() { return queue.length; }

    return Object.freeze({ deliver, pending });
  }

  return Object.freeze({ RETRY_DELAYS_MS, create });
});
