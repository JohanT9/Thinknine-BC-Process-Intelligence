// A knowledge pack as the extension loads it: with Business Central's own captions of its rules'
// pages, actions and fields in every registered language and their AL names
// (knowledge-packs/generated/bc-rule-captions.json, attached by engine/knowledge-repository.js load).
// Tests that read a pack file directly use this, so they exercise what the extension runs.
const generated = require("../../src/knowledge-packs/generated/bc-rule-captions.json");
const captions = require("../../src/engine/knowledge-captions");

function asLoaded(pack) {
  return captions.attach([pack], { microsoft: generated })[0];
}

module.exports = { asLoaded, generated };
