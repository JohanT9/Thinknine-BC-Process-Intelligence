(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BusinessCentralVersionCapture = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "\\d{1,3}\\.\\d{1,3}\\.\\d{1,8}\\.\\d{1,8}";
  const LABELS = Object.freeze({
    platformVersion: ["platform version", "platform", "plattformsversion", "plattform",
      "version de la plateforme", "version de plateforme", "plattformversion",
      "versión de plataforma", "versione piattaforma", "platformversion",
      "alustaversio", "plattformversjon"],
    applicationVersion: ["application version", "application", "programversion",
      "applikationsversion", "version de l’application", "version de l'application",
      "version de l’application", "anwendungsversion", "versión de la aplicación",
      "versione applicazione", "programversion", "sovellusversio", "programversjon"]
  });
  const clean = value => String(value || "").replace(/\s+/gu, " ").trim();
  function extract(text) {
    const source = String(text || "").slice(0, 150000);
    const result = {};
    const combined = new RegExp(`\\bPlatform\\s+(${VERSION})\\s*\\+\\s*Application\\s+(${VERSION})`, "iu")
      .exec(source);
    if (combined) {
      result.platformVersion = combined[1];
      result.applicationVersion = combined[2];
    }
    const lines = source.split(/\r?\n/u).map(clean).filter(Boolean);
    for (const [field, labels] of Object.entries(LABELS)) {
      if (result[field]) continue;
      const label = labels.map(value => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("|");
      const inline = new RegExp(`(?:^|\\b)(?:${label})\\s*[:：]?\\s*(${VERSION})(?:\\b|$)`, "iu");
      const exact = new RegExp(`^(?:${label})\\s*[:：]?\\s*$`, "iu");
      for (let index = 0; index < lines.length; index++) {
        const match = inline.exec(lines[index]);
        if (match) { result[field] = match[1]; break; }
        if (exact.test(lines[index])) {
          const following = lines[index + 1]?.match(new RegExp(`^(${VERSION})$`, "u"));
          if (following) { result[field] = following[1]; break; }
        }
      }
    }
    return Object.freeze(result);
  }
  return Object.freeze({ extract });
});
