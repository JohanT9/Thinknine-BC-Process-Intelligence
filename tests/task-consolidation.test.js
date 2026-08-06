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
assert.strictEqual(result[0].consolidation.sourceTaskCount, 5);
assert.strictEqual(result[1].taskType, "ChangeField");
assert.strictEqual(JSON.stringify(tasks), before, "input tasks must not mutate");

const single = [{ taskId: "customer", taskType: "SelectCustomer",
  instruction: "Välj kunden.", future: { preserve: true } }];
assert.deepStrictEqual(consolidation.consolidate(single)[0].future,
  { preserve: true });
const unrelated = [{ taskId: "item", taskType: "Select",
  selectedCaption: 'Välj posten "136"', instruction: "Välj artikel 136." }];
assert.strictEqual(consolidation.consolidate(unrelated).length, 1);
assert.strictEqual(consolidation.consolidate(unrelated)[0].selectedCaption,
  'Välj posten "136"');

console.log("Business task consolidation behaviour tests passed.");
