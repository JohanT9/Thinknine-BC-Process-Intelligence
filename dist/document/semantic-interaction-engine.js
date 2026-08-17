(function (root, factory) {
  const sourceReference = typeof module === "object" && module.exports
    ? require("../engine/source-reference") : root.T9SourceReference;
  const api = factory(sourceReference);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9SemanticInteractionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (sourceReference) {
  const ENGINE_VERSION = "1.0.0";
  const documentCache = new WeakMap();

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function interactionText(value) {
    return [value?.fieldCaption, value?.actionCaption, value?.selectedCaption,
      value?.instruction, value?.description,
      ...(value?.identifications || []).flatMap(identification => [
        identification?.page?.caption,
        identification?.control?.caption,
        identification?.action?.caption
      ]), value?.targetControl?.controlIdentity,
      value?.targetControl?.automationId,
      value?.targetControl?.fieldSemanticHint].map(text).join(" ");
  }

  function controlCaption(value) {
    return text(value?.fieldCaption) || text(
      value?.identifications?.find(item => item?.control?.caption)
        ?.control?.caption
    );
  }

  function unique(values) {
    return [...new Set(values.filter(value => value !== undefined &&
      value !== null && value !== ""))];
  }

  const RECORD_SELECTION = /^(?:välj posten|select record)\s+["“]?(.+?)["”]?\.?$/iu;
  const EMBEDDED_RECORD_SELECTION = /(?:välj posten|select record)\s+["“]([^"”]+)["”]/iu;
  const LOOKUP = /(?:välj|select)(?: ett)? värde för|select a value for/iu;

  function selectedRecordValue(value) {
    for (const candidate of [value?.selectedCaption, value?.actionCaption,
      value?.instruction, value?.description]) {
      const match = text(candidate).replace(/\*\*/gu, "").match(RECORD_SELECTION);
      if (match) return match[1].replace(/["“”]+$/gu, "").trim();
      const embedded = text(candidate).replace(/\*\*/gu, "")
        .match(EMBEDDED_RECORD_SELECTION);
      if (embedded) return embedded[1].trim();
    }
    return "";
  }

  function meaningfulValue(value) {
    for (const candidate of [value?.instructionValue, value?.value,
      value?.selectedCaption]) {
      const result = text(candidate).replace(/^\*\*|\*\*$/gu, "");
      if (result && !/^\[.+\]$/u.test(result) && !LOOKUP.test(result) &&
          !RECORD_SELECTION.test(result)) {
        return result.replace(/^['"“]|['"”]$/gu, "");
      }
    }
    return "";
  }

  function fieldMatches(value, pattern) {
    return pattern.test(interactionText(value));
  }

  function typed(value) {
    return (value?.normalizedInteractions || []).some(item =>
      item.kind === "value-change"
    ) || (value?.inputSources || []).includes("input");
  }

  function focusOnly(value) {
    const sources = value?.inputSources || [];
    return value?.taskType === "ChangeField" && sources.length > 0 &&
      !sources.includes("input") && !meaningfulValue(value);
  }

  function businessField(value) {
    return text(value).replace(/^(?:sortera efter|sort by)\s+/iu, "");
  }

  function checkboxEnabled(value, selectedValue) {
    if (typeof value?.value === "boolean") return value.value;
    return /true|ja|yes|1/iu.test(selectedValue);
  }

  function stableId(ruleId, values) {
    if (values.length === 1 && text(values[0]?.semanticActionModel?.actionId)) {
      return values[0].semanticActionModel.actionId;
    }
    const traced = sourceReference.stableIdentity(sourceReference.merge(
      ...values.map(value => ({ sourceEventIds: value.sourceEventIds,
        sourceEventNos: value.sourceEventNos,
        normalizedEventIds: value.normalizedEventIds,
        stepGroupIds: value.stepGroupIds || (value.stepGroups || [])
          .map(group => group.stepGroupId) }))
    ), "");
    const source = traced || values.map((value, index) =>
      text(value.semanticActionModel?.actionId) || text(value.taskId) ||
      `interaction-${index + 1}`).join("|");
    return `semantic:${ruleId}:${source}`;
  }

  function rawData(values) {
    return values.flatMap(value => value.semanticActionModel?.rawInteractions
      ? clone(value.semanticActionModel.rawInteractions) : [clone(value)]);
  }

  function sourceData(values) {
    const canonical = sourceReference.merge(...values.map(value => ({
      recordingId: value.recordingId,
      sourceEventIds: value.semanticActionModel?.sourceEventIds ||
        value.sourceEventIds || (value.stepGroups || []).flatMap(group =>
          group.sourceEventIds || []),
      sourceEventNos: value.semanticActionModel?.sourceEventNos || value.sourceEventNos,
      normalizedEventIds: value.semanticActionModel?.normalizedEventIds ||
        value.normalizedEventIds || (value.stepGroups || []).flatMap(group =>
          group.normalizedEventIds || []),
      stepGroupIds: value.semanticActionModel?.stepGroupIds ||
        value.stepGroupIds || (value.stepGroups || []).map(group => group.stepGroupId),
      semanticActionIds: value.semanticActionIds
    })));
    return {
      sourceTaskIds: unique(values.flatMap(value =>
        value.semanticActionModel?.sourceTaskIds || (value.sourceTaskIds?.length
          ? value.sourceTaskIds : value.taskId ? [value.taskId] : []))),
      sourceStepNos: unique(values.flatMap(value =>
        value.semanticActionModel?.sourceStepNos || value.sourceStepNos || [])),
      ...canonical,
      sourceEventNos: unique(values.flatMap(value =>
        value.semanticActionModel?.sourceEventNos || value.sourceEventNos || [])),
      screenshotRefs: unique(values.flatMap(value =>
        value.semanticActionModel?.screenshotRefs || (value.screenshots?.length
          ? value.screenshots : value.screenshot ? [value.screenshot] : []))),
      annotationRefs: unique(values.flatMap(value => value.annotationRefs || [])
        .map(value => JSON.stringify(value))).map(value => JSON.parse(value))
    };
  }

  function action(rule, values, properties) {
    const sources = sourceData(values);
    const futureMetadata = clone(values[0]?.semanticActionModel ||
      values[0]?.semanticActionMetadata || {});
    return deepFreeze({
      ...futureMetadata,
      actionId: stableId(rule.ruleId, values),
      actionType: properties.actionType,
      displayText: properties.displayText,
      ...(properties.hidden ? { hidden: true } : {}),
      selectedValue: properties.selectedValue || "",
      targetField: properties.targetField || "",
      ...(properties.preferredSourceEventId
        ? { preferredSourceEventId: properties.preferredSourceEventId } : {}),
      ...(properties.preferredScreenshotRef
        ? { preferredScreenshotRef: properties.preferredScreenshotRef } : {}),
      ...sources,
      rawInteractions: rawData(values),
      inputInteractionCount: values.length,
      ruleId: rule.ruleId,
      rulePriority: rule.priority,
      engineVersion: ENGINE_VERSION
    });
  }

  function selectionRule(config) {
    const fieldPattern = config.fieldPattern;
    const rule = {
      ruleId: config.ruleId,
      priority: config.priority,
      match(context) {
        const value = context.interactions[context.index];
        return value?.taskType === config.actionType ||
          value?.semanticAction === config.actionType ||
          fieldMatches(value, fieldPattern) || Boolean(config.extraMatch?.(value));
      },
      consolidate(context) {
        const values = [context.interactions[context.index]];
        let cursor = context.index + 1;
        while (cursor < context.interactions.length) {
          const candidate = context.interactions[cursor];
          const isRelated = fieldMatches(candidate, fieldPattern) ||
            Boolean(config.extraMatch?.(candidate)) ||
            ["Select", "SelectOption", "SelectLookupValue"].includes(
              candidate?.taskType || candidate?.semanticAction) ||
            LOOKUP.test(interactionText(candidate)) ||
            Boolean(selectedRecordValue(candidate));
          if (!isRelated) break;
          values.push(candidate);
          cursor += 1;
        }
        if (config.consumeFocusAfter) {
          while (cursor < context.interactions.length &&
              focusOnly(context.interactions[cursor])) {
            values.push(context.interactions[cursor]);
            cursor += 1;
          }
        }
        const explicitSelection = [...values].reverse().find(value =>
          ["Select", "SelectOption", "SelectLookupValue"].includes(
            value?.taskType || value?.semanticAction) &&
          meaningfulValue({ selectedCaption: value?.selectedCaption })
        );
        const selectedValue = values.map(selectedRecordValue).find(Boolean) ||
          meaningfulValue({ selectedCaption: explicitSelection?.selectedCaption }) ||
          [...values].reverse().map(meaningfulValue).find(Boolean) || "";
        return {
          consumed: values.length,
          action: action(rule, values, {
            actionType: config.actionType,
            displayText: selectedValue
              ? `${config.verb} **${selectedValue}**.` : `${config.verb}.`,
            selectedValue,
            targetField: config.targetField,
            hidden: config.requireValue && !selectedValue
          })
        };
      }
    };
    return deepFreeze(rule);
  }

  function singleRule(config) {
    const rule = {
      ruleId: config.ruleId,
      priority: config.priority,
      match(context) {
        return config.match(context.interactions[context.index]);
      },
      consolidate(context) {
        const value = context.interactions[context.index];
        const selectedValue = meaningfulValue(value);
        return { consumed: 1, action: action(rule, [value], {
          actionType: config.actionType(value, selectedValue),
          displayText: config.display(value, selectedValue),
          selectedValue,
          targetField: config.targetField || text(value.fieldCaption)
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function genericLookupRule() {
    const rule = {
      ruleId: "generic-lookup",
      priority: 20,
      match(context) {
        const current = context.interactions[context.index];
        const next = context.interactions[context.index + 1];
        return LOOKUP.test(interactionText(current)) ||
          (focusOnly(current) && Boolean(selectedRecordValue(next)));
      },
      consolidate(context) {
        const first = context.interactions[context.index];
        const values = [first];
        let cursor = context.index + 1;
        while (cursor < context.interactions.length &&
            (LOOKUP.test(interactionText(context.interactions[cursor])) ||
             Boolean(selectedRecordValue(context.interactions[cursor])))) {
          values.push(context.interactions[cursor]);
          cursor += 1;
        }
        const selectedValue = values.map(selectedRecordValue).find(Boolean) || "";
        if (selectedValue && cursor < context.interactions.length) {
          const result = context.interactions[cursor];
          if (result?.taskType === "ChangeField" &&
              text(result.fieldCaption) === text(first.fieldCaption) &&
              meaningfulValue(result) === selectedValue) {
            values.push(result);
          }
        }
        const targetField = businessField(first.fieldCaption);
        return { consumed: values.length, action: action(rule, values, {
          actionType: "SelectLookupValue",
          displayText: selectedValue
            ? targetField
              ? `Välj ${targetField} **${selectedValue}**.`
              : `Välj värde **${selectedValue}**.`
            : "Välj värde.",
          selectedValue,
          targetField,
          hidden: !selectedValue
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function focusTransitionRule() {
    const rule = {
      ruleId: "focus-transition",
      priority: 1,
      match(context) {
        return focusOnly(context.interactions[context.index]);
      },
      consolidate(context) {
        const value = context.interactions[context.index];
        return { consumed: 1, action: action(rule, [value], {
          actionType: "FocusTransition",
          displayText: "",
          targetField: text(value.fieldCaption),
          hidden: true
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function itemNumberLookupEntryRule() {
    const sortingNumber = value => /^(?:sortera efter|sort by)\s+nr\.?$/iu
      .test(controlCaption(value));
    const rule = {
      ruleId: "item-number-lookup-entry",
      priority: 97,
      match(context) {
        const current = context.interactions[context.index];
        const selected = context.interactions[context.index + 1];
        const result = context.interactions[context.index + 2];
        const selectedValue = selectedRecordValue(selected);
        return ["EnterFieldValue", "ChangeField"].includes(current?.taskType) &&
          sortingNumber(current) && selected?.taskType === "RunAction" &&
          Boolean(selectedValue) &&
          ["EnterFieldValue", "ChangeField"].includes(result?.taskType) &&
          sortingNumber(result) && meaningfulValue(result) === selectedValue;
      },
      consolidate(context) {
        const values = context.interactions.slice(context.index,
          context.index + 3);
        const selectedValue = selectedRecordValue(values[1]);
        return { consumed: 3, action: action(rule, values, {
          actionType: "EnterItemNumber",
          displayText: `Ange __${selectedValue}__ i **Artikel Nr**.`,
          selectedValue, targetField: "Artikel Nr"
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function salesPriceDiscountMenuPathRule() {
    const captions = [
      /^(?:välj\s+)?rad$/iu,
      /^(?:relaterad information|related information)$/iu,
      /^(?:tillämpat försäljningspris och rabatt|applied sales price and discount)$/iu
    ];
    const isAction = value => ["RunAction", "ClickAction"].includes(
      value?.taskType
    );
    const caption = value => text(value?.actionCaption) ||
      text(value?.selectedCaption);
    const rule = {
      ruleId: "sales-price-discount-menu-path",
      priority: 110,
      match(context) {
        return captions.every((pattern, offset) => {
          const value = context.interactions[context.index + offset];
          return isAction(value) && pattern.test(caption(value));
        });
      },
      consolidate(context) {
        const values = context.interactions.slice(context.index,
          context.index + captions.length);
        return { consumed: values.length, action: action(rule, values, {
          actionType: "RunActionPath",
          displayText: "Välj **Rad** → **Relaterad information** → " +
            "**Tillämpat försäljningspris och rabatt**.",
          selectedValue: caption(values.at(-1))
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function manualPriceMenuPathRule() {
    const captions = [
      /^(?:välj\s+)?(?:åtgärder|actions)$/iu,
      /^(?:välj\s+)?(?:funktion|function|functions)$/iu,
      /^(?:välj\s+)?(?:manuellt pris|manual price)/iu
    ];
    const isAction = value => ["RunAction", "ClickAction"].includes(
      value?.taskType
    );
    const caption = value => text(value?.actionCaption) ||
      text(value?.selectedCaption);
    const rule = {
      ruleId: "manual-price-menu-path",
      priority: 110,
      match(context) {
        return captions.every((pattern, offset) => {
          const value = context.interactions[context.index + offset];
          return isAction(value) && pattern.test(caption(value));
        });
      },
      consolidate(context) {
        const values = context.interactions.slice(context.index,
          context.index + captions.length);
        const menuEvidence = values[1];
        const preferredScreenshots = menuEvidence?.semanticActionModel
          ?.screenshotRefs || menuEvidence?.screenshots ||
          (menuEvidence?.screenshot ? [menuEvidence.screenshot] : []);
        return { consumed: values.length, action: action(rule, values, {
          actionType: "RunActionPath",
          displayText: "Välj **Åtgärder** → **Funktion** → **Manuellt pris**.",
          selectedValue: caption(values.at(-1)),
          preferredSourceEventId: menuEvidence?.sourceEventIds?.at(-1),
          preferredScreenshotRef: preferredScreenshots.at(-1)
        }) };
      }
    };
    return deepFreeze(rule);
  }

  const CUSTOMER = /kundens namn|kundnr|customer name|customer\s*no\.?/iu;
  const ITEM = /artikelnr|artikelnummer|item\s*no\.?/iu;
  const VENDOR = /leverantör(?:ens namn|snr|snummer)?|vendor(?:\s*name|\s*no\.?)?/iu;
  const LOCATION = /lagerställe|location(?: code)?/iu;
  const DIMENSION = /dimension|dimensionsvärde|dimension value/iu;

  const BUILT_IN_RULES = deepFreeze([
    salesPriceDiscountMenuPathRule(),
    manualPriceMenuPathRule(),
    selectionRule({ ruleId: "customer-selection", priority: 100,
      actionType: "SelectCustomer", fieldPattern: CUSTOMER,
      verb: "Välj kund", targetField: "Kund", requireValue: true }),
    itemNumberLookupEntryRule(),
    selectionRule({ ruleId: "item-selection", priority: 95,
      actionType: "SelectItem", fieldPattern: ITEM, verb: "Välj artikel",
      targetField: "Artikelnummer", consumeFocusAfter: true,
      requireValue: true,
      extraMatch: value => value?.entity === "Item" &&
        /sortera efter nr|sort by no\.?/iu.test(interactionText(value)) }),
    selectionRule({ ruleId: "vendor-selection", priority: 90,
      actionType: "SelectVendor", fieldPattern: VENDOR,
      verb: "Välj leverantör", targetField: "Leverantör", requireValue: true }),
    selectionRule({ ruleId: "location-selection", priority: 85,
      actionType: "SelectLocation", fieldPattern: LOCATION,
      verb: "Välj lagerställe", targetField: "Lagerställe", requireValue: true }),
    selectionRule({ ruleId: "dimension-selection", priority: 80,
      actionType: "SelectDimension", fieldPattern: DIMENSION,
      verb: "Välj dimensionsvärde", targetField: "Dimension", requireValue: true }),
    singleRule({ ruleId: "quantity-entry", priority: 75,
      match: value => Boolean(meaningfulValue(value)) &&
        /^(?:sortera efter\s+)?(?:antal|quantity)$/iu
          .test(controlCaption(value)),
      actionType: () => "EnterQuantity",
      targetField: "Antal",
      display: (_value, selected) => selected
        ? `Ange __${selected}__ i **Antal**.` : "Ange Antal." }),
    singleRule({ ruleId: "date-selection", priority: 70,
      match: value => typed(value) && /datum|date/iu.test(text(value?.fieldCaption)),
      actionType: () => "SelectDate",
      display: (value, selected) => selected
        ? `Ange __${selected}__ i **${text(value.fieldCaption)}**.`
        : `Ange ${text(value.fieldCaption)}.` }),
    singleRule({ ruleId: "checkbox", priority: 60,
      match: value => /checkbox|toggle|boolean/iu.test(text(value?.taskType)) ||
        typeof value?.value === "boolean",
      actionType: (value, selected) => checkboxEnabled(value, selected)
        ? "EnableCheckbox" : "DisableCheckbox",
      display: (value, selected) =>
        `${checkboxEnabled(value, selected) ? "Aktivera" : "Inaktivera"} ` +
        `**${text(value.fieldCaption)}**.` }),
    singleRule({ ruleId: "option-selection", priority: 50,
      match: value => /selectoption|option|dropdown|combobox/iu
        .test(text(value?.taskType)),
      actionType: () => "SelectOption",
      display: (value, selected) => selected
        ? `Välj **${selected}** i **${text(value.fieldCaption)}**.`
        : `Välj ett alternativ i **${text(value.fieldCaption)}**.` }),
    genericLookupRule(),
    singleRule({ ruleId: "generic-field-entry", priority: 10,
      match: value => value?.taskType === "EnterFieldValue" ||
        (value?.taskType === "ChangeField" &&
          (typed(value) || Boolean(meaningfulValue(value)))),
      actionType: () => "EnterFieldValue",
      display: (value, selected) => selected
        ? `Ange __${selected}__ i **${text(value.fieldCaption)}**.`
        : `Fyll i **${text(value.fieldCaption)}**.` }),
    focusTransitionRule()
  ]);

  function registry(rules = BUILT_IN_RULES) {
    return deepFreeze([...rules].map(value => value).sort((left, right) =>
      right.priority - left.priority));
  }

  function processInteractions(values = [], rules = BUILT_IN_RULES) {
    const interactions = Array.isArray(values) ? clone(values) : [];
    const ordered = registry(rules);
    const actions = [];
    let index = 0;
    while (index < interactions.length) {
      const context = { interactions, index };
      const matches = ordered.filter(rule => rule.match(context));
      const highest = matches[0]?.priority;
      const winners = matches.filter(rule => rule.priority === highest);
      if (winners.length !== 1) {
        actions.push(deepFreeze({ passthrough: true,
          rawInteractions: [clone(interactions[index])] }));
        index += 1;
        continue;
      }
      const result = winners[0].consolidate(context);
      if (!result?.action || !Number.isInteger(result.consumed) ||
          result.consumed < 1) {
        actions.push(deepFreeze({ passthrough: true,
          rawInteractions: [clone(interactions[index])] }));
        index += 1;
        continue;
      }
      actions.push(result.action);
      index += result.consumed;
    }
    return deepFreeze(actions);
  }

  function interactionFromStepGroup(group) {
    const primary = group?.primaryNormalizedEvent || {};
    const control = group?.controlContext || primary.controlIdentification || {};
    const action = group?.actionContext || primary.actionIdentification || {};
    const types = {
      "field-edit": "ChangeField", "lookup-interaction": "Select",
      selection: "SelectOption", "toggle-interaction": "Checkbox",
      action: "RunAction", navigation: "Navigate",
      "dialog-interaction": "Dialog", "row-interaction": "Select"
    };
    const selectedEvent = [...(group?.evidence || [])].reverse().find(item =>
      item.kind === "selection-change");
    const selectedMechanic = (group?.normalizedEvents || []).find(item =>
      item.normalizedEventId === selectedEvent?.normalizedEventId);
    const selected = selectedMechanic?.selection?.value ??
      selectedMechanic?.selection?.caption ?? primary.selection?.value ??
      primary.selection?.caption ?? primary.value?.normalized ?? "";
    return {
      kind: group.groupKind,
      taskId: group.stepGroupId,
      taskType: types[group.groupKind] || "Unclassified",
      fieldCaption: control.caption || "",
      actionCaption: action.caption || "",
      selectedCaption: selected ? String(selected) : "",
      selectedValue: selected,
      targetControl: clone(control),
      value: primary.value?.normalized ?? primary.state?.checked ?? selected,
      inputSources: primary.subtype ? [primary.subtype] : [],
      sourceEventIds: group.sourceEventIds || [],
      normalizedEventIds: group.normalizedEventIds || [],
      stepGroupIds: group.stepGroupId ? [group.stepGroupId] : [],
      recordingId: group.recordingId,
      stepGroups: [group],
      normalizedInteractions: [primary]
    };
  }

  function processStepGroups(groups = [], rules = BUILT_IN_RULES) {
    return processInteractions(groups.map(interactionFromStepGroup), rules);
  }

  function actionToInteraction(value) {
    if (value.passthrough) return clone(value.rawInteractions[0]);
    const first = clone(value.rawInteractions[0] || {});
    const screenshot = value.preferredScreenshotRef ||
      value.screenshotRefs[value.screenshotRefs.length - 1] || null;
    return {
      ...first,
      taskType: value.actionType,
      semanticAction: value.actionType,
      semanticActionModel: clone(value),
      instruction: value.displayText,
      description: value.displayText,
      fieldCaption: value.targetField || first.fieldCaption,
      selectedCaption: value.selectedValue,
      value: value.selectedValue,
      instructionValue: value.selectedValue,
      screenshot,
      screenshots: screenshot ? [screenshot] : [],
      sourceTaskIds: clone(value.sourceTaskIds),
      sourceStepNos: clone(value.sourceStepNos),
      sourceEventNos: clone(value.sourceEventNos),
      sourceEventIds: clone(value.sourceEventIds),
      normalizedEventIds: clone(value.normalizedEventIds),
      stepGroupIds: clone(value.stepGroupIds),
      semanticActionIds: [value.actionId],
      rawInteractions: clone(value.rawInteractions),
      consolidation: { type: value.ruleId,
        sourceTaskCount: value.rawInteractions.length }
    };
  }

  function consolidateInteractions(values, rules) {
    return processInteractions(values, rules).filter(value => !value.hidden)
      .map(actionToInteraction);
  }

  function instructionBlock(step) {
    return (step.blocks || []).find(block => block.kind === "paragraph");
  }

  function processDocument(documentValue, rules = BUILT_IN_RULES) {
    if (rules === BUILT_IN_RULES && documentValue &&
        typeof documentValue === "object" && documentCache.has(documentValue)) {
      return documentCache.get(documentValue);
    }
    const document = clone(documentValue || {});
    document.sections = (document.sections || []).map(section => {
      if (section.kind !== "workflow") return section;
      const prefix = [];
      const steps = [];
      (section.blocks || []).forEach(block =>
        block.kind === "step" ? steps.push(block) : prefix.push(block));
      const interactions = steps.map(step => ({
        ...(clone(step.interaction || {})),
        taskId: step.sourceRef?.taskId || step.interaction?.taskId,
        sourceEventIds: step.sourceRef?.sourceEventIds ||
          step.interaction?.sourceEventIds || [],
        sourceEventNos: step.sourceRef?.legacyEventNos ||
          step.interaction?.sourceEventNos || [],
        normalizedEventIds: step.sourceRef?.normalizedEventIds || [],
        stepGroupIds: step.sourceRef?.stepGroupIds || [],
        instruction: instructionBlock(step)?.text || step.interaction?.instruction,
        screenshots: (step.blocks || []).filter(block => block.kind === "image")
          .map(block => block.sourceRef?.screenshotRef).filter(Boolean),
        annotationRefs: (step.blocks || []).filter(block => block.kind === "image")
          .flatMap(block => block.annotationRefs || [])
      }));
      const actions = processInteractions(interactions, rules);
      let stepIndex = 0;
      const suppressedInteractions = [];
      const semanticSteps = actions.map(entry => {
        const consumed = entry.inputInteractionCount || 1;
        const sourceSteps = steps.slice(stepIndex, stepIndex + consumed);
        stepIndex += consumed;
        if (instructionBlock(sourceSteps[0])?.preserveUserText) {
          return clone(sourceSteps[0]);
        }
        if (entry.passthrough) return clone(sourceSteps[0]);
        if (entry.hidden) {
          suppressedInteractions.push(clone(entry));
          return null;
        }
        const first = clone(sourceSteps[0]);
        const firstInstruction = instructionBlock(first);
        if (firstInstruction) firstInstruction.text = entry.displayText;
        const extraBlocks = sourceSteps.slice(1).flatMap(step =>
          (step.blocks || []).filter(block => block.kind !== "paragraph"));
        first.blocks = [...(first.blocks || []), ...clone(extraBlocks)];
        first.stepNumber = 0;
        first.sourceRef = { ...clone(first.sourceRef || {}),
          sourceTaskIds: clone(entry.sourceTaskIds),
          ...sourceReference.merge(first.sourceRef, entry, {
            semanticActionIds: [entry.actionId]
          }) };
        first.semanticAction = clone(entry);
        delete first.interaction;
        return first;
      }).filter(Boolean);
      semanticSteps.forEach((step, index) => { step.stepNumber = index + 1; });
      return { ...section, blocks: [...prefix, ...semanticSteps],
        ...(suppressedInteractions.length
          ? { suppressedInteractions } : {}) };
    });
    document.provenance = {
      ...clone(document.provenance || {}),
      transformations: unique([
        ...(document.provenance?.transformations || []),
        "semantic-interaction-rules"
      ]),
      semanticInteractionEngineVersion: ENGINE_VERSION
    };
    const result = deepFreeze(document);
    if (rules === BUILT_IN_RULES && documentValue &&
        typeof documentValue === "object") {
      documentCache.set(documentValue, result);
    }
    return result;
  }

  return {
    BUILT_IN_RULES,
    ENGINE_VERSION,
    consolidateInteractions,
    processDocument,
    processInteractions,
    processStepGroups,
    registry,
    selectedRecordValue
  };
});
