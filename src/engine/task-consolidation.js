(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TaskConsolidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CUSTOMER_FIELD = /kundens namn|kundnr|customer name|customer no\.?/iu;
  const CUSTOMER_LOOKUP = /välj ett värde för\s+(?:kundens namn|kundnr)|select a value for\s+(?:customer name|customer no\.?)/iu;
  const ITEM_FIELD = /artikelnr|artikelnummer|item no\.?/iu;
  const ITEM_LOOKUP = /välj ett värde för\s+(?:artikelnr|artikelnummer|nr)|select a value for\s+(?:item no\.?|no\.?)/iu;
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

  function itemTask(task) {
    return task?.taskType === "SelectItem" ||
      task?.semanticAction === "SelectItem" ||
      ITEM_FIELD.test(taskText(task)) ||
      (task?.entity === "Item" &&
        /sortera efter nr|sort by no\.?/iu.test(taskText(task)));
  }

  function itemLookupHelper(task) {
    return ITEM_LOOKUP.test(taskText(task));
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

  function consolidateItemRun(run) {
    const explicit = run.map(selectedRecordValue).find(Boolean);
    const fallback = [...run].reverse().map(meaningfulValue).find(Boolean);
    const value = explicit || fallback || "";
    const screenshot = [...run].reverse().map(task => task.screenshot)
      .find(Boolean) || null;
    const first = run[0];
    return {
      ...clone(first),
      taskType: "SelectItem",
      semanticAction: "SelectItem",
      entity: "Item",
      fieldCaption: "Artikelnummer",
      selectedCaption: value,
      value,
      instructionValue: value,
      instruction: value ? `Välj artikel **${value}**.` : "Välj artikel.",
      description: value ? `Välj artikel **${value}**.` : "Välj artikel.",
      screenshot,
      screenshots: screenshot ? [screenshot] : [],
      sourceStepNos: unique(run.flatMap(task => task.sourceStepNos || [])),
      sourceEventNos: unique(run.flatMap(task => task.sourceEventNos || [])),
      sourceTaskIds: unique(run.map(task => task.taskId)),
      inputSources: unique(run.flatMap(task => task.inputSources || [])),
      consolidation: { type: "item-selection", sourceTaskCount: run.length }
    };
  }

  function consolidateItems(tasks) {
    const result = [];
    let index = 0;
    while (index < tasks.length) {
      if (!itemTask(tasks[index])) {
        result.push(clone(tasks[index]));
        index += 1;
        continue;
      }
      const run = [tasks[index]];
      let cursor = index + 1;
      while (cursor < tasks.length && (itemTask(tasks[cursor]) ||
          itemLookupHelper(tasks[cursor]) || recordSelection(tasks[cursor]))) {
        run.push(tasks[cursor]);
        cursor += 1;
      }
      result.push(run.length > 1 ? consolidateItemRun(run) : clone(run[0]));
      index = cursor;
    }
    return result;
  }

  function normalizeQuantity(task) {
    const caption = text(task.fieldCaption);
    const typed = (task.inputSources || []).includes("input");
    if (!typed || !/^(?:sortera efter\s+)?(?:antal|quantity)$/iu.test(caption)) {
      return clone(task);
    }
    const value = text(task.value || task.instructionValue);
    return { ...clone(task), fieldCaption: "Antal", instructionValue: value,
      instruction: value ? `Ange **${value}** i **Antal**.` : "Ange Antal.",
      description: value ? `Ange **${value}** i **Antal**.` : "Ange Antal." };
  }

  function removePostItemFocusNoise(tasks) {
    const result = [];
    let afterItem = false;
    for (const task of tasks) {
      if (task.consolidation?.type === "item-selection") {
        result.push(clone(task));
        afterItem = true;
        continue;
      }
      const inputSources = task.inputSources || [];
      const typed = inputSources.includes("input");
      if (afterItem && task.taskType === "ChangeField" &&
          inputSources.length && !typed) {
        continue;
      }
      result.push(normalizeQuantity(task));
      if (typed || task.taskType !== "ChangeField") afterItem = false;
    }
    return result;
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
    const consolidated = removePostItemFocusNoise(consolidateItems(result));
    return consolidated.map((task, taskIndex) => ({ ...task,
      taskNo: taskIndex + 1,
      taskId: `${task.taskType || "Task"}-${String(taskIndex + 1).padStart(3, "0")}`
    }));
  }

  return { consolidate, customerTask, itemTask, lookupHelper,
    selectedRecordValue };
});
