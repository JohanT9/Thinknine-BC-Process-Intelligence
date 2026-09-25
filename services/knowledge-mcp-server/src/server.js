import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const require = createRequire(import.meta.url);
const knowledgeDomain = require(path.join(repoRoot, "src/engine/knowledge-domain.js"));
const knowledgeRepository = require(path.join(repoRoot, "src/engine/knowledge-repository.js"));
const manifest = JSON.parse(JSON.stringify(require(path.join(repoRoot,
  "src/knowledge-packs/index.json"))));
const supplementalPackId = "bc-mcp-official-pages";
const supplementalPackFile = "knowledge-packs/official-pages.json";
manifest.packs.push({ packId: supplementalPackId,
  file: supplementalPackFile, enabled: true });
const packs = manifest.packs.filter(item => item.enabled).map(descriptor => ({
  packId: descriptor.packId,
  pack: descriptor.packId === supplementalPackId
    ? require(path.join(here, "..", supplementalPackFile))
    : require(path.join(repoRoot, "src", descriptor.file))
}));
const bundledPageIds = new Set(packs.filter(item => item.packId !== supplementalPackId)
  .flatMap(item => (item.pack.pageDefinitions || []).map(page => String(page.pageObjectId || ""))));
for (const item of packs) if (item.packId === supplementalPackId) {
  item.pack.pageDefinitions = (item.pack.pageDefinitions || []).filter(page =>
    !bundledPageIds.has(String(page.pageObjectId || "")));
}
const imported = knowledgeRepository.importRelease(manifest, packs);
if (!imported.ok) {
  throw new Error(`Knowledge catalog failed validation: ${imported.diagnostics.map(item => item.code).join(", ")}`);
}

const snapshot = imported.snapshot;
const localRepository = knowledgeRepository.createRepository(snapshot);
const availableRules = knowledgeDomain.rules(snapshot.packs);
const provenance = (packId, version) => {
  const pack = snapshot.packs.find(item => item.packId === packId);
  const source = pack?.sources?.[0];
  return { sourceId: packId, sourceVersion: version,
    ...(source?.sourceUri ? { sourceUri: source.sourceUri } : {}),
    ...(source?.title ? { sourceTitle: source.title } : {}) };
};
const idSchema = z.string().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const objectTypeSchema = z.enum(["page", "table", "report", "codeunit", "enum", "unknown"]);
const localeSchema = z.string().max(8).regex(/^[a-z]{2,3}-[A-Z]{2}$/).optional();

const resolveObjectInput = z.object({
  objectType: objectTypeSchema,
  objectId: idSchema,
  appId: idSchema.optional(),
  appVersion: z.string().max(160).optional(),
  productFamily: z.enum(["business-central", "aptean-food-and-beverage", "unknown"]),
  locale: localeSchema
}).strict();

const resolveActionInput = z.object({
  objectRef: z.object({
    objectType: objectTypeSchema,
    objectId: idSchema,
    appId: idSchema.optional(),
    appVersion: z.string().max(160).optional()
  }).strict(),
  controlRef: z.object({
    controlId: idSchema.optional(),
    automationId: z.string().max(160).optional()
  }).strict(),
  context: z.object({
    pageCaption: z.string().max(160).optional(),
    actionCaption: z.string().max(160).optional(),
    fieldCaption: z.string().max(160).optional()
  }).strict(),
  locale: localeSchema
}).strict();

function result(status, candidates = []) {
  return { status, candidates };
}

function resultContent(value) {
  return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value };
}

function resolveObject(input) {
  if (input.objectType !== "page") return result("unresolved");
  if (input.productFamily === "aptean-food-and-beverage") return result("unresolved");
  const local = localRepository.lookupObject({ objectType: "page", objectId: input.objectId,
    ...(input.appId ? { appId: input.appId } : {}), ...(input.appVersion ? { appVersion: input.appVersion } : {}) });
  const candidates = local.candidates.filter(candidate => candidate.provenance.packId.startsWith("bc-"))
    .map(candidate => {
      const source = candidate.provenance.sourceRefs?.[0];
      const pack = snapshot.packs.find(item => item.packId === candidate.provenance.packId);
      return {
        candidateId: candidate.provenance.sourceRuleId,
        objectRef: { objectType: "page", objectId: input.objectId,
          ...(input.appId ? { appId: input.appId } : {}), ...(input.appVersion ? { appVersion: input.appVersion } : {}) },
        ...(candidate.displayName ? { displayName: candidate.displayName } : {}),
        ...(candidate.pageType ? { pageType: candidate.pageType } : {}),
        ...(candidate.sourceTable ? { sourceTable: candidate.sourceTable } : {}),
        ...(candidate.description ? { description: candidate.description } : {}),
        confidence: candidate.provenance.verification === "verified" ? 0.99 : 0.86,
        provenance: { sourceId: source?.sourceId || candidate.provenance.packId,
          sourceVersion: pack?.version || "unknown",
          ...(source?.sourceUri ? { sourceUri: source.sourceUri } : {}),
          ...(source?.title ? { sourceTitle: source.title } : {}) }
      };
    });
  return result(local.status, candidates.slice(0, 10));
}

function resolveAction(input) {
  if (input.objectRef.objectType !== "page") return result("unresolved");
  const objectLookup = localRepository.lookupObject({ ...input.objectRef, objectType: "page" });
  if (objectLookup.status !== "resolved") return result(objectLookup.status);
  const selectedKey = objectLookup.candidates[0].candidateId;
  const page = snapshot.objects.find(item => item.objectKey === selectedKey);
  if (!page) return result("unresolved");
  const task = {
    pageCaption: input.context.pageCaption || "",
    actionCaption: input.context.actionCaption || "",
    fieldCaption: input.context.fieldCaption || "",
    automationId: input.controlRef.automationId || "",
    context: {}
  };
  const scored = availableRules.filter(rule => rule.packId === page.packId || rule.packId === "bc-core" ||
    rule.packId === "bc-sales" || rule.packId === "bc-purchase" || rule.packId === "bc-warehouse" ||
    rule.packId === "bc-manufacturing")
    .map(rule => ({ rule, score: knowledgeDomain.score(rule, task) }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score);
  if (!scored.length) return result("unresolved");
  const topScore = scored[0].score;
  const top = scored.filter(item => item.score === topScore).slice(0, 10);
  const candidates = top.map(({ rule }) => ({
    candidateId: rule.ruleId,
    action: { taskType: rule.taskType, semanticAction: rule.semanticAction, entity: rule.entity },
    confidence: rule.confidence,
    provenance: provenance(rule.packId, rule.packVersion)
  }));
  return result(candidates.length === 1 ? "resolved" : "ambiguous", candidates);
}

const server = new McpServer({
  name: "bc-process-studio-knowledge",
  version: "1.0.0"
}, {
  instructions: "Read-only lookup against the BC Process Studio product knowledge catalog. Returns suggestions only. Never accepts tenant, environment, company, record values, screenshots, recordings, or writes."
});

server.registerTool("bc_process_resolve_object", {
  description: "Resolve a Business Central object identity from the approved product knowledge catalog. Read-only; does not query a tenant.",
  inputSchema: resolveObjectInput,
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
}, async input => resultContent(resolveObject(input)));

server.registerTool("bc_process_resolve_action", {
  description: "Suggest a semantic action for a page and interface captions using the approved product knowledge catalog. Read-only; does not query a tenant.",
  inputSchema: resolveActionInput,
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
}, async input => resultContent(resolveAction(input)));

void serveStdio(() => server);
