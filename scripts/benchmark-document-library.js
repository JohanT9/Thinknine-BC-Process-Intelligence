"use strict";
const { performance } = require("perf_hooks");
const library = require("../src/document/document-library");
const view = require("../src/ui/document-library-view");

const recordingCount = Math.max(1, Number(process.argv[2]) || 80);
const screenshotsPerRecording = Math.max(0, Number(process.argv[3]) || 10);
const screenshotKilobytes = Math.max(1, Number(process.argv[4]) || 250);
const payload = {};
const records = [];

for (let index = 0; index < recordingCount; index += 1) {
  const id = `recording-${index}`;
  const bugReport = index % 4 === 0;
  payload[`t9_session_${id}`] = { id,
    name: bugReport ? "Business Central-fel" : `Process ${index}`,
    startedAt: new Date(2026, 0, 1, index).toISOString(),
    updatedAt: new Date(2026, 0, 2, index).toISOString(),
    recordingPurpose: bugReport ? "bug-report" : "documentation",
    settings: { documentLanguage: "sv-SE", companyName: "Salico UAT" } };
  if (bugReport) payload[`t9_bug_report_bug-report:${id}`] = {
    bugReportId: `bug-report:${id}`, recordingId: id,
    summary: { title: "Fel vid Registrera vikt" },
    updatedAt: new Date(2026, 0, 2, index).toISOString()
  };
  for (let screenshot = 0; screenshot < screenshotsPerRecording; screenshot += 1) {
    payload[`t9_screenshot_${id}:${screenshot}`] = { sessionId: id,
      dataUrl: `data:image/jpeg;base64,${"A".repeat(screenshotKilobytes * 1024)}` };
  }
  records.push(library.normalize({ projectId: id, title: `Process ${index}`,
    metadata: { company: "Salico UAT" } }));
}

const payloadMegabytes = Buffer.byteLength(JSON.stringify(payload)) / 1048576;
let started = performance.now();
const storageSnapshot = JSON.parse(JSON.stringify(payload));
const storageCloneMilliseconds = performance.now() - started;
started = performance.now();
const sessions = Object.entries(storageSnapshot)
  .filter(([key]) => key.startsWith("t9_session_"))
  .map(([, value]) => value);
const reports = Object.entries(storageSnapshot)
  .filter(([key]) => key.startsWith("t9_bug_report_"))
  .map(([, value]) => value);
const extractionMilliseconds = performance.now() - started;
started = performance.now();
const matches = library.query(library.create(records), {
  sort: "modified", filters: {}
});
const queryMilliseconds = performance.now() - started;
const container = { innerHTML: "" };
started = performance.now();
view.renderList(container, matches, {});
const renderMilliseconds = performance.now() - started;

console.log(JSON.stringify({ recordingCount,
  screenshotCount: recordingCount * screenshotsPerRecording,
  screenshotKilobytes, payloadMegabytes: Number(payloadMegabytes.toFixed(1)),
  storageCloneMilliseconds: Number(storageCloneMilliseconds.toFixed(1)),
  extractionMilliseconds: Number(extractionMilliseconds.toFixed(1)),
  queryMilliseconds: Number(queryMilliseconds.toFixed(1)),
  renderMilliseconds: Number(renderMilliseconds.toFixed(1)),
  renderedHtmlKilobytes: Number((Buffer.byteLength(container.innerHTML) /
    1024).toFixed(1)), sessionCount: sessions.length,
  reportCount: reports.length }, null, 2));
