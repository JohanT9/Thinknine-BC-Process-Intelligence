(() => {
  "use strict";
  const query = new URLSearchParams(location.search);
  const bugReportId = query.get("bugReportId");
  const container = document.getElementById("technicalReport");
  const message = document.getElementById("workspaceMessage");
  const send = payload => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, response => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else if (!response?.ok) reject(new Error(response?.error || "Request failed"));
      else resolve(response);
    });
  });
  function download(text, filename) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    return send({ type: "T9_DOWNLOAD_FILE", url, filename }).finally(() =>
      URL.revokeObjectURL(url));
  }
  async function start() {
    if (!bugReportId) throw new Error("Bug Report ID is missing.");
    const loaded = await send({ type: "T9_LOAD_BUG_REPORT", bugReportId });
    if (!loaded.report) throw new Error("Bug Report could not be found.");
    const session = await send({ type: "T9_GET_SESSION_DATA",
      sessionId: loaded.report.recordingId, includeScreenshots: true });
    const store = { save: report => send({ type: "T9_SAVE_BUG_REPORT", report })
      .then(response => response.report) };
    const workspace = globalThis.T9TechnicalReportWorkspace.create({
      report: loaded.report, errorEvidence: session.bcErrorEvidence, store
    });
    const mediaAssets = {};
    (loaded.report.evidence?.screenshots || []).forEach(item => {
      const event = session.recording?.events?.find(value =>
        value.screenshotAssetId === item.assetId);
      if (event && session.screenshots?.[event.raw?.eventNo]) mediaAssets[item.assetId] = {
        source: session.screenshots[event.raw.eventNo]
      };
    });
    const render = state => globalThis.T9TechnicalReportWorkspaceView.render(
      container, state, { mediaAssets,
        onCopy: value => navigator.clipboard.writeText(value),
        onEdit(name, value) {
          if (["title", "summary", "severity", "category"].includes(name)) {
            workspace.edit({ summary: { [name]: value } });
          } else if (name === "notes") workspace.edit({ notes: value ? [{
            noteId: "workspace-note", text: value
          }] : [] });
          else workspace.edit({ [name]: value });
        },
        onSelectPrimaryError: id => workspace.selectPrimaryError(id)
      });
    workspace.subscribe(render); render(workspace.state());
    document.getElementById("saveReport").addEventListener("click", () =>
      workspace.save().catch(error => { message.textContent = error.message; }));
    document.getElementById("undoReport").addEventListener("click", workspace.undo);
    document.getElementById("redoReport").addEventListener("click", workspace.redo);
    document.getElementById("copyMarkdown").addEventListener("click", async () => {
      await navigator.clipboard.writeText(await workspace.exportMarkdown());
      message.textContent = "Report copied.";
    });
    document.getElementById("downloadMarkdown").addEventListener("click", async () => {
      await download(await workspace.exportMarkdown(), `${bugReportId}.md`);
      message.textContent = "Markdown exported.";
    });
  }
  start().catch(error => { message.textContent = error.message; });
})();
