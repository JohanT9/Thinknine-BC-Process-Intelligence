(function (root, factory) {
  const capturePolicy = typeof module === "object" && module.exports
    ? require("./screenshot-capture-policy") : root.T9ScreenshotCapturePolicy;
  const api = factory(capturePolicy);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotQueuePolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (capturePolicy) {
  "use strict";
  function priority(category) {
    if (category === "result") return 4;
    if (category === "dialog") return 3;
    if (category === "field-input" || category === "action") return 2;
    if (category === "navigation") return 1;
    return 0;
  }

  function enqueue(queue, item, maxItems = 40) {
    if (!Array.isArray(queue) || !item || !Number.isInteger(item.eventNo)) {
      throw new TypeError("A screenshot queue and numbered event are required.");
    }
    const existing = queue.find(value => value.sessionId === item.sessionId &&
      Math.abs(value.eventNo - item.eventNo) <= 2 &&
      capturePolicy.canReuse(value, item));
    if (existing) {
      existing.targets ||= [{ eventNo: existing.eventNo, eventId: existing.eventId }];
      if (!existing.targets.some(target => target.eventNo === item.eventNo)) {
        existing.targets.push({ eventNo: item.eventNo, eventId: item.eventId });
      }
      if (priority(item.category) > priority(existing.category)) {
        existing.category = item.category;
        existing.eventNo = item.eventNo;
        existing.eventId = item.eventId;
        existing.tabId = item.tabId;
      }
      return { reused: true, dropped: null, queued: existing };
    }

    item.targets ||= [{ eventNo: item.eventNo, eventId: item.eventId }];
    queue.push(item);
    queue.sort((a, b) => priority(b.category) - priority(a.category) ||
      a.queuedAt - b.queuedAt);
    const cap = Math.max(1, Math.floor(Number(maxItems) || 40));
    const dropped = queue.length > cap ? queue.pop() : null;
    return { reused: false, dropped, queued: queue.includes(item) ? item : null };
  }

  return { enqueue, priority };
});
