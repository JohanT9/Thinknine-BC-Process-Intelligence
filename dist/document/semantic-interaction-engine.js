(function (root, factory) {
  const sourceReference = typeof module === "object" && module.exports
    ? require("../engine/source-reference") : root.T9SourceReference;
  const api = factory(sourceReference);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9SemanticInteractionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (sourceReference) {
  const ENGINE_VERSION = "1.1.0";
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

  function recordedInteractionIds(value) {
    return unique([
      ...(value?.interactionIds || []),
      value?.interactionId,
      ...(value?.capturePackets || []).flatMap(packet =>
        packet?.interactionIds || [packet?.interactionId]),
      ...(value?.capturePacket?.interactionIds || []),
      value?.capturePacket?.interactionId,
      ...(value?.stepGroups || []).flatMap(group =>
        group?.interactionIds || [group?.capturePacket?.interactionId])
    ]);
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
    const preferredSourceEventId = [...values].reverse().map(value =>
      value.semanticActionModel?.preferredSourceEventId ||
        value.preferredSourceEventId || value.capturePacket?.preferredSourceEventId ||
        value.stepGroups?.at(-1)?.capturePacket?.preferredSourceEventId)
      .find(Boolean);
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
      ...(preferredSourceEventId ? { preferredSourceEventId } : {}),
      annotationRefs: unique(values.flatMap(value => value.annotationRefs || [])
        .map(value => JSON.stringify(value))).map(value => JSON.parse(value))
    };
  }

  function action(rule, values, properties) {
    const sources = sourceData(values);
    const futureMetadata = clone(values[0]?.semanticActionModel ||
      values[0]?.semanticActionMetadata || {});
    const first = values[0] || {};
    const page = clone(first.pageContext || first.pageIdentification || {});
    const captureGuidance = values.reduce((result, value) => ({
      important: result.important || Boolean(value.captureGuidance?.important),
      ignored: result.ignored || Boolean(value.captureGuidance?.ignored),
      sectionBoundaryAfter: result.sectionBoundaryAfter ||
        Boolean(value.captureGuidance?.sectionBoundaryAfter),
      preferredScreenshotAssetId: value.captureGuidance
        ?.preferredScreenshotAssetId || result.preferredScreenshotAssetId || null,
      markerSourceEventIds: unique([...(result.markerSourceEventIds || []),
        ...(value.captureGuidance?.markerSourceEventIds || [])])
    }), {});
    const resultVerification = values.map(value =>
      value.resultVerification || value.capturePacket?.resultVerification ||
      value.stepGroups?.at(-1)?.capturePacket?.resultVerification
    ).filter(Boolean).at(-1);
    const capturePackets = values.flatMap(value => value.capturePackets?.length
      ? value.capturePackets : value.capturePacket ? [value.capturePacket]
        : (value.stepGroups || []).map(group => group.capturePacket).filter(Boolean));
    const packetInteractionIds = unique(capturePackets.flatMap(packet =>
      packet.interactionIds || [packet.interactionId]));
    return deepFreeze({
      ...futureMetadata,
      actionId: stableId(rule.ruleId, values),
      actionType: properties.actionType,
      displayText: properties.displayText,
      ...(Array.isArray(properties.actionPath)
        ? { actionPath: clone(properties.actionPath) } : {}),
      ...(properties.hidden ? { hidden: true } : {}),
      selectedValue: properties.selectedValue || "",
      targetField: properties.targetField || "",
      captureGuidance,
      ...(capturePackets.length ? { capturePackets: clone(capturePackets) } : {}),
      ...(capturePackets.length === 1
        ? { capturePacket: clone(capturePackets[0]) } : {}),
      ...(packetInteractionIds.length
        ? { interactionIds: packetInteractionIds,
          interactionId: packetInteractionIds.length === 1
            ? packetInteractionIds[0] : null } : {}),
      ...(resultVerification ? { resultVerification: clone(resultVerification) } : {}),
      ...(Object.keys(page).length ? { pageContext: page,
        pageIdentification: clone(page),
        pageIdentity: page.pageIdentity || null,
        pageObjectId: page.pageObjectId || null,
        pageId: page.legacyPageId || page.pageId || page.id || "",
        pageCaption: page.pageCaption || page.caption || page.name || "",
        entity: page.entity || "", pageConfidence: page.confidence ?? null,
        pageIdentificationSource: page.source || "" } : {}),
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
        const targetField = businessField(config.targetField || value.fieldCaption);
        return { consumed: 1, action: action(rule, [value], {
          actionType: config.actionType(value, selectedValue),
          displayText: config.display(value, selectedValue),
          selectedValue,
          targetField
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

  function fieldEntryWithRedundantRecordSelectionRule() {
    const comparable = value => text(value).replace(/[.:]+$/gu, "")
      .toLocaleLowerCase();
    const rule = {
      ruleId: "field-entry-with-redundant-record-selection",
      priority: 96,
      match(context) {
        const current = context.interactions[context.index];
        const selected = context.interactions[context.index + 1];
        const enteredValue = meaningfulValue(current);
        const selectedValue = selectedRecordValue(selected);
        const field = comparable(businessField(controlCaption(current)));
        const selectionText = comparable(interactionText(selected));
        return ["EnterFieldValue", "ChangeField"].includes(current?.taskType) &&
          ["RunAction", "Select"].includes(selected?.taskType) &&
          Boolean(field && enteredValue && selectedValue) &&
          selectedValue.toLocaleLowerCase().startsWith(
            enteredValue.toLocaleLowerCase()
          ) && selectionText.includes(field) &&
          /sorterade|sorted/iu.test(selectionText);
      },
      consolidate(context) {
        const values = context.interactions.slice(context.index,
          context.index + 2);
        const current = values[0];
        const selected = values[1];
        const selectedValue = selectedRecordValue(selected);
        const targetField = businessField(controlCaption(current));
        return { consumed: 2, action: action(rule, values, {
          actionType: "EnterFieldValue",
          displayText: `Ange __${selectedValue}__ i **${targetField}**.`,
          selectedValue,
          targetField,
          preferredSourceEventId: selected.preferredSourceEventId ||
            selected.sourceEventIds?.at(-1),
          preferredScreenshotRef: selected.screenshot ||
            selected.screenshots?.at(-1)
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function searchAndOpenWithRedundantFieldRule() {
    const searchField = value => text(value?.searchFieldCaption ||
      value?.fieldCaption).replace(/[.:]+$/u, "").toLocaleLowerCase();
    const isSearchField = value => !value ||
      /sökfält|search field|sök|search|berätta|tell me/iu.test(value);
    const rule = {
      ruleId: "search-and-open-with-redundant-field",
      priority: 98,
      match(context) {
        const current = context.interactions[context.index];
        const next = context.interactions[context.index + 1];
        if (current?.taskType !== "SearchAndOpenPage" ||
            !["EnterFieldValue", "ChangeField"].includes(next?.taskType)) {
          return false;
        }
        const currentValue = meaningfulValue(current);
        const nextValue = meaningfulValue(next);
        const currentField = searchField(current);
        const nextField = searchField(next);
        const hasResult = Boolean(text(current.resultCaption ||
          current.selectedCaption || current.pageCaption));
        return Boolean(nextValue && hasResult &&
          (!currentValue || currentValue === nextValue) &&
          isSearchField(currentField) && isSearchField(nextField));
      },
      consolidate(context) {
        const values = context.interactions.slice(context.index,
          context.index + 2);
        const current = values[0];
        const selectedValue = meaningfulValue(current) || meaningfulValue(values[1]);
        const search = text(current.searchCaption || current.actionCaption || "Sök");
        const field = text(current.searchFieldCaption || current.fieldCaption ||
          values[1].fieldCaption || "sökfältet");
        const result = text(current.resultCaption || current.selectedCaption ||
          current.pageCaption);
        return { consumed: 2, action: action(rule, values, {
          actionType: "SearchAndOpenPage",
          displayText: `Välj **${search}**, ange __${selectedValue}__ i ` +
            `**${field}** och välj **${result}**.`,
          selectedValue, targetField: field,
          preferredSourceEventId: current.preferredSourceEventId ||
            current.sourceEventIds?.at(-1),
          preferredScreenshotRef: current.screenshot ||
            current.screenshots?.[0]
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
          actionPath: ["Rad", "Relaterad information",
            "Tillämpat försäljningspris och rabatt"],
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
    const includeTrailingDuplicate = (context, values) => {
      const candidate = context.interactions[context.index + values.length];
      return isAction(candidate) && captions[2].test(caption(candidate))
        ? [...values, candidate] : values;
    };
    const matchingValues = context => {
      const first = context.interactions[context.index];
      const second = context.interactions[context.index + 1];
      const third = context.interactions[context.index + 2];
      if (!isAction(first) || !captions[0].test(caption(first))) return [];
      if (isAction(second) && captions[1].test(caption(second)) &&
          isAction(third) && captions[2].test(caption(third))) {
        return includeTrailingDuplicate(context, [first, second, third]);
      }
      return isAction(second) && captions[2].test(caption(second))
        ? includeTrailingDuplicate(context, [first, second]) : [];
    };
    const rule = {
      ruleId: "manual-price-menu-path",
      priority: 110,
      match(context) {
        return matchingValues(context).length > 0;
      },
      consolidate(context) {
        const values = matchingValues(context);
        const menuEvidence = values[1];
        const preferredScreenshots = menuEvidence?.semanticActionModel
          ?.screenshotRefs || menuEvidence?.screenshots ||
          (menuEvidence?.screenshot ? [menuEvidence.screenshot] : []);
        return { consumed: values.length, action: action(rule, values, {
          actionType: "RunActionPath",
          displayText: "Välj **Åtgärder** → **Funktion** → **Manuellt pris**.",
          actionPath: ["Åtgärder", "Funktion", "Manuellt pris"],
          selectedValue: caption(values.at(-1)),
          preferredSourceEventId: menuEvidence?.sourceEventIds?.at(-1),
          preferredScreenshotRef: preferredScreenshots.at(-1)
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function purchaseManualPriceMenuPathRule() {
    const captions = [
      /^(?:välj\s+)?(?:rad|row)$/iu,
      /^(?:tillämpat inköpspris och rabatt|applied purchase price and discount)$/iu,
      /^(?:manuellt pris|manual price)/iu
    ];
    const isAction = value => ["RunAction", "ClickAction"].includes(
      value?.taskType
    );
    const caption = value => text(value?.actionCaption) ||
      text(value?.selectedCaption);
    const screenshots = value => value?.semanticActionModel?.screenshotRefs ||
      value?.screenshots || (value?.screenshot ? [value.screenshot] : []);
    const rule = {
      ruleId: "purchase-manual-price-menu-path",
      priority: 115,
      match(context) {
        return captions.every((pattern, offset) => {
          const value = context.interactions[context.index + offset];
          return isAction(value) && pattern.test(caption(value));
        });
      },
      consolidate(context) {
        const values = context.interactions.slice(context.index,
          context.index + captions.length);
        const nextInteraction = context.interactions[
          context.index + captions.length
        ];
        const resultScreenshots = screenshots(nextInteraction);
        const actionScreenshots = screenshots(values.at(-1));
        const preferredScreenshotRef = resultScreenshots[0] ||
          actionScreenshots.at(-1);
        return { consumed: values.length, action: action(rule, values, {
          actionType: "RunActionPath",
          displayText: "Välj **Rad** → **Tillämpat inköpspris och rabatt** → " +
            "**Manuellt pris**.",
          actionPath: ["Rad", "Tillämpat inköpspris och rabatt",
            "Manuellt pris"],
          selectedValue: caption(values.at(-1)),
          preferredSourceEventId: values.at(-1)?.sourceEventIds?.at(-1),
          preferredScreenshotRef
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function closeDialogRule() {
    const closeCaption = value => text(value?.actionCaption) ||
      text(value?.selectedCaption) || text(value?.instruction)
        .replace(/^(?:välj|select)\s+["“]?/iu, "").replace(/["”]?\.?$/u, "");
    const rule = {
      ruleId: "close-dialog-with-visible-control",
      priority: 105,
      match(context) {
        const value = context.interactions[context.index];
        return ["RunAction", "ClickAction"].includes(value?.taskType) &&
          /^(?:stäng|close)$/iu.test(closeCaption(value));
      },
      consolidate(context) {
        const value = context.interactions[context.index];
        const visibleDialog = context.interactions[context.index - 1];
        const preferredScreenshots = visibleDialog?.semanticActionModel
          ?.screenshotRefs || visibleDialog?.screenshots ||
          (visibleDialog?.screenshot ? [visibleDialog.screenshot] : []);
        return { consumed: 1, action: action(rule, [value], {
          actionType: "CloseDialog",
          displayText: "Välj **Stäng**.",
          selectedValue: "Stäng",
          preferredSourceEventId: visibleDialog?.sourceEventIds?.at(-1),
          preferredScreenshotRef: preferredScreenshots.at(-1)
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function duplicateActionObservationRule() {
    const caption = value => text(value?.actionCaption) ||
      text(value?.selectedCaption);
    const isAction = value => ["RunAction", "ClickAction"].includes(
      value?.taskType
    );
    const menuParent = /^(?:åtgärder|actions|funktion|functions?|rad|row|relaterad information|related information)$/iu;
    const sameRecordedInteraction = (left, right) => {
      const leftIds = recordedInteractionIds(left);
      const rightIds = recordedInteractionIds(right);
      return leftIds.length === 1 && rightIds.length === 1 &&
        leftIds[0] === rightIds[0];
    };
    const isDuplicateOf = (reference, candidate) => isAction(candidate) &&
      caption(reference).toLocaleLowerCase() ===
        caption(candidate).toLocaleLowerCase() &&
      sameRecordedInteraction(reference, candidate);
    const rule = {
      ruleId: "duplicate-action-observation",
      priority: 108,
      match(context) {
        const current = context.interactions[context.index];
        const next = context.interactions[context.index + 1];
        const currentCaption = caption(current);
        return isAction(current) && isAction(next) && Boolean(currentCaption) &&
          !menuParent.test(currentCaption) &&
          isDuplicateOf(current, next);
      },
      consolidate(context) {
        const values = [context.interactions[context.index]];
        let cursor = context.index + 1;
        while (cursor < context.interactions.length &&
            isDuplicateOf(values[0], context.interactions[cursor])) {
          values.push(context.interactions[cursor]);
          cursor += 1;
        }
        const selectedValue = caption(values[0]);
        return { consumed: values.length, action: action(rule, values, {
          actionType: "RunAction",
          displayText: `Välj **${selectedValue}**.`,
          selectedValue
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function technicalActionHierarchyRule() {
    const caption = value => text(value?.actionCaption) ||
      text(value?.selectedCaption);
    const actionGroups = value => unique((value?.uiHierarchy || [])
      .filter(item => item?.type === "actionGroup")
      .map(item => text(item.caption)));
    const rule = {
      ruleId: "technical-action-hierarchy",
      priority: 109,
      match(context) {
        const value = context.interactions[context.index];
        return ["RunAction", "ClickAction"].includes(value?.taskType) &&
          Boolean(caption(value)) && actionGroups(value).length > 0;
      },
      consolidate(context) {
        const value = context.interactions[context.index];
        const leaf = caption(value).replace(/\.{2,}$/u, "");
        const path = [...actionGroups(value).filter(item =>
          item.toLocaleLowerCase() !== leaf.toLocaleLowerCase()), leaf];
        return { consumed: 1, action: action(rule, [value], {
          actionType: "RunActionPath",
          displayText: `V\u00e4lj ${path.map(item => `**${item}**`).join(" \u2192 ")}.`,
          actionPath: path,
          selectedValue: leaf
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function genericMenuPathRule() {
    const menuParent = /^(?:v\u00e4lj\s+)?(?:\u00e5tg\u00e4rder|actions|funktion|functions?|rad|row|relaterad information|related information)$/iu;
    const isAction = value => ["RunAction", "ClickAction"].includes(
      value?.taskType
    );
    const caption = value => text(value?.actionCaption) ||
      text(value?.selectedCaption);
    const cleanCaption = value => caption(value)
      .replace(/^(?:v\u00e4lj|select)\s+/iu, "")
      .replace(/\.{2,}$/u, "");
    const pageKey = value => {
      const page = value?.pageContext || value?.pageIdentification || {};
      return text(value?.pageIdentity) || text(page?.pageIdentity) ||
        text(value?.pageObjectId) || text(page?.pageObjectId) ||
        text(value?.pageId) || text(page?.legacyPageId) || text(page?.pageId);
    };
    const samePage = values => {
      const keys = unique(values.map(pageKey));
      return keys.length < 2;
    };
    const matchingValues = context => {
      const values = [];
      let cursor = context.index;
      while (values.length < 3) {
        const candidate = context.interactions[cursor];
        if (!isAction(candidate) || !menuParent.test(caption(candidate))) break;
        values.push(candidate);
        cursor += 1;
      }
      const leaf = context.interactions[cursor];
      if (!values.length || !isAction(leaf) || !cleanCaption(leaf) ||
          menuParent.test(caption(leaf))) return [];
      const result = [...values, leaf];
      return samePage(result) ? result : [];
    };
    const screenshots = value => value?.semanticActionModel?.screenshotRefs ||
      value?.screenshots || (value?.screenshot ? [value.screenshot] : []);
    const rule = {
      ruleId: "generic-menu-action-path",
      priority: 107,
      match(context) {
        return matchingValues(context).length > 0;
      },
      consolidate(context) {
        const values = matchingValues(context);
        const captions = values.map(cleanCaption);
        const menuScreenshots = screenshots(values.at(-2));
        return { consumed: values.length, action: action(rule, values, {
          actionType: "RunActionPath",
          displayText: `V\u00e4lj ${captions.map(value => `**${value}**`).join(" \u2192 ")}.`,
          actionPath: captions,
          selectedValue: captions.at(-1),
          preferredSourceEventId: values.at(-1)?.sourceEventIds?.at(-1),
          preferredScreenshotRef: menuScreenshots.at(-1)
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
    purchaseManualPriceMenuPathRule(),
    salesPriceDiscountMenuPathRule(),
    manualPriceMenuPathRule(),
    technicalActionHierarchyRule(),
    duplicateActionObservationRule(),
    genericMenuPathRule(),
    closeDialogRule(),
    searchAndOpenWithRedundantFieldRule(),
    selectionRule({ ruleId: "customer-selection", priority: 100,
      actionType: "SelectCustomer", fieldPattern: CUSTOMER,
      verb: "Välj kund", targetField: "Kund", requireValue: true }),
    itemNumberLookupEntryRule(),
    fieldEntryWithRedundantRecordSelectionRule(),
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
    singleRule({ ruleId: "search-and-open-page", priority: 79,
      match: value => value?.taskType === "SearchAndOpenPage",
      actionType: () => "SearchAndOpenPage",
      display: (value, selected) => {
        const search = text(value.searchCaption || value.actionCaption || "Sök");
        const field = text(value.searchFieldCaption || value.fieldCaption ||
          "sökfältet");
        const result = text(value.resultCaption || value.selectedCaption ||
          value.pageCaption);
        return `Välj **${search}**, ange ` +
          `${selected ? `__${selected}__` : "söktext"} i **${field}** och ` +
          `välj **${result}**.`;
      } }),
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
    singleRule({ ruleId: "react-interactive-surface", priority: 55,
      match: value => value?.taskType === "RunAction" &&
        value?.targetControl?.type === "interactiveSurface" &&
        Boolean(text(value?.actionCaption)),
      actionType: () => "RunAction",
      display: value => `Välj **${text(value.actionCaption)}**.` }),
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
      display: (value, selected) => {
        const field = businessField(value.fieldCaption);
        return selected
          ? `Ange __${selected}__ i **${field}**.`
          : `Fyll i **${field}**.`;
      } }),
    singleRule({ ruleId: "generic-captioned-action", priority: 5,
      match: value => value?.taskType === "RunAction" &&
        Boolean(text(value?.actionCaption)),
      actionType: () => "RunAction",
      display: value => `Välj **${text(value.actionCaption)}**.` }),
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
    const page = group?.pageContext || primary.pageIdentification || {};
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
      uiHierarchy: clone(group?.uiHierarchy || primary.uiHierarchy || []),
      pageContext: clone(page), pageIdentification: clone(page),
      pageIdentity: page.pageIdentity || null,
      pageObjectId: page.pageObjectId || null,
      pageId: page.legacyPageId || page.pageId || page.id || "",
      pageCaption: page.pageCaption || page.caption || page.name || "",
      entity: page.entity || "", pageConfidence: page.confidence ?? null,
      pageIdentificationSource: page.source || "",
      targetControl: clone(control),
      value: primary.value?.normalized ?? primary.state?.checked ?? selected,
      inputSources: primary.subtype ? [primary.subtype] : [],
      sourceEventIds: group.sourceEventIds || [],
      normalizedEventIds: group.normalizedEventIds || [],
      stepGroupIds: group.stepGroupId ? [group.stepGroupId] : [],
      recordingId: group.recordingId,
      preferredSourceEventId: group.capturePacket?.preferredSourceEventId || undefined,
      capturePacket: clone(group.capturePacket || {}),
      captureGuidance: clone(group.guidance || {}),
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
