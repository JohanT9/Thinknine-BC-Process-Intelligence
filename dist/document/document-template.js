(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentTemplate = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // A document template: how documents look. The user makes templates of their own from the
  // built-in ones and gives them a logo, a company name, a colour, a font and a footer; a
  // document names its template in the library (record.theme.themeId) and follows it, so a
  // change to a template shows in every document that uses it. A template only changes how
  // a document is presented: the document's content is never changed by it.
  //
  // Built-in templates are the built-in document themes; they are not stored and cannot be
  // changed. A template of the user's own is a built-in theme (baseThemeId) with the user's
  // appearance laid over it (themeOverrides).
  const SCHEMA_VERSION = 1;
  const LOGO_ASSET_ID = "template-logo";
  const DEFAULT_TEMPLATE_ID = "thinknine";
  const BUILT_IN = Object.freeze([
    Object.freeze({ templateId: "thinknine", name: "BC Process Studio", color: "#007a82", font: "Segoe UI" }),
    Object.freeze({ templateId: "minimal", name: "Minimal", color: "#111827", font: "Arial" }),
    Object.freeze({ templateId: "corporate", name: "Corporate", color: "#17365d", font: "Arial" })
  ]);
  // Fonts Word has on Windows and the preview can show; a document must look the same on
  // the reader's computer.
  const FONTS = Object.freeze(["Segoe UI", "Calibri", "Aptos", "Arial", "Verdana", "Georgia", "Cambria"]);
  const MAX_NAME = 80;
  const MAX_COMPANY = 120;
  const MAX_FOOTER = 200;
  const MAX_TEXT = 2000;
  // The parts of a document a template can leave out or add. The workflow is always there.
  // Each key is the semantic section kind it stands for; toc is added by the template.
  const SECTIONS = Object.freeze(["cover", "toc", "purpose", "prerequisites", "expectedResult",
    "revisionHistory"]);
  const DEFAULT_SECTIONS = Object.freeze({ cover: true, toc: false, purpose: true,
    prerequisites: true, expectedResult: true, revisionHistory: true });
  // A logo is stored as a PNG data URL, scaled down when it is chosen (at most 800 × 300).
  const MAX_LOGO_LENGTH = 1500000;
  const LOGO_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/u;
  const COLOR_PATTERN = /^#[0-9a-f]{6}$/iu;

  const text = (value, max) => (typeof value === "string" ? value : "").slice(0, max);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  class UnsupportedTemplateError extends Error {
    constructor(version) {
      super(`This document template was saved by a newer version of BC Process Studio (schema ${version}).`);
      this.name = "UnsupportedTemplateError";
      this.code = "unsupported-template";
    }
  }

  const isBuiltIn = templateId => BUILT_IN.some(item => item.templateId === templateId);

  function builtIn(templateId) {
    const item = BUILT_IN.find(entry => entry.templateId === templateId);
    return item ? { schemaVersion: SCHEMA_VERSION, templateId: item.templateId, name: item.name,
      builtIn: true, baseThemeId: item.templateId, company: "", color: item.color, font: item.font,
      footer: "", logo: null, sections: { ...DEFAULT_SECTIONS }, purposeText: "",
      expectedResultText: "" } : null;
  }

  function normalizeLogo(value) {
    if (!value || typeof value !== "object") return null;
    const dataUrl = typeof value.dataUrl === "string" ? value.dataUrl : "";
    const width = Math.round(Number(value.width));
    const height = Math.round(Number(value.height));
    if (dataUrl.length > MAX_LOGO_LENGTH || !LOGO_PATTERN.test(dataUrl) ||
        !(width > 0 && width <= 4000) || !(height > 0 && height <= 4000)) return null;
    return { dataUrl, width, height };
  }

  function normalizeSections(value) {
    const input = value && typeof value === "object" ? value : {};
    return Object.fromEntries(SECTIONS.map(key =>
      [key, typeof input[key] === "boolean" ? input[key] : DEFAULT_SECTIONS[key]]));
  }

  // A template of the user's own as it is stored. Fields this version does not know are kept;
  // a template saved by a newer version is refused rather than read wrongly.
  function normalize(value = {}) {
    const input = clone(value) || {};
    const version = input.schemaVersion === undefined ? SCHEMA_VERSION : input.schemaVersion;
    if (version !== SCHEMA_VERSION) throw new UnsupportedTemplateError(version);
    const templateId = text(input.templateId, 120);
    if (!templateId || isBuiltIn(templateId)) throw new TypeError("A document template needs its own id.");
    const base = isBuiltIn(input.baseThemeId) ? input.baseThemeId : DEFAULT_TEMPLATE_ID;
    return { ...input, schemaVersion: SCHEMA_VERSION, templateId, builtIn: false,
      name: text(input.name, MAX_NAME).trim() ? text(input.name, MAX_NAME) : templateId,
      baseThemeId: base,
      company: text(input.company, MAX_COMPANY),
      color: COLOR_PATTERN.test(String(input.color || "")) ? String(input.color).toLowerCase()
        : builtIn(base).color,
      font: FONTS.includes(input.font) ? input.font : builtIn(base).font,
      footer: text(input.footer, MAX_FOOTER),
      logo: normalizeLogo(input.logo),
      sections: normalizeSections(input.sections),
      purposeText: text(input.purposeText, MAX_TEXT),
      expectedResultText: text(input.expectedResultText, MAX_TEXT),
      createdAt: text(input.createdAt, 40), updatedAt: text(input.updatedAt, 40) };
  }

  // A new template of the user's own, starting from another one.
  function create(from, options = {}) {
    const source = from?.builtIn || isBuiltIn(from?.templateId) ? builtIn(from.templateId) || builtIn(DEFAULT_TEMPLATE_ID)
      : normalize(from);
    const now = options.now || new Date().toISOString();
    const { templateId, name, builtIn: ignored, createdAt, updatedAt, ...appearance } = source;
    return normalize({ ...appearance, templateId: String(options.templateId || ""),
      name: text(options.name, MAX_NAME) || name, createdAt: now, updatedAt: now });
  }

  function update(template, patch = {}, now) {
    const current = normalize(template);
    const allowed = ["name", "company", "color", "font", "footer", "logo", "sections",
      "purposeText", "expectedResultText"];
    const changes = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
    if (changes.sections) changes.sections = { ...current.sections, ...changes.sections };
    return normalize({ ...current, ...changes, updatedAt: now || new Date().toISOString() });
  }

  // The words a footer can be filled in with, in every language a user may write them in:
  // {document} or {dokument}, {date} or {datum}, {page} or {sida}, and so on.
  const FOOTER_FIELDS = Object.freeze({
    document: ["document", "dokument", "documento", "asiakirja", "doc"],
    date: ["date", "datum", "fecha", "dato", "päivämäärä", "paivamaara", "pvm"],
    page: ["page", "sida", "seite", "página", "pagina", "side", "sivu"]
  });
  const fieldOf = name => Object.keys(FOOTER_FIELDS).find(field =>
    FOOTER_FIELDS[field].includes(String(name).trim().toLocaleLowerCase()));
  // The footer with the document's name and date filled in. The page number is kept as
  // "{page}" for the renderer, which knows the page.
  function footerText(footer, values = {}) {
    return text(footer, MAX_FOOTER).replace(/\{([^{}\n]{1,20})\}/gu, (match, name) => {
      const field = fieldOf(name);
      if (field === "document") return String(values.document || "");
      if (field === "date") return String(values.date || "");
      if (field === "page") return "{page}";
      return match;
    });
  }
  // The footer in parts, for a renderer: text and the page number.
  function footerParts(value, pageNumber) {
    return String(value || "").split("{page}").flatMap((part, index) =>
      index ? [{ page: true, text: pageNumber === undefined ? "" : String(pageNumber) }, { text: part }]
        : [{ text: part }]).filter(part => part.page || part.text);
  }

  // Colours: the template's colour is used for headings and lines, and is darkened when it
  // would be hard to read as text on white.
  const rgb = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const hex = values => `#${values.map(value => Math.max(0, Math.min(255, Math.round(value)))
    .toString(16).padStart(2, "0")).join("")}`;
  const mix = (color, other, amount) => {
    const a = rgb(color);
    const b = rgb(other);
    return hex(a.map((value, index) => value + (b[index] - value) * amount));
  };
  const luminance = color => {
    const [r, g, b] = rgb(color).map(value => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrastOnWhite = color => 1.05 / (luminance(color) + 0.05);
  function readableColor(color) {
    let value = COLOR_PATTERN.test(String(color || "")) ? String(color).toLowerCase() : builtIn(DEFAULT_TEMPLATE_ID).color;
    for (let step = 0; step < 20 && contrastOnWhite(value) < 4.5; step += 1) value = mix(value, "#000000", 0.1);
    return value;
  }

  // The theme a template of the user's own lays over its built-in theme. The header shows
  // the logo and the company, the footer the template's text; the cover names the company.
  // values: the document's name and date, for the footer.
  function themeOverrides(template, values = {}, baseCapabilities = []) {
    const value = normalize(template);
    const primary = readableColor(value.color);
    const tint = mix(primary, "#ffffff", 0.92);
    const soft = mix(primary, "#ffffff", 0.72);
    const font = value.font;
    const logo = value.logo ? LOGO_ASSET_ID : "";
    return {
      colors: { primary },
      typography: { title: { family: font }, heading1: { family: font, color: primary },
        heading2: { family: font, color: primary }, body: { family: font }, caption: { family: font } },
      components: {
        document: { fontFamily: font },
        header: { fillColor: "", textColor: "#4b5563", borderColor: primary },
        footer: { borderColor: soft },
        cover: { brandText: value.company, dividerColor: primary, brandLogo: logo },
        heading: { dividerColor: primary },
        step: { headingColor: primary, headingBorderColor: primary, headingFill: tint },
        metadataTable: { labelFill: tint },
        screenshot: { borderColor: soft }
      },
      capabilities: [...new Set([...(baseCapabilities || []), "supportsHeader", "supportsFooter",
        "supportsBranding"])],
      branding: { templateId: value.templateId, organizationName: value.company,
        footer: footerText(value.footer, values), logo }
    };
  }

  // The document with the template's sections: the parts it leaves out are not shown and a
  // table of contents is added after the cover when the template has one. The content of the
  // parts that are shown is not changed. A built-in template gives the document as it is.
  function arrangeSections(document, template) {
    const sections = template?.builtIn || !template ? { ...DEFAULT_SECTIONS }
      : normalizeSections(template.sections);
    const kept = (document?.sections || []).filter(section =>
      !SECTIONS.includes(section.kind) || sections[section.kind] !== false);
    if (sections.toc && !kept.some(section => section.kind === "toc")) {
      const at = kept.findIndex(section => section.kind === "cover") + 1;
      kept.splice(at, 0, { sectionId: "section:toc", kind: "toc", title: "",
        blocks: [{ blockId: "block:toc", kind: "toc" }] });
    }
    return { ...document, sections: kept };
  }

  // The logo as an image the renderers take: the bytes for Word, the data URL for the preview.
  function logoMedia(template) {
    const logo = normalizeLogo(template?.logo);
    if (!logo) return null;
    const base64 = logo.dataUrl.slice(logo.dataUrl.indexOf(",") + 1);
    const binary = typeof atob === "function" ? atob(base64)
      : globalThis.Buffer.from(base64, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return { bytes, mimeType: "image/png", source: logo.dataUrl, width: logo.width, height: logo.height };
  }

  // Templates in storage: one entry per template of the user's own, and the template new
  // documents get. A stored template that cannot be read is left as it is.
  async function list(storage, keys) {
    // Only the template entries are read when the storage can list its keys.
    const names = typeof storage.getKeys === "function"
      ? (await storage.getKeys()).filter(key => key.startsWith(keys.DOCUMENT_TEMPLATE_PREFIX))
      : null;
    const all = names ? (names.length ? await storage.get(names) : {}) : await storage.get(null);
    const templates = [];
    const unreadable = [];
    for (const [key, value] of Object.entries(all || {})) {
      if (!key.startsWith(keys.DOCUMENT_TEMPLATE_PREFIX)) continue;
      try { templates.push(normalize(value)); } catch (error) { unreadable.push({ key, code: error.code || "" }); }
    }
    templates.sort((a, b) => a.name.localeCompare(b.name) || a.templateId.localeCompare(b.templateId));
    return { templates, unreadable };
  }
  async function save(storage, keys, template) {
    const value = normalize(template);
    await storage.set({ [keys.DOCUMENT_TEMPLATE_PREFIX + value.templateId]: value });
    return value;
  }
  async function remove(storage, keys, templateId) {
    if (isBuiltIn(templateId)) throw new TypeError("A built-in template cannot be removed.");
    await storage.remove(keys.DOCUMENT_TEMPLATE_PREFIX + templateId);
  }
  async function defaultTemplateId(storage, keys, templates = []) {
    const stored = (await storage.get(keys.DEFAULT_DOCUMENT_TEMPLATE_KEY))[keys.DEFAULT_DOCUMENT_TEMPLATE_KEY];
    return isBuiltIn(stored) || templates.some(item => item.templateId === stored) ? stored : DEFAULT_TEMPLATE_ID;
  }
  async function setDefault(storage, keys, templateId) {
    await storage.set({ [keys.DEFAULT_DOCUMENT_TEMPLATE_KEY]: String(templateId || DEFAULT_TEMPLATE_ID) });
  }

  // The template a document names: a built-in one, one of the user's own, or the default
  // template (fallbackId) when the one it names is not here, for example removed or not yet
  // synchronized.
  // The document keeps the name of its template either way.
  function resolve(templates, templateId, fallbackId = DEFAULT_TEMPLATE_ID) {
    const find = id => builtIn(id) || (templates || []).find(item => item.templateId === id);
    return find(templateId) || find(fallbackId) || builtIn(DEFAULT_TEMPLATE_ID);
  }

  // Templates moving between computers: with exported documents, through the synchronized
  // folder and as a file of their own. A template keeps its id everywhere, so the documents
  // that name it follow it on every computer.
  const FILE_FORMAT = "bc-process-studio-template";
  const FILE_FORMAT_VERSION = 1;
  const FILE_EXTENSION = ".bcpt";

  // JSON with sorted object keys, so the same template always gives the same text.
  function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).filter(key => value[key] !== undefined).sort()
        .map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value === undefined ? null : value);
  }
  // What a template looks like and contains, whenever it was saved.
  function fingerprint(template) {
    const { createdAt, updatedAt, ...rest } = normalize(template);
    return canonical(rest);
  }
  const newer = (a, b) => String(a?.updatedAt || "") > String(b?.updatedAt || "");

  // What taking in templates from elsewhere does with each one:
  //   new      not here: added
  //   same     here already, the same
  //   newer    here, but the incoming one was changed later: replaces it
  //   older    here, and changed here later: this computer's is kept
  // A template that cannot be read (or saved by a newer version) is left out and counted.
  function incoming(values, local = []) {
    const byId = new Map((local || []).map(item => [item.templateId, item]));
    const items = [];
    const seen = new Set();
    let unreadable = 0;
    for (const value of Array.isArray(values) ? values : []) {
      let template;
      try { template = normalize(value); } catch { unreadable += 1; continue; }
      if (seen.has(template.templateId)) continue;
      seen.add(template.templateId);
      const current = byId.get(template.templateId) || null;
      const status = !current ? "new" : fingerprint(current) === fingerprint(template) ? "same"
        : newer(template, current) ? "newer" : "older";
      items.push({ templateId: template.templateId, status, template, previous: current });
    }
    return { items, unreadable,
      writes: items.filter(item => item.status === "new" || item.status === "newer") };
  }

  // The templates of the user's own that some of the given library records name.
  function usedBy(templates, records) {
    const ids = new Set((records || []).map(record => record?.theme?.themeId).filter(Boolean));
    return (templates || []).filter(template => ids.has(template.templateId)).map(normalize);
  }

  // A template as a file of its own, to give to a colleague.
  function fileText(template, { exportedAt = new Date().toISOString(), appVersion = "" } = {}) {
    return JSON.stringify({ format: FILE_FORMAT, formatVersion: FILE_FORMAT_VERSION, exportedAt,
      appVersion, template: normalize(template) }, null, 2);
  }
  function fileError(code) {
    const error = new Error(`template.file.${code}`);
    error.code = code;
    return error;
  }
  function readFile(textValue) {
    let value;
    try { value = JSON.parse(String(textValue || "").replace(/^\uFEFF/u, "")); } catch { throw fileError("notTemplate"); }
    if (!value || value.format !== FILE_FORMAT || !Number.isInteger(value.formatVersion)) {
      throw fileError("notTemplate");
    }
    if (value.formatVersion > FILE_FORMAT_VERSION) throw fileError("newerVersion");
    try { return { template: normalize(value.template), exportedAt: text(value.exportedAt, 40) }; } catch (error) {
      throw fileError(error.code === "unsupported-template" ? "newerVersion" : "notTemplate");
    }
  }
  function fileName(template) {
    const safe = String(template?.name || "").replace(/[<>:"/\\|?*\x00-\x1F]/gu, "_")
      .replace(/\s+/gu, "-").slice(0, 60) || "template";
    return `BC-Process-Studio-${safe}${FILE_EXTENSION}`;
  }

  return Object.freeze({ SCHEMA_VERSION, LOGO_ASSET_ID, DEFAULT_TEMPLATE_ID, BUILT_IN, FONTS,
    MAX_NAME, MAX_COMPANY, MAX_FOOTER, MAX_TEXT, SECTIONS, DEFAULT_SECTIONS,
    FILE_FORMAT, FILE_FORMAT_VERSION, FILE_EXTENSION,
    UnsupportedTemplateError, arrangeSections, builtIn, isBuiltIn, normalize,
    create, update, footerText, footerParts, readableColor, contrastOnWhite, themeOverrides,
    logoMedia, list, save, remove, defaultTemplateId, setDefault, resolve,
    fingerprint, incoming, usedBy, fileText, readFile, fileName });
});
