// Compares the steps a recording produced with the steps a person expects, in order.
// Each produced step is correct, wrong (right control, wrong value), a duplicate of an
// expected step that is already covered, or extra (no expected step at all). Expected steps
// without a produced step are missing.

const normalize = value => String(value ?? "").normalize("NFC").trim()
  .replace(/\s+/gu, " ").replace(/(?:\.\.\.|…|\.)$/u, "").toLowerCase();

// A step on a control is identified by its caption; choosing a record in a list has no
// control caption and is identified by the chosen record.
function targetsOf(task) {
  const captions = [task.actionCaption, task.fieldCaption].map(normalize).filter(Boolean);
  return captions.length ? captions : [normalize(task.selectedCaption)].filter(Boolean);
}

function valuesOf(task) {
  return [task.selectedCaption, task.instructionValue, task.value]
    .filter(value => value != null && typeof value !== "object").map(normalize).filter(Boolean);
}

// 2: same control and value, 1: same control only, 0: unrelated.
function similarity(expected, task) {
  if (!targetsOf(task).includes(normalize(expected.target))) return 0;
  if (expected.value == null || expected.value === "") return 2;
  return valuesOf(task).includes(normalize(expected.value)) ? 2 : 1;
}

function score(expectedSteps, tasks) {
  const rows = expectedSteps.length; const columns = tasks.length;
  // Order-preserving alignment that maximizes similarity (a weighted longest common subsequence).
  const table = Array.from({ length: rows + 1 }, () => new Array(columns + 1).fill(0));
  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      const pair = similarity(expectedSteps[row - 1], tasks[column - 1]);
      table[row][column] = Math.max(table[row - 1][column], table[row][column - 1],
        pair ? table[row - 1][column - 1] + pair : -1);
    }
  }
  const pairs = [];
  for (let row = rows, column = columns; row > 0 && column > 0;) {
    const pair = similarity(expectedSteps[row - 1], tasks[column - 1]);
    if (pair && table[row][column] === table[row - 1][column - 1] + pair) {
      pairs.unshift({ expected: row - 1, task: column - 1, pair }); row -= 1; column -= 1;
    } else if (table[row - 1][column] >= table[row][column - 1]) row -= 1;
    else column -= 1;
  }

  const taskOutcome = new Array(columns).fill(null);
  const expectedOutcome = new Array(rows).fill("missing");
  for (const { expected, task, pair } of pairs) {
    taskOutcome[task] = pair === 2 ? "correct" : "wrong";
    expectedOutcome[expected] = taskOutcome[task];
  }
  taskOutcome.forEach((outcome, index) => {
    if (outcome) return;
    const covered = pairs.some(item => similarity(expectedSteps[item.expected], tasks[index]));
    taskOutcome[index] = covered ? "duplicate" : "extra";
  });

  const count = outcome => taskOutcome.filter(item => item === outcome).length;
  const correct = count("correct");
  return {
    expected: rows, produced: columns, correct, wrong: count("wrong"),
    duplicates: count("duplicate"), extras: count("extra"),
    missing: expectedOutcome.filter(item => item === "missing").length,
    precision: columns ? correct / columns : 1,
    recall: rows ? correct / rows : 1,
    steps: tasks.map((task, index) => ({ outcome: taskOutcome[index],
      instruction: task.instruction })),
    missingSteps: expectedSteps.filter((_, index) => expectedOutcome[index] === "missing")
  };
}

module.exports = { normalize, score, similarity };
