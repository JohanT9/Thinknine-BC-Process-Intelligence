(function (root, factory) {
  const value = factory();
  if (typeof module === "object" && module.exports) module.exports = value;
  root.T9ProductBrand = value;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return Object.freeze({
    productName: "BC Process Studio",
    companyAttribution: "",
    descriptor: "Business Process Intelligence for Microsoft Dynamics 365 Business Central",
    primaryTagline: "Turn Business Central processes into knowledge.",
    supportingMessage: "Capture. Document. Improve.",
    modules: Object.freeze({
      recorder: "BC Process Recorder",
      reviewStudio: "BC Review Studio",
      documentGenerator: "BC Document Generator",
      processMaps: "BC Process Maps",
      knowledgeBase: "BC Knowledge Base",
      processAI: "BC Process AI"
    })
  });
});
