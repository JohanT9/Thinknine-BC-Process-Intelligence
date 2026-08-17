const assert = require("assert");
const fs = require("fs");
const path = require("path");

const dashboard = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.js"),
  "utf8"
);
const dashboardHtml = fs.readFileSync(
  path.join(__dirname, "../src/ui/dashboard.html"),
  "utf8"
);
const background = fs.readFileSync(
  path.join(__dirname, "../src/recorder/background.js"),
  "utf8"
);

assert.ok(
  dashboardHtml.indexOf('src="review/review-annotations.js"') <
    dashboardHtml.indexOf('src="document/review-document-projector.js"'),
  "Review Annotations must load before the browser projector captures its dependency."
);
assert.ok(
  dashboardHtml.includes('.annotation-toolbar button[aria-pressed="true"]') &&
    dashboard.includes('$("rectangleAnnotationTool").setAttribute(') &&
    dashboard.includes('$("arrowAnnotationTool").setAttribute('),
  "The active annotation tool must expose synchronized visual and pressed states."
);

assert.ok(
  dashboard.includes("async function initializeDashboard()"),
  "Dashboard must use guarded initialization."
);
assert.ok(
  dashboard.includes("function publishWorkspaceContext(") &&
    dashboard.includes("function revealDocumentContext(") &&
    dashboard.includes("function revealReviewContext(") &&
    dashboard.includes("T9WorkspaceContext.bind(variant.model") &&
    !dashboard.includes("T9DocumentWorkspaceView.selectReview"),
  "Both workspaces must coordinate only through Workspace Context."
);
assert.ok(
  dashboard.includes("pipeline.qualityDiagnostics") &&
    dashboard.includes("T9DocumentationIntelligence") &&
    dashboard.includes("function renderDocumentationGuidance()") &&
    dashboard.includes("guidanceFingerprint") &&
    !dashboard.includes("qualityDiagnostics.findings.push"),
  "Guidance must reuse immutable pipeline diagnostics without editing them."
);
assert.ok(
  dashboard.includes("function buildDocumentProfileVariants(pipeline)") &&
    dashboard.includes("function applyDocumentProfileVariant(options = {})") &&
    dashboard.includes("documentProfileVariants.has(nextProfileId)") &&
    dashboard.includes("preservePosition: true") &&
    dashboard.includes("function exportActiveReviewToWord()"),
  "Profile switching must use cached presentation variants and preserve context."
);
assert.ok(
  dashboard.includes("function loadDocumentLibrary(sessions)") &&
    dashboard.includes("T9_GET_DOCUMENT_LIBRARY") &&
    dashboard.includes("DOCUMENT_LIBRARY_RENDER_LIMIT") &&
    background.includes("T9_SAVE_DOCUMENT_LIBRARY"),
  "Document Library must use lightweight metadata storage and bounded rendering."
);
assert.ok(
  dashboard.includes("T9DocumentBatchOperations") &&
    dashboard.includes("async function exportLibraryDocument") &&
    dashboard.includes("composeDocumentMedia(pipeline, review, screenshotSources)") &&
    !dashboard.includes("batchSemanticDocuments"),
  "Batch operations must remain metadata-only and reuse sequential Word export."
);
assert.ok(
  !background.includes("T9_GET_DOCUMENT_LIBRARY\", { includeReview") &&
    !dashboard.includes("loadDocumentLibrary(activeReview"),
  "Opening Document Library must not load Review state."
);

assert.ok(
  dashboard.includes("await loadSettings();"),
  "Dashboard must await settings loading."
);

assert.ok(
  dashboard.includes("await loadSessions();"),
  "Dashboard must await session loading."
);

assert.ok(
  dashboard.includes("...DEFAULTS"),
  "Dashboard must merge stored settings with defaults."
);

assert.ok(
  dashboard.includes("Inga sessioner har sparats ännu."),
  "Dashboard must render an explicit empty state."
);

assert.ok(
  background.includes("...DEFAULT_SETTINGS"),
  "Background must merge stored settings with defaults."
);

assert.ok(
  background.includes("Array.isArray(sessions) ? sessions : []"),
  "Background must always return an array of sessions."
);
assert.ok(
  background.includes("T9StorageKeys.sessionDataKeys(id)"),
  "Session deletion must remove all data through the shared key definition."
);
assert.ok(
  dashboard.includes("function createActiveDocumentPipeline()") &&
    dashboard.includes("function prepareDocumentMedia(pipeline)") &&
    dashboard.includes("const pipeline = createActiveDocumentPipeline();") &&
    dashboard.includes("const mediaAssets = await prepareDocumentMedia(pipeline);"),
  "Document Workspace and Word must share pipeline and prepared-media composition."
);
assert.ok(
  dashboard.includes("businessSteps,\n    sessionGraph, confidenceResult } = model;") &&
    dashboard.includes("JSON.stringify(sessionGraph, null, 2)") &&
    dashboard.includes("response.session,\n          finalBusinessTasks,\n          knowledgeQuality"),
  "ZIP export must consume graph and documentation tasks from its interpreted session model."
);
assert.ok(
  dashboard.includes("function applyDocumentView(options = {})") &&
    dashboard.includes("T9DocumentWorkspaceExperience.effectiveZoom") === false &&
    dashboard.includes("globalThis.T9DocumentWorkspaceExperience") &&
    !dashboard.includes("createActiveDocumentPipeline({ zoom"),
  "Document view changes must remain isolated from the document pipeline."
);

console.log("Dashboard regression tests passed.");
