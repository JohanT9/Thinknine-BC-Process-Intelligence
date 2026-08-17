(function (root, factory) {
  const pageIdentification = typeof module === "object" && module.exports
    ? require("./page-identification-engine") : root.T9PageIdentificationEngine;
  const api = factory(pageIdentification);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.entityMemory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (pageIdentification) {

  function detectEntity(text) {
    return pageIdentification.resolvePageIdentity({ pageCaption: String(text || "") })
      .entity || "";
  }

  function recordValue(event) {
    const caption = String(event?.label || event?.selectedCaption || "");
    const quoted = caption.match(/["“](.+?)["”]/);
    if (quoted) return quoted[1];
    const trailing = caption.match(/(?:open record|öppna post(?:en)?)\s+([A-Z0-9._/-]+)$/i);
    return trailing ? trailing[1] : "";
  }

  function build(events) {
    const entities = [];
    let active = null;

    for (const event of events || []) {
      const page = event.context?.currentPageCaption ||
        event.pageIdentification?.pageCaption ||
        event.pageIdentification?.caption || event.pageCaption || "";
      const resolvedEntity = event.identification?.pageIdentity?.entity ||
        event.normalizedInteraction?.pageIdentification?.entity ||
        event.pageIdentification?.entity || "";
      const entity = resolvedEntity || event.context?.currentEntity || detectEntity(page);
      const value = recordValue(event);

      if (entity && (!active || active.entity !== entity || (value && active.recordValue !== value))) {
        const eventNo = event.eventNo ?? event.sequence;
        active = {
          nodeId: `${entity}-${entities.length + 1}`,
          entity,
          recordValue: value,
          firstEventNo: eventNo,
          lastEventNo: eventNo,
          pageCaptions: page ? [page] : [],
          operations: []
        };
        entities.push(active);
      }

      if (active) {
        active.lastEventNo = event.eventNo ?? event.sequence;
        if (page && !active.pageCaptions.includes(page)) active.pageCaptions.push(page);
      }
    }

    return entities;
  }

  return { build, detectEntity, recordValue };
});
