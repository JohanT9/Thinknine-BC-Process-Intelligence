// Stands in for the extension APIs so the real guide panel can be walked through in a page.
(() => {
  const ui = new URLSearchParams(location.search).get("ui") || "sv-SE";
  const guide = { schemaVersion: 1, projectId: "p1", sessionId: "s1", title: "Skapa och släppa en inköpsorder",
    documentLanguage: "sv-SE", steps: [
      { stepId: "s", number: 1, heading: "", instruction: "Sök efter ink ord och öppna listan Inköpsorder.", target: { kind: "search", page: "", pageCaption: "", result: "Inköpsorder", caption: "Sök" } },
      { stepId: "a", number: 1, heading: "Skapa ordern", instruction: "Välj Leverantörsnamn 10000.",
        target: { kind: "field", page: "Purchase Order", pageCaption: "Inköpsorder", field: "Buy-from Vendor Name", caption: "Leverantörsnamn" } },
      { stepId: "b", number: 2, heading: "Lägg till rader", instruction: "Ange 1896-S i Nr på raden.",
        target: { kind: "field", page: "Purchase Order", pageCaption: "Inköpsorder", field: "No.", caption: "Nr" } },
      { stepId: "c", number: 3, heading: "Lägg till rader", instruction: "Ange 5 i Antal.",
        target: { kind: "field", page: "", pageCaption: "Inköpsorder", field: "", caption: "Kvantitet", captions: ["Kvantitet", "Antal"] } },
      { stepId: "d", number: 4, heading: "Släpp ordern", instruction: "Välj Släpp.", screenshot: "shot.png",
        target: { kind: "action", page: "Purchase Order", pageCaption: "Inköpsorder", action: "Release", caption: "Släpp" } },
      { stepId: "e", number: 5, heading: "Bokför", instruction: "Välj Bokför.",
        target: { kind: "action", page: "Purchase Order", pageCaption: "Inköpsorder", action: "Post", caption: "Bokför" } },
      { stepId: "f", number: 6, heading: "Bokför", instruction: "Kontrollera att ordern är bokförd.", target: { kind: "none", page: "", pageCaption: "" } }
    ] };
  const listen = () => ({ addListener() {} });
  window.chrome = {
    runtime: {
      lastError: undefined,
      sendMessage(payload, callback) {
        setTimeout(() => callback(payload.type === "T9_GET_SETTINGS" ? { ok: true, settings: { uiLocale: ui } }
          : { ok: true, screenshots: {} }), 10);
      }
    },
    windows: { getCurrent: async () => ({ id: 1 }) },
    tabs: { query: async () => [{ id: 7, url: "https://businesscentral.dynamics.com/tenant/" }],
      onActivated: listen(), onUpdated: listen(),
      connect() {
        const own = { listeners: [], gone: [], onMessage: { addListener(fn) { own.listeners.push(fn); } },
          onDisconnect: { addListener(fn) { own.gone.push(fn); } },
          deliver: message => own.listeners.forEach(fn => fn(message)),
          postMessage(message) { setTimeout(() => other.deliver(JSON.parse(JSON.stringify(message))), 0); },
          disconnect() { other.close(); } };
        const other = window.parent.frames.bc.bcConnect(own);
        return own;
      } },
    scripting: { executeScript: async () => [] },
    sidePanel: { setOptions: async () => {} }
  };
  // The library page's hidden frame answers with the guide.
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.tagName !== "IFRAME") continue;
      const jobId = new URL(node.src, location.href).searchParams.get("jobId");
      node.src = "about:blank";
      setTimeout(() => window.postMessage({ type: "T9_PANEL_JOB", jobId, ok: true, guide }, location.origin), 300);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
