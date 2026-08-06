const assert = require("assert");
const consolidation = require("../src/engine/task-consolidation");

const tasks = [{
  taskId: "SelectCustomer-005", taskType: "SelectCustomer",
  semanticAction: "SelectCustomer", fieldCaption: "Kundens namn",
  instructionValue: "[aktuell kund]", instruction: "Välj kunden **[aktuell kund]**.",
  sourceEventNos: [21], screenshot: "screenshots/000021.png"
}, {
  taskId: "RunAction-006", taskType: "RunAction",
  actionCaption: "Välj ett värde för Kundens namn",
  instruction: "Välj **Välj ett värde för Kundens namn**.",
  sourceEventNos: [22], screenshot: "screenshots/000022.png"
}, {
  taskId: "SelectCustomer-007", taskType: "SelectCustomer",
  fieldCaption: "Kundens namn", instructionValue: "[aktuell kund]",
  instruction: "Välj kunden **[aktuell kund]**.", sourceEventNos: [23]
}, {
  taskId: "Select-008", taskType: "Select",
  selectedCaption: 'Välj posten "1033"',
  instruction: 'Välj **Välj posten "1033"**.', sourceEventNos: [24],
  screenshot: "screenshots/000024.png"
}, {
  taskId: "SelectCustomer-009", taskType: "SelectCustomer",
  fieldCaption: "Kundens namn", instructionValue: "[aktuell kund]",
  instruction: "Välj kunden **[aktuell kund]**.", sourceEventNos: [25],
  screenshot: "screenshots/000025.png"
}, {
  taskId: "ChangeField-010", taskType: "ChangeField",
  fieldCaption: "Sortera efter Nr", instruction: "Ändra fältet.",
  sourceEventNos: [26], screenshot: "screenshots/000026.png"
}];
const before = JSON.stringify(tasks);
const result = consolidation.consolidate(tasks);
assert.strictEqual(result.length, 2);
assert.strictEqual(result[0].taskType, "SelectCustomer");
assert.strictEqual(result[0].instruction, "Välj kund **1033**.");
assert.strictEqual(result[0].instructionValue, "1033");
assert.deepStrictEqual(result[0].sourceEventNos, [21, 22, 23, 24, 25]);
assert.strictEqual(result[0].screenshot, "screenshots/000025.png");
assert.deepStrictEqual(result[0].screenshots, ["screenshots/000025.png"]);
assert.deepStrictEqual(result[0].semanticActionModel.screenshotRefs, [
  "screenshots/000021.png", "screenshots/000022.png",
  "screenshots/000024.png", "screenshots/000025.png"
]);
assert.strictEqual(result[0].consolidation.sourceTaskCount, 5);
assert.strictEqual(result[1].taskType, "ChangeField");
assert.strictEqual(JSON.stringify(tasks), before, "input tasks must not mutate");

const single = [{ taskId: "customer", taskType: "SelectCustomer",
  instruction: "Välj kunden.", future: { preserve: true } }];
assert.strictEqual(consolidation.consolidate(single).length, 0,
  "a selection without a selected value must not become a visible step");
const unrelated = [{ taskId: "item", taskType: "Select",
  selectedCaption: 'Välj posten "136"', instruction: "Välj artikel 136." }];
assert.strictEqual(consolidation.consolidate(unrelated).length, 1);
assert.strictEqual(consolidation.consolidate(unrelated)[0].selectedCaption,
  'Välj posten "136"');

const salesLineTasks = [{ taskId: "filter", taskType: "ChangeField",
  entity: "Item", fieldCaption: "Sortera efter Nr", value: "",
  inputSources: ["focusout"], sourceEventNos: [31]
}, { taskId: "row", taskType: "Select", entity: "Item",
  selectedCaption: 'Välj posten "136"', sourceEventNos: [32],
  screenshot: "screenshots/000032.png"
}, { taskId: "filter-result", taskType: "ChangeField", entity: "Item",
  fieldCaption: "Sortera efter Nr", value: "136",
  inputSources: ["focusout"], sourceEventNos: [33],
  screenshot: "screenshots/000033.png"
}, { taskId: "vendor-focus", taskType: "ChangeField",
  fieldCaption: "Leverantörsnummer för direktleverans", value: "",
  inputSources: ["focusout"], sourceEventNos: [34]
}, { taskId: "tour-focus", taskType: "ChangeField",
  fieldCaption: "Sortera efter Tur Nr", value: "",
  inputSources: ["focusout"], sourceEventNos: [35]
}, { taskId: "quantity", taskType: "ChangeField",
  fieldCaption: "Sortera efter Antal", value: "500",
  instructionValue: "500", inputSources: ["input", "focusout"],
  sourceEventNos: [36], screenshot: "screenshots/000036.png"
}, { taskId: "release", taskType: "ReleaseDocument",
  instruction: "Välj Släpp.", sourceEventNos: [37]
}];
const salesLine = consolidation.consolidate(salesLineTasks);
assert.strictEqual(salesLine.length, 3);
assert.strictEqual(salesLine[0].instruction, "Välj artikel **136**.");
assert.strictEqual(salesLine[0].screenshot, "screenshots/000033.png");
assert.deepStrictEqual(salesLine[0].sourceEventNos, [31, 32, 33, 34, 35]);
assert.strictEqual(salesLine[1].fieldCaption, "Antal");
assert.strictEqual(salesLine[1].instruction, "Ange **500** i **Antal**.");
assert.strictEqual(salesLine[2].taskType, "ReleaseDocument");

console.log("Business task consolidation behaviour tests passed.");
