(function (root, factory) {
  const capturePolicy = typeof module === "object" && module.exports
    ? require("./screenshot-capture-policy") : root.T9ScreenshotCapturePolicy;
  const api = factory(capturePolicy);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotQueuePolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (capturePolicy) {
  "use strict";
  // A screenshot taken later than this after its event shows a different moment, for example
  // the next field being typed, so no screenshot is better than that one.
  const MAX_DELAY_MS = 3000;
  // Business Central announces several status messages for one change; one capture shows them.
  const RESULT_BURST_MS = 1500;

  function priority(category) {
    if (category === "result") return 4;
    if (category === "dialog") return 3;
    if (category === "field-input" || category === "action") return 2;
    if (category === "navigation") return 1;
    return 0;
  }

  function sameResultBurst(existing, item) {
    return existing.category === "result" && item.category === "result" &&
      Math.abs(Number(item.queuedAt) - Number(existing.queuedAt)) <= RESULT_BURST_MS;
  }

  function enqueue(queue, item, maxItems = 40) {
    if (!Array.isArray(queue) || !item || !Number.isInteger(item.eventNo)) {
      throw new TypeError("A screenshot queue and numbered event are required.");
    }
    const existing = queue.find(value => value.sessionId === item.sessionId &&
      ((Math.abs(value.eventNo - item.eventNo) <= 2 && capturePolicy.canReuse(value, item)) ||
        sameResultBurst(value, item)));
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

    // Captures run in event order so each image stays as close as possible to its event.
    // A full queue gives up its least important, oldest request.
    item.targets ||= [{ eventNo: item.eventNo, eventId: item.eventId }];
    queue.push(item);
    const cap = Math.max(1, Math.floor(Number(maxItems) || 40));
    let dropped = null;
    if (queue.length > cap) {
      const index = queue.reduce((lowest, value, position) =>
        priority(value.category) < priority(queue[lowest].category) ? position : lowest, 0);
      dropped = queue.splice(index, 1)[0];
    }
    return { reused: false, dropped, queued: queue.includes(item) ? item : null };
  }

  // Takes the next request that is still recent enough to capture; older ones are returned as
  // stale so the caller can count them instead of attaching an image of a later moment.
  function next(queue, now, maxDelayMs = MAX_DELAY_MS) {
    const stale = [];
    while (queue.length) {
      const item = queue.shift();
      if (Number(now) - Number(item.queuedAt) > maxDelayMs) stale.push(item);
      else return { item, stale };
    }
    return { item: null, stale };
  }

  return { MAX_DELAY_MS, RESULT_BURST_MS, enqueue, next, priority };
});
