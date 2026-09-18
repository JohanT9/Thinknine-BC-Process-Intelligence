import assert from "node:assert/strict";
import JSZip from "jszip";
import pipeline from "../src/exporters/word-export-pipeline.js";
import profiles from "../src/document/document-profile.js";
import "../src/exporters/word-exporter-docx.mjs";

const session = { id: "footer-regression", name: "Guide for order entry" };
const review = { sessionId: session.id, sessionName: session.name,
  tasks: [{ taskId: "step-1", instruction: "Choose an order." }] };
const original = JSON.stringify(review);
for (const profile of profiles.BUILT_IN_PROFILES) {
  const prepared = pipeline.create({ session, review,
    profileId: profile.profileId, themeId: profile.theme.themeId });
  const footer = prepared.plan.components.find(component => component.kind === "footer");
  assert.equal(typeof footer.content.text, "string", profile.profileId);
  assert.ok(footer.content.text.trim(), profile.profileId);
  if (profile.theme.themeId === "minimal") {
    assert.equal(footer.content.text, prepared.semanticDocument.metadata.title);
    assert.equal(footer.content.brandingReference, "");
  }
  const output = await globalThis.T9Export.word.renderPlan({ plan: prepared.plan, mediaAssets: {} });
  const zip = await JSZip.loadAsync(await output.blob.arrayBuffer());
  const footerXml = await zip.file("word/footer1.xml").async("string");
  assert.ok(footerXml.includes(footer.content.text), profile.profileId);
  assert.ok(footerXml.includes("PAGE"), profile.profileId);
}
const custom = pipeline.create({ session, review, themeId: "thinknine",
  themeOverrides: { branding: { footer: "Custom footer" } } });
assert.equal(custom.plan.components.find(c => c.kind === "footer").content.text, "Custom footer");
assert.equal(JSON.stringify(review), original);
console.log("All document profiles export valid Word footers.");
