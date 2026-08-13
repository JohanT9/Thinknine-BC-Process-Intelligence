const assert = require("assert");
const fs = require("fs");
const path = require("path");
const exportSettings = require("../src/engine/export-settings");

function classList() {
  const values = new Set();
  return {
    contains: value => values.has(value),
    toggle(value, enabled) {
      if (enabled) values.add(value);
      else values.delete(value);
    }
  };
}

function input(value, selectionStart = value.length, selectionEnd = selectionStart) {
  return {
    value,
    selectionStart,
    selectionEnd,
    classList: classList(),
    attributes: {},
    focused: false,
    focus() {
      this.focused = true;
    },
    setAttribute(name, attributeValue) {
      this.attributes[name] = attributeValue;
    },
    setRangeText(replacement, start, end) {
      this.value = this.value.slice(0, start) + replacement + this.value.slice(end);
      this.selectionStart = start + replacement.length;
      this.selectionEnd = this.selectionStart;
    }
  };
}

function previewElements(template) {
  return {
    input: input(template),
    preview: {
      textContent: "",
      classList: classList(),
      attributes: {},
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    },
    validation: { textContent: "" }
  };
}

const inserted = input("Order - ", 8);
const cursor = exportSettings.insertVariable(inserted, "{date}");
assert.strictEqual(inserted.value, "Order - {date}");
assert.strictEqual(cursor, 14);
assert.strictEqual(inserted.selectionStart, 14);
assert.strictEqual(inserted.selectionEnd, 14);
assert.strictEqual(inserted.focused, true);

const selected = input("Order OLD Manual", 6, 9);
exportSettings.insertVariable(selected, "{environment}");
assert.strictEqual(selected.value, "Order {environment} Manual");
assert.strictEqual(selected.selectionStart, 19);

const now = new Date(2026, 7, 4, 9, 7);
const session = {
  name: "Lägg order",
  settings: { environmentName: "Gammal miljö" }
};
const settings = {
  exportFileNamePattern: "{process} {environment} {date} {time} {version}",
  environmentName: "Produktion"
};
assert.strictEqual(
  exportSettings.buildFileName("docx", session, settings, now),
  "Lägg-order-Produktion-2026-08-04-09-07-4.6.0.docx"
);

const elements = previewElements("{process}-{environment}");
const firstPreview = exportSettings.updatePreview(
  elements,
  session,
  { ...settings, exportFileNamePattern: elements.input.value },
  now
);
assert.strictEqual(firstPreview, "Lägg-order-Produktion.docx");
assert.strictEqual(elements.preview.textContent, "Förhandsvisning: Lägg-order-Produktion.docx");

elements.input.value = "Manual-{date}";
const updatedPreview = exportSettings.updatePreview(
  elements,
  session,
  { ...settings, exportFileNamePattern: elements.input.value },
  now
);
assert.strictEqual(updatedPreview, "Manual-2026-08-04.docx");

elements.input.value = "{process}-{environment}";
const contextPreview = exportSettings.updatePreview(
  elements,
  { ...session, name: "Ny session" },
  {
    ...settings,
    environmentName: "Test",
    exportFileNamePattern: elements.input.value
  },
  now
);
assert.strictEqual(contextPreview, "Ny-session-Test.docx");

assert.deepStrictEqual(
  exportSettings.validateTemplate("{process}-{customer}-{future}")
    .filter(issue => issue.type === "unknown")
    .map(issue => issue.name),
  ["customer", "future"]
);

elements.input.value = "{process}-{customer}-{customer}";
exportSettings.updatePreview(
  elements,
  session,
  { ...settings, exportFileNamePattern: elements.input.value },
  now
);
assert.strictEqual(elements.input.attributes["aria-invalid"], "true");
assert.strictEqual(elements.input.classList.contains("filename-template-invalid"), true);
assert.strictEqual(elements.preview.classList.contains("invalid"), true);
assert.strictEqual(elements.preview.attributes["aria-live"], "off");
assert.strictEqual(elements.validation.textContent, "Okända variabler: {customer}.");

assert.deepStrictEqual(
  exportSettings.validationMessages("Manual-{date"),
  ['Variabeln "{date" saknar avslutande }.']
);
assert.deepStrictEqual(
  exportSettings.validationMessages("Manual-{{date}}"),
  ["Dubbla { är inte tillåtna."]
);
assert.deepStrictEqual(
  exportSettings.validationMessages("Manual-{}-{Date}-{date!}-}"),
  [
    "Felaktiga variabler: {}, {Date}, {date!}, fristående }. " +
      "Använd formatet {namn}."
  ]
);
assert.deepStrictEqual(
  exportSettings.validationMessages("{customer}-{future}-{customer}"),
  ["Okända variabler: {customer}, {future}."]
);

const malformedElements = previewElements("{process}-{{date}}-{future}");
const malformedFilename = exportSettings.updatePreview(
  malformedElements,
  session,
  { ...settings, exportFileNamePattern: malformedElements.input.value },
  now
);
assert.strictEqual(
  malformedElements.validation.textContent,
  "Okända variabler: {future}. Dubbla { är inte tillåtna."
);
assert.ok(malformedFilename.endsWith(".docx"));

elements.input.value = "{process}-{date}";
exportSettings.updatePreview(
  elements,
  session,
  { ...settings, exportFileNamePattern: elements.input.value },
  now
);
assert.strictEqual(elements.input.attributes["aria-invalid"], "false");
assert.strictEqual(elements.input.classList.contains("filename-template-invalid"), false);
assert.strictEqual(elements.preview.classList.contains("invalid"), false);
assert.strictEqual(elements.preview.attributes["aria-live"], "polite");
assert.strictEqual(elements.validation.textContent, "");

const variableNames = exportSettings.variableDefinitions.map(
  definition => definition.name
);
assert.deepStrictEqual(
  variableNames,
  ["process", "environment", "date", "time", "version"]
);

const createdButtons = [];
const fakeDocument = {
  createElement() {
    return {
      dataset: {},
      listeners: {},
      attributes: {},
      focused: false,
      addEventListener(type, listener) {
        this.listeners[type] = listener;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      focus() {
        this.focused = true;
      }
    };
  }
};
const variableContainer = {
  ownerDocument: fakeDocument,
  replaceChildren() {
    createdButtons.length = 0;
  },
  appendChild(button) {
    createdButtons.push(button);
  }
};
const variableHelp = { textContent: "" };
let selectedToken = "";
exportSettings.renderVariableControls(
  variableContainer,
  variableHelp,
  token => {
    selectedToken = token;
  }
);
assert.deepStrictEqual(
  createdButtons.map(button => button.dataset.variable),
  variableNames.map(name => `{${name}}`)
);
assert.strictEqual(
  variableHelp.textContent,
  "Tillgängliga variabler: {process}, {environment}, {date}, {time}, {version}"
);
createdButtons[2].listeners.click();
assert.strictEqual(selectedToken, "{date}");
assert.strictEqual(createdButtons[2].attributes["aria-label"], "Infoga variabeln {date}");

let prevented = false;
createdButtons[2].listeners.keydown({
  key: "ArrowRight",
  preventDefault() {
    prevented = true;
  }
});
assert.strictEqual(prevented, true);
assert.strictEqual(createdButtons[3].focused, true);

createdButtons[2].listeners.keydown({ key: "Home", preventDefault() {} });
assert.strictEqual(createdButtons[0].focused, true);
createdButtons[2].listeners.keydown({ key: "End", preventDefault() {} });
assert.strictEqual(createdButtons.at(-1).focused, true);

const html = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.html"), "utf8");
const background = fs.readFileSync(
  path.join(__dirname, "../src/recorder/background.js"),
  "utf8"
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/ui/manifest.json"), "utf8")
);
assert.ok(manifest.permissions.includes("downloads"));
assert.ok(html.includes('src="engine/export-settings.js"'));
assert.ok(!html.includes('id="alwaysAskExportLocation"'));
assert.ok(html.includes('id="exportFileNamePattern"'));
assert.ok(html.includes('id="filenamePreview"'));
assert.ok(html.includes('id="filenameValidation"'));
assert.ok(html.includes('id="filenameVariableHelp"'));
assert.ok(html.includes('id="filenameVariables"'));
assert.ok(
  html.includes(
    'aria-describedby="filenameVariableHelp filenamePreview filenameValidation"'
  )
);
assert.ok(html.includes('role="group"'));
assert.ok(html.includes('role="status"'));
assert.ok(html.includes('aria-errormessage="filenameValidation"'));
assert.ok(html.includes('aria-live="polite"'));
assert.ok(html.includes('aria-atomic="true"'));
assert.ok(!html.includes('data-variable="{company}"'));
assert.ok(!html.includes('data-variable="{user}"'));
assert.ok(background.includes('case "T9_DOWNLOAD_FILE"'));
assert.ok(background.includes("chrome.downloads.download"));
assert.ok(!background.includes("saveAs:"));

console.log("Export settings behaviour tests passed.");
