(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TaskConsolidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CUSTOMER_FIELD = /kundens namn|kundnr|customer name|customer no\.?/iu;
  const CUSTOMER_LOOKUP = /välj ett värde för\s+(?:kundens namn|kundnr)|select a value for\s+(?:customer name|customer no\.?)/iu;
  const RECORD_SELECTION = /^(?:välj posten|select record)\s+["“]?(.+?)["”]?\.?$/iu;

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function taskText(task) {
    return [task.fieldCaption, task.actionCaption, task.selectedCaption,
      task.instruction, task.description].map(text).join(" ");
  }

  function customerTask(task) {
    return task?.taskType === "SelectCustomer" ||
      task?.semanticAction === "SelectCustomer" ||
      CUSTOMER_FIELD.test(taskText(task));
  }

  function lookupHelper(task) {
    return CUSTOMER_LOOKUP.test(taskText(task));
  }

  function selectedRecordValue(task) {
    for (const candidate of [task?.selectedCaption, task?.actionCaption,
      task?.instruction, task?.description]) {
      const match = text(candidate).replace(/\*\*/gu, "").match(RECORD_SELECTION);
      if (match) return match[1].replace(/["“”]+$/gu, "").trim();
    }
    return "";
  }

  function recordSelection(task) {
    return Boolean(selectedRecordValue(task));
  }

  function meaningfulValue(task) {
    for (const candidate of [task?.instructionValue, task?.value,
      task?.selectedCaption]) {
      const value = text(candidate).replace(/^\*\*|\*\*$/gu, "");
      if (value && !/^\[.+\]$/u.test(value) &&
          !CUSTOMER_LOOKUP.test(value) && !RECORD_SELECTION.test(value)) {
        return value.replace(/^['"“]|['"”]$/gu, "");
      }
    }
    return "";
  }

  function unique(values) {
    return [...new Set(values.filter(value => value !== undefined &&
      value !== null && value !== ""))];
  }

  function consolidateCustomerRun(run) {
    const explicit = run.map(selectedRecordValue).find(Boolean);
    const fallback = [...run].reverse().map(meaningfulValue).find(Boolean);
    const value = explicit || fallback || "";
    const screenshot = [...run].reverse().map(task => task.screenshot)
      .find(Boolean) || null;
    const screenshots = unique([...run].reverse().flatMap(task =>
      task.screenshots?.length ? task.screenshots : task.screenshot
        ? [task.screenshot] : []));
    const first = run[0];
    return {
      ...clone(first),
      taskType: "SelectCustomer",
      semanticAction: "SelectCustomer",
      fieldCaption: first.fieldCaption || "Kund",
      selectedCaption: value,
      value,
      instructionValue: value,
      instruction: value ? `Välj kund **${value}**.` : "Välj kund.",
      description: value ? `Välj kund **${value}**.` : "Välj kund.",
      screenshot,
      screenshots: screenshot ? [screenshot] : screenshots.slice(0, 1),
      sourceStepNos: unique(run.flatMap(task => task.sourceStepNos || [])),
      sourceEventNos: unique(run.flatMap(task => task.sourceEventNos || [])),
      sourceTaskIds: unique(run.map(task => task.taskId)),
      consolidation: {
        type: "customer-selection",
        sourceTaskCount: run.length
      }
    };
  }

  function consolidate(tasks = []) {
    const input = Array.isArray(tasks) ? tasks : [];
    const result = [];
    let index = 0;
    while (index < input.length) {
      if (!customerTask(input[index])) {
        result.push(clone(input[index]));
        index += 1;
        continue;
      }
      const run = [input[index]];
      let cursor = index + 1;
      while (cursor < input.length && (customerTask(input[cursor]) ||
          lookupHelper(input[cursor]) || recordSelection(input[cursor]))) {
        run.push(input[cursor]);
        cursor += 1;
      }
      result.push(run.length > 1 ? consolidateCustomerRun(run) : clone(run[0]));
      index = cursor;
    }
    return result.map((task, taskIndex) => ({ ...task,
      taskNo: taskIndex + 1,
      taskId: `${task.taskType || "Task"}-${String(taskIndex + 1).padStart(3, "0")}`
    }));
  }

  return { consolidate, customerTask, lookupHelper, selectedRecordValue };
});
