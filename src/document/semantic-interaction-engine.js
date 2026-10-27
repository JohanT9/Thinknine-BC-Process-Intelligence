(function (root, factory) {
  const sourceReference = typeof module === "object" && module.exports
    ? require("../engine/source-reference") : root.T9SourceReference;
  const api = factory(sourceReference);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9SemanticInteractionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (sourceReference) {
  const ENGINE_VERSION = "1.5.0";
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
    return [value?.fieldCaption, value?.fieldContext?.caption,
      value?.focusedFieldContext?.caption, value?.actionCaption, value?.selectedCaption,
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
    return text(value?.fieldCaption) || text(value?.fieldContext?.caption) ||
      text(value?.focusedFieldContext?.caption) || text(
      value?.identifications?.find(item => item?.control?.caption)
        ?.control?.caption
    );
  }
  function pageDescriptor(value = {}) {
    const pages = [value.pageContext, value.pageIdentification, value.page]
      .filter(page => page && typeof page === "object");
    return {
      identity: text(value.pageIdentity || value.pageObjectId || value.pageId ||
        pages.map(page => page.pageIdentity || page.pageObjectId || page.id ||
          page.pageId || page.legacyPageId).find(Boolean)),
      caption: text(value.pageCaption || pages.map(page => page.pageCaption ||
        page.caption || page.name).find(Boolean))
        .trim().toLocaleLowerCase(),
      modal: Boolean(value.modal || value.isDialog || pages.some(page =>
        page.modal || page.isDialog))
    };
  }
  function crossesNonModalPage(values, candidate) {
    const previous = [...values].reverse().map(pageDescriptor)
      .find(page => page.identity || page.caption);
    const next = pageDescriptor(candidate);
    if (!previous || !(next.identity || next.caption) || previous.modal || next.modal) {
      return false;
    }
    if (previous.identity && next.identity) return previous.identity !== next.identity;
    return Boolean(previous.caption && next.caption &&
      previous.caption !== next.caption);
  }

  function unique(values) {
    return [...new Set(values.filter(value => value !== undefined &&
      value !== null && value !== ""))];
  }

  function uniqueEventNos(values) {
    return unique((values || []).map(value => {
      const number = Number(value);
      return Number.isSafeInteger(number) && number > 0 ? number : value;
    }));
  }

  const RECORD_SELECTION = /^(?:välj posten|select record|open record|öppna posten?)\s+["“]?(.+?)["”]?\.?$/iu;
  const EMBEDDED_RECORD_SELECTION = /(?:välj posten|select record|open record|öppna posten?)\s+(?:["“]([^"”]+)["”]|([^"“”]+?)(?:\.|$))/iu;
  const LOOKUP = /(?:välj(?:a)?(?: ett)? värde för|(?:choose|select)(?: a)? value for|(?:choisir|choisissez|sélectionner|sélectionnez) (?:une )?valeur pour|wählen sie (?:einen )?wert für|(?:seleccionar|seleccione) (?:un )?valor para|vælg (?:en )?værdi for|velg (?:en )?verdi for|valitse (?:arvo|arvon) (?:kohteelle|kentälle))/iu;
  const LOOKUP_FIELD = /^(?:(?:välj(?:a)? (?:ett )?värde för)|(?:(?:choose|select)(?: a)? value for)|(?:(?:choisir|choisissez|sélectionner|sélectionnez) (?:une )?valeur pour)|(?:wählen sie (?:einen )?wert für)|(?:(?:seleccionar|seleccione) (?:un )?valor para)|(?:vælg (?:en )?værdi for)|(?:velg (?:en )?verdi for)|(?:valitse (?:arvo|arvon) (?:kohteelle|kentälle)))\s+(.+?)!?$/iu;
  // BC prompts have no closing period, so a trailing "." belongs to the
  // captured caption (for example "No.") and must be kept.
  function lookupFieldFromCaption(caption) {
    return text(caption).match(LOOKUP_FIELD)?.[1]?.trim() || "";
  }
  function lookupField(value) {
    return [value?.actionCaption, value?.fieldCaption,
      value?.fieldContext?.caption, value?.focusedFieldContext?.caption,
      value?.targetControl?.caption]
      .map(lookupFieldFromCaption).find(Boolean) || "";
  }
  const ROW_TYPE_ENTITIES = Object.freeze({
    Item: /^(?:artikel|item|article|artículo|tuote|vare|produkt)$/iu,
    Resource: /^(?:resurs|resource|ressource|recurso|resurssi|ressurs)$/iu,
    GLAccount: /^(?:g\/?l(?:\s|-)?account|ledger account|redovisningskonto|g\/?l-konto|sachkonto|compte général|cuenta contable|finanskonto|finanskonti|finanskonton|pääkirjatili)$/iu,
    FixedAsset: /^(?:fixed asset|anläggningstillgång|anlaegningstilgang|anlægsaktiv|anlage|immobilisation|activo fijo|käyttöomaisuus|anleggsmiddel|driftsmiddel)$/iu,
    ItemCharge: /^(?:charge\s*\(\s*item\s*\)|item charge|artikelavgift|varegebyr|artikelzuschlag|frais article|cargo\s*\(\s*producto\s*\)|cargo de producto|nimikeveloitus|tuoteveloitus)$/iu
  });
  function entityForRowType(value) {
    const rowType = text(value).replace(/\s+/gu, " ").trim();
    return Object.entries(ROW_TYPE_ENTITIES).find(([, pattern]) =>
      pattern.test(rowType))?.[0] || "";
  }
  function isNumberFieldCaption(value) {
    const caption = text(value).trim();
    return /^(?:nr\.?|no\.?|number|nummer|n°|nº|n\.?[º°]|num(?:ero|éro)?|nro\.?|n:o)$/iu
      .test(caption) || /(?:nr\.?|no\.?|nummer|number|nro\.?|n:o)$/iu.test(caption) ||
      /^n[°º.]\s*(?:(?:de|d[’'])\s*)?\p{L}/iu.test(caption);
  }

  function selectedRecordValue(value) {
    for (const candidate of [value?.selectedCaption, value?.actionCaption,
      value?.instruction, value?.description]) {
      const match = text(candidate).replace(/\*\*/gu, "").match(RECORD_SELECTION);
      if (match) return match[1].replace(/["“”]+$/gu, "").trim();
      const embedded = text(candidate).replace(/\*\*/gu, "")
        .match(EMBEDDED_RECORD_SELECTION);
      if (embedded) return (embedded[1] || embedded[2]).replace(/["“”]+$/gu, "").trim();
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

  function groupedSelectionValue(value) {
    const events = [
      ...(value?.normalizedInteractions || []),
      ...(value?.stepGroups || []).flatMap(group => {
        const ids = new Set((group.evidence || [])
          .filter(item => item.kind === "selection-change")
          .map(item => item.normalizedEventId));
        return (group.normalizedEvents || []).filter(event =>
          event.kind === "selection-change" || ids.has(event.normalizedEventId));
      })
    ].filter(event => event?.kind === "selection-change");
    for (const event of events.reverse()) {
      const fromCaption = selectedRecordValue(event);
      if (fromCaption) return fromCaption;
      const selected = event.selection?.value ?? event.selection?.caption ??
        event.selection?.key ?? event.value?.normalized;
      if (selected != null && text(selected)) return text(selected);
    }
    return "";
  }

  function fieldMatches(value, pattern) {
    const captions = [
      value?.fieldCaption,
      value?.fieldContext?.caption,
      value?.focusedFieldContext?.caption,
      value?.targetControl?.caption,
      value?.targetControl?.fieldCaption,
      value?.targetControl?.fieldSemanticHint,
      ...(value?.identifications || []).map(item => item?.control?.caption),
      lookupField(value)
    ];
    return captions.some(caption => caption && pattern.test(text(caption)));
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
    const caption = text(value);
    const field = caption.replace(/^(?:sortera efter|sort by|sort on)\s+/iu, "");
    return field === caption ? caption : field.replace(/^(['"“‘])(.*)['"”’]$/u, "$2");
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
      // The semantic action can carry an empty legacy trace while the
      // interpretation pipeline has already resolved event numbers from the
      // canonical event index. Merge both so an empty array cannot mask the
      // more complete projection-level trace.
      sourceEventNos: uniqueEventNos([
        ...(value.semanticActionModel?.sourceEventNos || []),
        ...(value.sourceEventNos || [])
      ]),
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
      sourceEventNos: uniqueEventNos(values.flatMap(value => [
        ...(value.semanticActionModel?.sourceEventNos || []),
        ...(value.sourceEventNos || [])
      ])),
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
    const pageCaption = text(page.pageCaption || page.caption || page.name);
    let displayText = properties.displayText;
    if (["RunAction", "RunActionPath", "SelectRecord"].includes(
        properties.actionType) && pageCaption && displayText &&
        !/\b(?:på sidan|on the .+ page|sur la page|auf der Seite|en la página|på siden|sivulla)\b/iu
          .test(displayText)) {
      displayText = `${String(displayText).replace(/[.!?]+$/u, "")} ` +
        `på sidan **${pageCaption}**.`;
    }
    return deepFreeze({
      ...futureMetadata,
      actionId: stableId(rule.ruleId, values),
      actionType: properties.actionType,
      displayText,
      ...(properties.rowTypeContext ? {rowTypeContext: clone(properties.rowTypeContext), selectedEntity: properties.selectedEntity} : {}),
      ...(Array.isArray(properties.actionPath)
        ? { actionPath: clone(properties.actionPath) } : {}),
      ...(properties.hidden ? { hidden: true } : {}),
      ...(typeof properties.checked === "boolean"
        ? { checked: properties.checked } : {}),
      selectedValue: properties.selectedValue || "",
      targetField: properties.targetField || "",
      ...(properties.searchFieldCaption
        ? { searchFieldCaption: properties.searchFieldCaption } : {}),
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
          if (crossesNonModalPage(values, candidate)) break;
          const candidateLookupField = lookupField(candidate);
          if (candidateLookupField && !fieldPattern.test(candidateLookupField)) break;
          const selectedSoFar = values.map(value => selectedRecordValue(value) ||
            (["Select", "SelectRecord", "SelectOption", "SelectLookupValue"].includes(value.taskType)
              ? meaningfulValue(value) : "")).find(Boolean);
          const nextSelection = selectedRecordValue(candidate) ||
            (["Select", "SelectRecord", "SelectOption", "SelectLookupValue"].includes(candidate.taskType)
              ? meaningfulValue(candidate) : "");
          if (selectedSoFar && nextSelection && nextSelection !== selectedSoFar) break;
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
        const observedField = config.preserveFieldCaption ? values.map(value =>
          lookupField(value) || text(controlCaption(value) || value.targetControl?.caption || value.actionCaption))
          .find(caption => caption && fieldPattern.test(caption) && !selectedRecordValue({actionCaption:caption})) : "";
        const selectedValue = values.map(selectedRecordValue).find(Boolean) ||
          meaningfulValue({ selectedCaption: explicitSelection?.selectedCaption }) ||
          [...values].reverse().map(meaningfulValue).find(Boolean) || "";
        return {
          consumed: values.length,
          action: action(rule, values, {
            actionType: config.actionType,
            displayText: observedField && selectedValue
              ? `Välj **${selectedValue}** i **${observedField}**.`
              : selectedValue
              ? `${config.verb} **${selectedValue}**.` : `${config.verb}.`,
            selectedValue,
            targetField: observedField || config.targetField,
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
        const targetField = businessField(config.targetField ||
          controlCaption(value));
        return { consumed: 1, action: action(rule, [value], {
          actionType: config.actionType(value, selectedValue),
          displayText: config.display(value, selectedValue),
          selectedValue,
          ...(config.checked
            ? { checked: config.checked(value, selectedValue) } : {}),
          targetField
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function explicitLookupSelectionRule() {
    const trigger = value => lookupField(value)
      ? [null, lookupField(value)] : null;
    const selected = value => selectedRecordValue(value) ||
      groupedSelectionValue(value) ||
      (["Select", "SelectRecord"].includes(value?.taskType) ? meaningfulValue(value) : "");
    const rule = {
      ruleId: "explicit-lookup-selection", priority: 96,
      match(context) {
        const first = context.interactions[context.index];
        const next = context.interactions[context.index + 1];
        return Boolean(trigger(first) && (groupedSelectionValue(first) || selected(next))) &&
          !(first.pageId && next.pageId && first.pageId !== next.pageId);
      },
      consolidate(context) {
        const first = context.interactions[context.index];
        const inGroupSelection = Boolean(groupedSelectionValue(first));
        const values = context.interactions.slice(context.index,
          context.index + (inGroupSelection ? 1 : 2));
        // Some Business Central lookup controls report the same row activation
        // twice while the selected value is being committed. Keep the single
        // business choice and retain both events as evidence, but only when the
        // duplicate is the immediately adjacent, same-page, same-value row
        // activation observed within a short interval.
        if (!inGroupSelection && values.length === 2) {
          const duplicate = context.interactions[context.index + 2];
          const chosen = selected(values[1]);
          const sameCaption = text(values[1]?.actionCaption) &&
            text(values[1]?.actionCaption) === text(duplicate?.actionCaption);
          const samePage = pageDescriptor(values[1]).identity &&
            pageDescriptor(values[1]).identity === pageDescriptor(duplicate).identity;
          const firstTime = Date.parse(values[1]?.timestamp || "");
          const duplicateTime = Date.parse(duplicate?.timestamp || "");
          const shortRepeat = Number.isFinite(firstTime) &&
            Number.isFinite(duplicateTime) && duplicateTime >= firstTime &&
            duplicateTime - firstTime <= 2000;
          if (chosen && selected(duplicate) === chosen && sameCaption && samePage &&
              ["RunAction", "ClickAction", "Select"].includes(duplicate?.taskType) &&
              shortRepeat) {
            values.push(duplicate);
          }
        }
        const targetField = trigger(values[0])[1];
        const rowContext = values[0].rowTypeContext;
        const rowType = rowContext?.source === 'same-row-type' && rowContext.schemaVersion === 1 &&
          isNumberFieldCaption(targetField) &&
          typeof rowContext.value === 'string' && rowContext.value.length <= 80 ? rowContext.value : '';
        const entity = entityForRowType(rowType);
        const selectedValue = inGroupSelection ? groupedSelectionValue(values[0])
          : selected(values[1]);
        return { consumed: values.length, action: action(rule, values, {
          actionType: entity === "Item" ? "EnterItemNumber" : "SelectLookupValue",
          targetField, selectedValue,
          selectedEntity: entity || undefined, rowTypeContext: rowType ? clone(rowContext) : undefined,
          displayText: rowType
            ? `Välj **${selectedValue}** i **${targetField}** (**${rowType}**).`
            : `Välj **${selectedValue}** i **${targetField}**.`,
          preferredScreenshotRef: values[1]?.screenshot ||
            values[1]?.screenshots?.at(-1) || values[0]?.screenshots?.at(-1)
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
          const candidate = context.interactions[cursor];
          if (crossesNonModalPage(values, candidate)) break;
          if (LOOKUP.test(interactionText(candidate)) &&
              controlCaption(candidate) !== controlCaption(first)) break;
          const previousSelection = values.map(selectedRecordValue).find(Boolean);
          const nextSelection = selectedRecordValue(candidate);
          if (previousSelection && nextSelection && previousSelection !== nextSelection) break;
          values.push(candidate);
          cursor += 1;
        }
        const selectedValue = groupedSelectionValue(first) ||
          values.map(selectedRecordValue).find(Boolean) || "";
        if (selectedValue && cursor < context.interactions.length) {
          const result = context.interactions[cursor];
          if (result?.taskType === "ChangeField" &&
              text(result.fieldCaption) === text(first.fieldCaption) &&
              meaningfulValue(result) === selectedValue) {
            values.push(result);
          }
        }
        const targetField = businessField(controlCaption(first));
        const rowTypeContext = values.map(value => value.rowTypeContext)
          .find(value => value?.source === "same-row-type" &&
            value.schemaVersion === 1) || null;
        const rowType = text(rowTypeContext?.value);
        const selectedEntity = entityForRowType(rowType);
        const isItemRow = selectedEntity === "Item";
        const isKnownTypedRow = Boolean(selectedEntity);
        const resolvedField = isItemRow && /^(?:nr\.?|no\.?|number)$/iu
          .test(targetField) ? (rowType + " " + targetField) : targetField;
        return { consumed: values.length, action: action(rule, values, {
          actionType: isItemRow ? "EnterItemNumber" : "SelectLookupValue",
          displayText: selectedValue
            ? isItemRow
              ? `Ange __${selectedValue}__ i **${resolvedField}**.`
              : resolvedField
              ? `Välj **${selectedValue}** i **${resolvedField}**.`
              : `Välj värde **${selectedValue}**.`
            : "Välj värde.",
          selectedValue,
          targetField: resolvedField,
          ...(isKnownTypedRow ? { selectedEntity,
            rowTypeContext: clone(rowTypeContext) } : {}),
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
        const itemRow = current?.rowTypeContext?.source === "same-row-type" &&
          current.rowTypeContext.schemaVersion === 1 &&
          /^(?:artikel|item|article|artículo|tuote|vare)$/iu.test(
            text(current.rowTypeContext.value));
        return ["EnterFieldValue", "ChangeField"].includes(current?.taskType) &&
          sortingNumber(current) && selected?.taskType === "RunAction" &&
          Boolean(selectedValue) &&
          ((["EnterFieldValue", "ChangeField"].includes(result?.taskType) &&
            sortingNumber(result) && meaningfulValue(result) === selectedValue) ||
            itemRow);
      },
      consolidate(context) {
        const first = context.interactions[context.index];
        const result = context.interactions[context.index + 2];
        const hasResult = ["EnterFieldValue", "ChangeField"].includes(
          result?.taskType) && sortingNumber(result);
        const values = context.interactions.slice(context.index,
          context.index + (hasResult ? 3 : 2));
        const selectedValue = selectedRecordValue(values[1]);
        const itemRow = first.rowTypeContext?.source === "same-row-type" &&
          /^(?:artikel|item|article|artículo|tuote|vare)$/iu.test(
            text(first.rowTypeContext.value));
        const searchField = text(first.fieldCaption || first.targetControl?.caption ||
          first.actionCaption || "Nr");
        return { consumed: values.length, action: action(rule, values, {
          actionType: itemRow ? "SearchAndSelectRecord" : "EnterFieldValue",
          displayText: itemRow
            ? `Sök efter __${selectedValue}__ i **${searchField}** och välj den filtrerade posten.`
            : `Ange __${selectedValue}__ i **Nr**.`,
          selectedValue, targetField: itemRow ? "Artikel Nr" : "Nr",
          ...(itemRow ? { searchFieldCaption: searchField } : {}),
          ...(itemRow ? { selectedEntity: "Item",
            rowTypeContext: clone(first.rowTypeContext) } : {})
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function selectedRecordNoun(value, selectedValue) {
    const pageContext = [value?.pageCaption, value?.pageContext?.pageCaption,
      value?.pageContext?.caption, value?.pageIdentification?.pageCaption,
      value?.pageIdentification?.caption, value?.capturePacket?.pageCaption,
      value?.capturePacket?.pageContext?.pageCaption,
      value?.semanticActionModel?.pageCaption,
      value?.semanticActionModel?.pageContext?.pageCaption,
      ...(value?.identifications || []).map(item => item?.page?.caption),
      ...(value?.semanticActionModel?.rawInteractions || [])
        .flatMap(item => [item?.pageCaption, item?.pageContext?.pageCaption])]
      .map(text).filter(Boolean).join(" ");
    const types = [
      [/^(?:sales orders?|försäljningsordrar|försäljningsorder)(?:\s+list)?$/iu,
        "försäljningsordern"],
      [/^(?:purchase orders?|inköpsordrar|inköpsorder)(?:\s+list)?$/iu,
        "inköpsordern"],
      [/^(?:sales invoices?|försäljningsfakturor|försäljningsfaktura)(?:\s+list)?$/iu,
        "försäljningsfakturan"],
      [/^(?:purchase invoices?|inköpsfakturor|inköpsfaktura)(?:\s+list)?$/iu,
        "inköpsfakturan"]
    ];
    const contextual = types.find(([pattern]) => pattern.test(pageContext))?.[1];
    if (contextual) return contextual;
    // Standard document-number prefixes are a fallback only when page metadata
    // was lost between capture and semantic regeneration.
    if (/^SO\d+$/iu.test(text(selectedValue))) return "försäljningsordern";
    if (/^PO\d+$/iu.test(text(selectedValue))) return "inköpsordern";
    return "posten";
  }

  function sortedRecordSelectionRule() {
    const sortingDescription = value =>
      /(?:sorterade?\s+i|sorted\s+in)\s+(?:stigande|fallande|ascending|descending)(?:\s+order|\s+ordning)?/iu
        .test(interactionText(value));
    const rule = {
      ruleId: "sorted-record-selection",
      priority: 111,
      match(context) {
        const value = context.interactions[context.index];
        return ["RunAction", "ClickAction", "Select"].includes(value?.taskType) &&
          sortingDescription(value) && Boolean(selectedRecordValue(value));
      },
      consolidate(context) {
        const value = context.interactions[context.index];
        const selectedValue = selectedRecordValue(value);
        const noun = selectedRecordNoun(value, selectedValue);
        const field = text(value.fieldContext?.caption);
        return { consumed: 1, action: action(rule, [value], {
          actionType: "SelectRecord",
          displayText: field
            ? `Välj **${selectedValue}** i **${field}**.`
            : `Välj ${noun} **${selectedValue}**.`,
          selectedValue, targetField: field
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
        return { consumed: values.length, action: action(rule, values, {
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
        let inputEnd = context.index + 1;
        while (inputEnd + 1 < context.interactions.length &&
            ["EnterFieldValue", "ChangeField"].includes(
              context.interactions[inputEnd + 1]?.taskType) &&
            isSearchField(searchField(context.interactions[inputEnd + 1]))) {
          inputEnd += 1;
        }
        const next = context.interactions[inputEnd];
        const candidateResult = context.interactions[inputEnd + 1];
        if (current?.taskType !== "SearchAndOpenPage" ||
            !["EnterFieldValue", "ChangeField"].includes(next?.taskType)) {
          return false;
        }
        const currentValue = meaningfulValue(current);
        const nextValue = meaningfulValue(next);
        const currentField = searchField(current);
        const nextField = searchField(next);
        const resultCaption = text(candidateResult?.selectedCaption ||
          candidateResult?.actionCaption || candidateResult?.fieldCaption);
        const hasRecordedResult = Boolean(candidateResult &&
          /\s+(?:listor|lists)\s*[\uE000-\uF8FF]*$/iu.test(resultCaption));
        const hasResult = hasRecordedResult || Boolean(text(current.resultCaption ||
          current.selectedCaption));
        return Boolean(nextValue && hasResult &&
          (!currentValue || currentValue === nextValue) &&
          isSearchField(currentField) && isSearchField(nextField));
      },
      consolidate(context) {
        let inputEnd = context.index + 1;
        while (inputEnd + 1 < context.interactions.length &&
            ["EnterFieldValue", "ChangeField"].includes(
              context.interactions[inputEnd + 1]?.taskType) &&
            isSearchField(searchField(context.interactions[inputEnd + 1]))) {
          inputEnd += 1;
        }
        const candidateResult = context.interactions[inputEnd + 1];
        const resultCaption = text(candidateResult?.selectedCaption ||
          candidateResult?.actionCaption || candidateResult?.fieldCaption)
          .replace(/[\uE000-\uF8FF]/gu, "").replace(/\s+/gu, " ").trim();
        const hasRecordedResult = /\s+(?:listor|lists)$/iu.test(resultCaption);
        const values = context.interactions.slice(context.index,
          hasRecordedResult ? inputEnd + 2 : inputEnd + 1);
        const current = values[0];
        const selectedValue = meaningfulValue(current) || meaningfulValue(values[1]);
        const search = text(current.searchCaption || current.actionCaption || "Sök");
        const field = text(current.searchFieldCaption || current.fieldCaption ||
          values[1].fieldCaption || "sökfältet");
        const result = hasRecordedResult
          ? resultCaption.replace(/\s+(?:listor|lists)$/iu, "")
          : text(current.resultCaption || current.selectedCaption);
        return { consumed: values.length, action: action(rule, values, {
          actionType: "SearchAndOpenPage",
          displayText: hasRecordedResult
            ? "Sök efter __" + selectedValue + "__ och öppna listan **" + result + "**."
            : "Välj **" + search + "**, ange __" + selectedValue + "__ i **" +
              field + "**" + (result ? " och välj **" + result + "**" : "") + ".",
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

  function recordedCompositeSearchAndOpenRule() {
    const recordedSequence = value => {
      if (value?.taskType !== "SearchAndOpenPage") return null;
      const raw = value.semanticActionModel?.rawInteractions;
      if (!Array.isArray(raw) || raw.length < 3) return null;
      const searchIndex = raw.findIndex(item =>
        item?.taskType === "SearchAndOpenPage");
      const queryIndex = raw.findIndex((item, index) => index > searchIndex &&
        ["EnterFieldValue", "ChangeField"].includes(item?.taskType) &&
        Boolean(meaningfulValue(item)));
      const resultIndex = raw.findIndex((item, index) => index > queryIndex &&
        item?.taskType === "OpenPage" && Boolean(text(item.actionCaption ||
          item.selectedCaption || item.pageCaption)));
      return searchIndex >= 0 && queryIndex > searchIndex &&
        resultIndex > queryIndex ? { raw, searchIndex, queryIndex, resultIndex } : null;
    };
    const rule = {
      ruleId: "preserve-recorded-composite-search-and-open",
      priority: 99,
      match(context) {
        return Boolean(recordedSequence(context.interactions[context.index]));
      },
      consolidate(context) {
        const current = context.interactions[context.index];
        const sequence = recordedSequence(current);
        const query = sequence.raw[sequence.queryIndex];
        const result = sequence.raw[sequence.resultIndex];
        const displayText = text(current.instruction || current.description ||
          current.semanticActionModel?.displayText);
        if (!displayText) return { consumed: 1, action: action(rule, [current], {
          actionType: "SearchAndOpenPage",
          displayText: `Sök efter __${meaningfulValue(query)}__ och öppna **${text(
            result.actionCaption || result.selectedCaption || result.pageCaption
          ).replace(/[\uE000-\uF8FF]/gu, "").trim()}**.`
        }) };
        return { consumed: 1, action: action(rule, [current], {
          actionType: "SearchAndOpenPage", displayText,
          selectedValue: meaningfulValue(query),
          preferredSourceEventId: current.semanticActionModel
            ?.preferredSourceEventId || current.preferredSourceEventId,
          preferredScreenshotRef: current.semanticActionModel
            ?.preferredScreenshotRef || current.screenshot
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function observedMenuPath(values) {
    return unique(values.map(value => text(value.actionCaption || value.selectedCaption)
      .replace(/^(?:välj|select)\s+/iu, "").replace(/(?:\.{2,}|…)+$/u, "")));
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
          displayText: `Välj ${observedMenuPath(values).map(label => `**${label}**`).join(" → ")}.`,
          actionPath: observedMenuPath(values),
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
          displayText: `Välj ${observedMenuPath(values).map(label => `**${label}**`).join(" → ")}.`,
          actionPath: observedMenuPath(values),
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
          displayText: `Välj ${observedMenuPath(values).map(label => `**${label}**`).join(" → ")}.`,
          actionPath: observedMenuPath(values),
          selectedValue: caption(values.at(-1)),
          preferredSourceEventId: values.at(-1)?.sourceEventIds?.at(-1),
          preferredScreenshotRef
        }) };
      }
    };
    return deepFreeze(rule);
  }

  function fieldDialogConfirmationRule() {
    const rule = { ruleId: "field-dialog-confirmation", priority: 116,
      match(context) {
        const [field, dialog, confirm] = context.interactions.slice(
          context.index, context.index + 3);
        const confirmation = text(confirm?.actionCaption || confirm?.fieldCaption ||
          confirm?.selectedCaption).replace(/^(?:välj|select|choose)\s+/iu, "")
          .replace(/[.:]+$/u, "").trim();
        const positiveConfirmation = /^(?:ok|okay|o\.k\.|okej|oui|ja|sí|si|sim|yes|save|spara|enregistrer|speichern|guardar|gem|tallenna|lagre|continue|fortsätt|fortsaett|weiter|continuer|continuar|fortsæt|jatka)$/iu;
        const pageKey = value => {
          const identity = value?.pageIdentity;
          return String(value?.pageId || value?.pageObjectId ||
            (typeof identity === "string" ? identity : identity?.pageObjectId ||
              identity?.id || ""));
        };
        const pages = [field, dialog, confirm].map(pageKey).filter(Boolean);
        return ["EnterFieldValue", "ChangeField"].includes(field?.taskType) &&
          Boolean(field.fieldCaption) && dialog?.targetControl?.role === "dialog" &&
          ["RunAction", "ClickAction"].includes(confirm?.taskType) &&
          positiveConfirmation.test(confirmation) &&
          (confirm.uiHierarchy || []).some(item => item.type === "dialog") &&
          new Set(pages).size <= 1;
      },
      consolidate(context) {
        const values = context.interactions.slice(context.index, context.index + 3);
        const field = businessField(values[0].fieldCaption);
        const selected = meaningfulValue(values[0]);
        const confirmCaption = text(values[2].actionCaption || values[2].fieldCaption ||
          values[2].selectedCaption).replace(/^(?:välj|select|choose)\s+/iu, "")
          .replace(/[.:]+$/u, "").trim();
        return { consumed: 3, action: action(rule, values, {
          actionType: "EnterFieldValue", targetField: field, selectedValue: selected,
          displayText: (selected ? `Ange __${selected}__ i **${field}**.`
            : `Ange **${field}**.`) + ` Välj **${confirmCaption}**.`,
          preferredScreenshotRef: values[0].screenshot || values[0].screenshots?.at(-1),
          preferredSourceEventId: values[0].sourceEventIds?.at(-1)
        })};
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

  function successAcknowledgementRule() {
    const captionOf = value => text(value?.actionCaption ||
      value?.fieldCaption || value?.selectedCaption);
    const confirmationCaption = value => text(value?.actionCaption ||
      value?.fieldCaption || value?.selectedCaption).replace(
      /^(?:välj|select|choose|wählen sie|sélectionnez|seleccione|vælg|velg|valitse)\s+/iu, "")
      .replace(/[.:]+$/u, "").trim();
    const successPattern = /(?:\b(?:has been\s+)?(?:successfully\s+)?(?:created|saved|posted|processed|registered|generated|applied|released|sent|completed)\b|\b(?:skapats|skapades|skapade|sparats|sparades|bokf[oö]rts|registrerats|registrerades|till[aä]mpats|frisl[aä]ppts|skickats|slutf[oö]rts)\b|\b(?:cr[eé][eé](?:e|es|s)?|enregistr[eé](?:e|es|s)?|valid[eé](?:e|es|s)?|comptabilis[eé](?:e|es|s)?|envoy[eé](?:e|es|s)?|termin[eé](?:e|es|s)?)\b|\b(?:creado|guardado|registrado|contabilizado|aplicado|enviado|finalizado)s?\b|\b(?:erstellt|gespeichert|gebucht|registriert|angewendet|freigegeben|gesendet|abgeschlossen)\b|\b(?:oprettet|gemt|bogf[oø]rt|registreret|anvendt|frigivet|sendt|afsluttet)\b|\b(?:luotu|tallennettu|kirjattu|rekister[oö]ity|sovellettu|vapautettu|l[aä]hetetty|valmis)\b|\b(?:opprettet|lagret|bokf[oø]rt|registrert|brukt|frigitt|sendt|fullf[oø]rt)\b)/iu;
    const positiveConfirmation = /^(?:ok|okay|o\.k\.|okej|oui|ja|s[ií]|si|sim|yes|spara|save|enregistrer|speichern|guardar|gem|tallenna|lagre|continue|fortsätt|fortsaett|weiter|continuer|continuar|fortsæt|jatka)$/iu;
    const menuParent = /^(?:åtgärder|actions|funktion|functions?|rad|row|line|relaterad information|related information)$/iu;
    const verificationOf = value => value?.resultVerification ||
      value?.capturePacket?.resultVerification ||
      value?.stepGroups?.at(-1)?.capturePacket?.resultVerification;
    const successOutcome = value => {
      const verification = verificationOf(value);
      return verification?.status === "verified" &&
        (verification.outcomes || []).some(outcome =>
          outcome.kind === "dialog-open" && successPattern.test(
            `${outcome.controlCaption || ""} ${outcome.description || ""}`));
    };
    const samePageOrObservedResultPage = (left, right) => {
      const first = pageDescriptor(left).identity;
      const second = pageDescriptor(right).identity;
      if (first && second && first === second) return true;
      const packet = left?.capturePacket || left?.stepGroups?.at(-1)?.capturePacket;
      const resultingPages = (packet?.stateObservation?.after?.facts || [])
        .filter(fact => fact.kind === "page")
        .map(fact => text(fact.value?.identity || fact.value?.pageIdentity));
      return Boolean(second && resultingPages.includes(second));
    };
    const candidateFor = context => {
      const interactions = context.interactions;
      let cursor = context.index;
      const path = [];
      while (cursor < interactions.length && path.length < 3 &&
          ["RunAction", "ClickAction"].includes(interactions[cursor]?.taskType) &&
          menuParent.test(captionOf(interactions[cursor]))) {
        path.push(interactions[cursor]);
        cursor += 1;
      }
      const operation = interactions[cursor];
      const acknowledgement = interactions[cursor + 1];
      return { path, operation, acknowledgement, consumed: cursor - context.index + 2 };
    };
    const rule = {
      ruleId: "success-dialog-acknowledgement",
      priority: 117,
      match(context) {
        const { path, operation, acknowledgement } = candidateFor(context);
        const caption = confirmationCaption(acknowledgement);
        return ["RunAction", "ClickAction", "RunActionPath"].includes(operation?.taskType) &&
          successOutcome(operation) &&
          ["RunAction", "ClickAction"].includes(acknowledgement?.taskType) &&
          positiveConfirmation.test(caption) &&
          (acknowledgement.uiHierarchy || []).some(item => item.type === "dialog") &&
          samePageOrObservedResultPage(operation, acknowledgement) &&
          operation.recordingId && operation.recordingId === acknowledgement.recordingId &&
          (!path.length || path.every(value =>
            value.recordingId === operation.recordingId));
      },
      consolidate(context) {
        const { path, operation, acknowledgement, consumed } = candidateFor(context);
        const values = context.interactions.slice(context.index,
          context.index + consumed);
        const verification = verificationOf(operation);
        const actionCaption = captionOf(operation).replace(/^(?:välj|select|choose)\s+/iu, "")
          .replace(/[.!?]+$/u, "").trim();
        const actionPath = [...path.map(value => captionOf(value).replace(
          /^(?:välj|select|choose)\s+/iu, "").replace(/[.!?]+$/u, "").trim()),
          actionCaption].filter(Boolean);
        const merged = action(rule, values, {
          actionType: path.length ? "RunActionPath" :
            operation.semanticAction || operation.taskType,
          ...(path.length ? { actionPath } : {}),
          displayText: path.length
            ? `Välj ${actionPath.map(item => `**${item}**`).join(" → ")}.`
            : `Välj **${actionCaption}**.`
        });
        return { consumed, action: deepFreeze({ ...merged,
          actionCaption: captionOf(operation),
          resultVerification: clone(verification),
          acknowledgementSourceEventIds: clone(acknowledgement.sourceEventIds || [])
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
    const menuParent = /^(?:åtgärder|actions|funktion|functions?|rad|row|line|relaterad information|related information)$/iu;
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
      .filter(item => text(item?.type).toLocaleLowerCase() === "actiongroup")
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
    const menuParent = /^(?:v\u00e4lj\s+)?(?:\u00e5tg\u00e4rder|actions|funktion|functions?|rad|row|line|relaterad information|related information)$/iu;
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

  const CUSTOMER = /kundens namn|kundnr|customer name|customer\s*no\.?|nom du client|n°\s*(?:du )?client|client no\.?|kundenname|debitor(?:en)?nr\.?|nombre del cliente|n\.?\s*[º°]\s*(?:de(?:l)? )?cliente|cliente no\.?|kundenavn|kundenr\.?|asiakkaan nimi|asiakasnro/iu;
  const ITEM = /artikelnr|artikelnummer|item\s*no\.?|n°\s*(?:d['’]article|de l['’]article|article)|article no\.?|n\.?\s*[º°]\s*(?:de )?(?:artículo|producto)|varenr\.?|nimikenro/iu;
  const VENDOR = /leverantör(?:ens namn|snr|snummer)?|vendor(?:\s*name|\s*no\.?)?|nom (?:du )?fournisseur|n°\s*(?:du )?fournisseur|fournisseur no\.?|kreditor(?:en)?(?:name|nr\.?|navn)|nombre del proveedor|n\.?\s*[º°]\s*(?:de(?:l)? )?proveedor|proveedor no\.?|leverandør(?:navn|nr\.?)|toimittajan\s*(?:nimi|nro\.?)/iu;
  const LOCATION = /lagerställe|location(?: code)?|emplacement(?: code)?|lagerort|ubicaci[oó]n(?: code)?|lokation(?:skode)?|sijainti|varastopaikka|lokasjon(?:skode)?/iu;
  const DIMENSION = /dimensi[oó]n|dimensjon|dimensionsvärde|dimension value|valeur de dimension|dimensionswert|valor de dimensión|dimensionsværdi|dimensio(?:n|arvo|n arvo)?/iu;

  const BUILT_IN_RULES = deepFreeze([
    successAcknowledgementRule(),
    fieldDialogConfirmationRule(),
    sortedRecordSelectionRule(),
    purchaseManualPriceMenuPathRule(),
    salesPriceDiscountMenuPathRule(),
    manualPriceMenuPathRule(),
    technicalActionHierarchyRule(),
    duplicateActionObservationRule(),
    genericMenuPathRule(),
    closeDialogRule(),
    recordedCompositeSearchAndOpenRule(),
    searchAndOpenWithRedundantFieldRule(),
    selectionRule({ ruleId: "customer-selection", priority: 100,
      actionType: "SelectCustomer", fieldPattern: CUSTOMER, preserveFieldCaption: true,
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
      preserveFieldCaption: true,
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
    singleRule({ ruleId: "dialog-action", priority: 78,
      match: value => value?.taskType === "Dialog" &&
        Boolean(text(value?.actionCaption)),
      actionType: () => "RunDialogAction",
      display: value => `V\u00e4lj **${text(value.actionCaption)}** i dialogrutan.` }),
    singleRule({ ruleId: "quantity-entry", priority: 75,
      match: value => Boolean(meaningfulValue(value)) &&
        /^(?:antal|quantity)$/iu
          .test(businessField(controlCaption(value))),
      actionType: () => "EnterQuantity",
      display: (value, selected) => selected
        ? `Ange __${selected}__ i **${businessField(controlCaption(value))}**.`
        : `Ange ${businessField(controlCaption(value))}.` }),
    singleRule({ ruleId: "date-selection", priority: 70,
      match: value => typed(value) && /datum|date/iu.test(controlCaption(value)),
      actionType: () => "SelectDate",
      display: (value, selected) => selected
        ? `Ange __${selected}__ i **${controlCaption(value)}**.`
        : `Ange ${controlCaption(value)}.` }),
    singleRule({ ruleId: "checkbox", priority: 60,
      match: value => /checkbox|toggle|boolean/iu.test(text(value?.taskType)) ||
        typeof value?.value === "boolean",
      actionType: (value, selected) => checkboxEnabled(value, selected)
        ? "EnableCheckbox" : "DisableCheckbox",
      checked: (value, selected) => checkboxEnabled(value, selected),
      display: (value, selected) =>
        `${checkboxEnabled(value, selected) ? "Aktivera" : "Inaktivera"} ` +
        `**${controlCaption(value)}**.` }),
    singleRule({ ruleId: "react-interactive-surface", priority: 55,
      match: value => value?.taskType === "RunAction" &&
        value?.targetControl?.type === "interactiveSurface" &&
        Boolean(text(value?.actionCaption)),
      actionType: () => "RunAction",
      display: value => `Välj **${text(value.actionCaption)}**.` }),
    singleRule({ ruleId: "create-new-record-with-page-context", priority: 54,
      match: value => value?.taskType === "RunAction" &&
        /^(?:ny|new)$/iu.test(text(value.actionCaption)),
      actionType: () => "CreateNewRecord",
      display: value => {
        const page = text(value.pageCaption || value.pageContext?.pageCaption ||
          value.pageContext?.caption).replace(/\s*\([^)]*\)\s*$/u, "");
        const names = {
          purchase: /^(?:inköpsord(?:er|rar|erlista)|purchase orders?(?: list)?|commandes? achat|bestellungen?|pedidos? de compra|indkøbsordrer?|ostotilaukset|bestillinger?)$/iu,
          sales: /^(?:försäljningsord(?:er|rar|erlista)|sales orders?(?: list)?|commandes? vente|verkaufsaufträge?|pedidos? de venta|salgsordrer?|myyntitilaukset)$/iu,
          purchaseInvoice: /^(?:inköpsfaktur(?:a|or)|purchase invoices?(?: list)?|factures? achat|einkaufsrechnungen?|facturas? de compra|købsfaktura(?:er)?|ostolaskut|kjøpsfaktura(?:er)?)$/iu,
          salesInvoice: /^(?:försäljningsfaktur(?:a|or)|sales invoices?(?: list)?|factures? vente|verkaufsrechnungen?|facturas? de venta|salgsfaktura(?:er)?|myyntilaskut)$/iu,
          purchaseCredit: /^(?:inköpskreditnot(?:a|or)|purchase credit memos?(?: list)?|avoirs? achat|einkaufsgutschriften?|abonos? de compra|købskreditnota(?:er)?|ostohyvityslaskut|kjøpskreditnota(?:er)?)$/iu,
          salesCredit: /^(?:försäljningskreditnot(?:a|or)|sales credit memos?(?: list)?|avoirs? vente|verkaufsgutschriften?|abonos? de venta|salgskreditnota(?:er)?|myyntihyvityslaskut)$/iu,
          purchaseReturn: /^(?:inköpsreturord(?:er|rar)|purchase return orders?(?: list)?|commandes? retour achat|einkaufsrücksendungen?|devoluciones? de compra|købsreturordrer?|ostopalautustilaukset|kjøpsreturordrer?)$/iu,
          salesReturn: /^(?:försäljningsreturord(?:er|rar)|sales return orders?(?: list)?|commandes? retour vente|verkaufsrücksendungen?|devoluciones? de venta|salgsreturordrer?|myyntipalautustilaukset)$/iu,
          quote: /^(?:försäljningsoffert(?:er)?|sales quotes?(?: list)?|devis de vente|verkaufsangebote?|ofertas? de venta|salgstilbud(?:det|dene)?|myyntitarjoukset)$/iu,
          purchaseQuote: /^(?:inköpsoffert(?:er)?|purchase quotes?(?: list)?|devis d’achat|einkaufsanfragen?|ofertas? de compra|købstilbud(?:det|dene)?|ostotarjoukset|kjøpstilbud(?:det|dene)?)$/iu,
          transfer: /^(?:överföringsord(?:er|rar)|transfer orders?(?: list)?|ordres? de transfert|umlagerungsaufträge?|órdenes? de transferencia|overførselsordrer?|siirtotilaukset)$/iu,
          assembly: /^(?:monteringsord(?:er|rar)|assembly orders?(?: list)?|ordres? d’assemblage|montageaufträge?|órdenes? de ensamblado|samleordrer?|kokoonpanotilaukset)$/iu,
          service: /^(?:serviceord(?:er|rar)|service orders?(?: list)?|ordres? de service|serviceaufträge?|órdenes? de servicio|huoltotilaukset)$/iu,
          production: /^(?:produktionsord(?:er|rar)|production orders?(?: list)?|ordres? de fabrication|fertigungsaufträge?|órdenes? de producción|tuotantotilaukset)$/iu,
          warehouseReceipt: /^(?:lagerinleverans(?:er)?|warehouse receipts?(?: list)?|réceptions? entrepôt|lagerwareneingänge?|recepciones? de almacén|lagerindleveringer?|varastovastaanotot|lagerinngående leveringer?)$/iu,
          warehouseShipment: /^(?:lagerutleverans(?:er)?|warehouse shipments?(?: list)?|expéditions? entrepôt|lagerlieferungen?|envíos? de almacén|lagerleverancer?|varastotoimitukset|lagerutleveringer?)$/iu,
          warehousePick: /^(?:lagerplockningar?|warehouse picks?(?: list)?|prélèvements? entrepôt|lagerkommissionierungen?|picking de almacén|lagerpluk(?:ninger)?|varastokeräilyt|lagerplukk)$/iu,
          warehousePutAway: /^(?:lagerinlagringar?|warehouse put-aways?(?: list)?|rangements? entrepôt|lager einlagerungen?|ubicaciones? en almacén|lagerindlagringer?|varastopaikoitukset|lagerinnlagringer?)$/iu,
          inventoryPick: /^(?:lagerplockningar?|inventory picks?(?: list)?|prélèvements? stock|lagerkommissionierungen?|picking de inventario|lagerpluk(?:ninger)?|varastokeräilyt|lagerplukk)$/iu,
          bankAccount: /^(?:bankkont(?:o|on)|bank accounts?(?: list)?|comptes bancaires?|bankkonten|cuentas bancarias?|bankkonti|pankkitilit|bankkonto(?:er)?)$/iu,
          bankAccountReconciliation: /^(?:bankavstämningar?|bank account reconciliations?(?: list)?|rapprochements? bancaires?|bankkontoabstimmungen?|conciliaciones? bancarias?|bankafstemninger?|pankkitilin täsmäytykset|bankavstemminger?)$/iu,
          glAccount: /^(?:huvudbokskonton?|g\/l accounts?(?: list)?|chart of accounts|comptes généraux?|sachkonten|cuentas contables?|finanskonti|pääkirjatilit|hovedbokskonto(?:er)?)$/iu,
          generalJournal: /^(?:redovisningsjournal(?:er)?|general journals?(?: list)?|journaux généraux?|fibu buch\.-blätter|diarios generales?|finanskladder|yleiset päiväkirjat|generelle journaler)$/iu,
          paymentJournal: /^(?:betalningsjournal(?:er)?|payment journals?(?: list)?|journaux de paiement|zahlungs buch\.-blätter|diarios de pagos?|betalingskladder|maksupäiväkirjat|betalingsjournaler)$/iu,
          cashReceiptJournal: /^(?:inbetalningsjournal(?:er)?|cash receipt journals?(?: list)?|journaux des encaissements|zahlungseingang buch\.-blätter|diarios de cobros?|indbetalingskladder|kassakuittipäiväkirjat|innbetalingsjournaler)$/iu,
          paymentReconciliationJournal: /^(?:betalningsavstämningsjournal(?:er)?|payment reconciliation journals?(?: list)?|feuilles? rapprochement paiements|zahlungsabstimmungs buch\.-blätter|diarios de conciliación de pagos?|betalingsafstemningskladder|maksujen täsmäytyspäiväkirjat|betalingsavstemmingsjournaler)$/iu,
          warehouseActivity: /^(?:lageraktiviteter?|warehouse activities?(?: list)?|activités? entrepôt|lageraktivitäten|actividades? de almacén|lageraktiviteter|varastotoiminnot)$/iu,
          itemVariant: /^(?:artikelvarianter?|item variants?(?: list)?|variantes? article|artikelvarianten|variantes? de artículo|varevarianter|nimikevariantit)$/iu,
          itemCategory: /^(?:artikelkategorier?|item categories?(?: list)?|catégories? article|artikelkategorien|categorías? de producto|varekategorier|nimikekategoriat)$/iu,
          customer: /^(?:kunder?|customers?|clients?|debitoren|clientes?|asiakkaat)$/iu,
          vendor: /^(?:leverantörer?|vendors?|fournisseurs?|kreditoren|proveedores|toimittajat)$/iu,
          item: /^(?:artiklar?|items?|articles?|artikel|artículos?|varer?|nimikkeet)$/iu
        };
        const entity = names.purchase.test(page) ? "inköpsorder"
          : names.sales.test(page) ? "försäljningsorder"
          : names.purchaseInvoice.test(page) ? "inköpsfaktura"
          : names.salesInvoice.test(page) ? "försäljningsfaktura"
          : names.purchaseCredit.test(page) ? "inköpskreditnota"
          : names.salesCredit.test(page) ? "försäljningskreditnota"
          : names.purchaseReturn.test(page) ? "inköpsreturorder"
          : names.salesReturn.test(page) ? "försäljningsreturorder"
          : names.quote.test(page) ? "försäljningsoffert"
          : names.purchaseQuote.test(page) ? "inköpsoffert"
          : names.transfer.test(page) ? "överföringsorder"
          : names.assembly.test(page) ? "monteringsorder"
          : names.service.test(page) ? "serviceorder"
          : names.production.test(page) ? "produktionsorder"
          : names.warehouseReceipt.test(page) ? "lagerinleverans"
          : names.warehouseShipment.test(page) ? "lagerutleverans"
          : names.warehousePick.test(page) ? "lagerplockning"
          : names.warehousePutAway.test(page) ? "lagerinlagring"
          : names.inventoryPick.test(page) ? "lagerplockning"
          : names.bankAccount.test(page) ? "bankkonto"
          : names.bankAccountReconciliation.test(page) ? "bankavstämning"
          : names.glAccount.test(page) ? "huvudbokskonto"
          : names.generalJournal.test(page) ? "redovisningsjournal"
          : names.paymentJournal.test(page) ? "betalningsjournal"
          : names.cashReceiptJournal.test(page) ? "inbetalningsjournal"
          : names.paymentReconciliationJournal.test(page) ? "betalningsavstämningsjournal"
          : names.warehouseActivity.test(page) ? "lageraktivitet"
          : names.itemVariant.test(page) ? "artikelvariant"
          : names.itemCategory.test(page) ? "artikelkategori"
          : names.customer.test(page) ? "kund"
          : names.vendor.test(page) ? "leverantör"
          : names.item.test(page) ? "artikel" : "";
        return page && entity
          ? `Börja skapa en ny **${entity}** genom att välja **${text(value.actionCaption)}** på sidan **${page}**.`
          : page ? `Börja skapa en ny post från sidan **${page}**.`
            : "Börja skapa en ny post.";
      } }),
    singleRule({ ruleId: "open-business-central-list", priority: 53,
      match: value => value?.taskType === "OpenPage" &&
        /\s+(?:listor|lists)$/iu.test(text(value.actionCaption)),
      actionType: () => "OpenPage",
      display: value => `Öppna listan **${text(value.actionCaption).replace(/\s+(?:listor|lists)$/iu, "")}**.` }),
    singleRule({ ruleId: "tell-me-page-selection", priority: 53,
      match: value => value?.taskType === "Select" &&
        value?.targetControl?.role === "gridcell" &&
        /^.+\s+Lists\s+[\uE000-\uF8FF]+$/u.test(text(value.selectedCaption)),
      actionType: () => "OpenPage",
      display: value => `Välj **${text(value.selectedCaption).replace(/\s+Lists\s+[\uE000-\uF8FF]+$/u, "")}**.` }),
    singleRule({ ruleId: "record-selection", priority: 52,
      match: value => value?.taskType === "Select" &&
        Boolean(meaningfulValue(value)),
      actionType: () => "SelectRecord",
      display: (_value, selected) => `Välj posten **${selected}**.` }),
    singleRule({ ruleId: "option-selection", priority: 50,
      match: value => /selectoption|option|dropdown|combobox/iu
        .test(text(value?.taskType)),
      actionType: () => "SelectOption",
      display: (value, selected) => selected
        ? `Välj **${selected}** i **${controlCaption(value)}**.`
        : `Välj ett alternativ i **${controlCaption(value)}**.` }),
    explicitLookupSelectionRule(),
    genericLookupRule(),
    singleRule({ ruleId: "generic-field-entry", priority: 10,
      match: value => value?.taskType === "EnterFieldValue" ||
        (value?.taskType === "ChangeField" &&
          (typed(value) || Boolean(meaningfulValue(value)))),
      actionType: () => "EnterFieldValue",
      display: (value, selected) => {
        const field = businessField(controlCaption(value));
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
    const presentationText = value => text(value).replace(/[\uE000-\uF8FF]/gu, "")
      .replace(/\s+/gu, " ").trim();
    const observedAction = presentationText(action.caption || "");
    const opensList = /\s+(?:listor|lists)$/iu.test(observedAction);
    const observedField = presentationText(control.caption || "").replace(
      /^(?:choose|select)(?:\s+(?:a|an))?\s+value\s+for\s+|^välj(?:\s+ett)?\s+värde\s+för\s+|^(?:choisissez|choisir|sélectionnez|sélectionner)\s+(?:une?\s+)?valeur\s+pour\s+|^wählen\s+sie\s+(?:einen?\s+)?wert\s+für\s+|^(?:seleccione|seleccionar|elija)\s+(?:un\s+)?valor\s+para\s+|^vælg\s+(?:en\s+)?værdi\s+for\s+|^valitse\s+arvo\s+(?:kohteelle|kentälle|kenttään)\s+|^velg\s+(?:en\s+)?verdi\s+for\s+/iu, "").trim();
    return {
      rowTypeContext: clone(primary.rowTypeContext),
      kind: group.groupKind,
      taskId: group.stepGroupId,
      taskType: action.actionType === "SearchAndOpenPage"
        ? "SearchAndOpenPage" : opensList
          ? "OpenPage" : types[group.groupKind] || "Unclassified",
      fieldCaption: observedField,
      actionCaption: observedAction,
      selectedCaption: selected ? String(selected) : "",
      selectedValue: selected,
      uiHierarchy: clone(group?.uiHierarchy || primary.uiHierarchy || []),
      pageContext: clone(page), pageIdentification: clone(page),
      fieldContext: clone(group.fieldContext || primary.focusedFieldContext || null),
      pageIdentity: page.pageIdentity || null,
      pageObjectId: page.pageObjectId || null,
      pageId: page.legacyPageId || page.pageId || page.id || "",
      pageCaption: page.pageCaption || page.caption || page.name || "",
      timestamp: primary.timestamp || group.capturePacket?.timestamp || "",
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
      ...(value.resultVerification
        ? { resultVerification: clone(value.resultVerification),
          observedResult: value.resultVerification.summary || "",
          expectedResultSuggestion:
            value.resultVerification.expectedResultSuggestion || "",
          resultVerified: ["verified", "error"].includes(
            value.resultVerification.status) } : {}),
      ...(value.capturePacket
        ? { capturePacket: clone(value.capturePacket) } : {}),
      ...(value.capturePackets?.length
        ? { capturePackets: clone(value.capturePackets) } : {}),
      ...(value.interactionIds?.length
        ? { interactionIds: clone(value.interactionIds),
          interactionId: value.interactionId ||
            (value.interactionIds.length === 1 ? value.interactionIds[0] : null) }
        : {}),
      captureGuidance: clone(value.captureGuidance || first.captureGuidance || {}),
      important: Boolean(value.captureGuidance?.important || first.important),
      sectionBoundaryAfter: Boolean(value.captureGuidance?.sectionBoundaryAfter ||
        first.sectionBoundaryAfter),
      fieldCaption: value.targetField || first.fieldCaption,
      ...(value.searchFieldCaption
        ? { searchFieldCaption: value.searchFieldCaption } : {}),
      selectedCaption: value.selectedValue,
      value: typeof value.checked === "boolean"
        ? value.checked : value.selectedValue,
      ...(typeof value.checked === "boolean"
        ? { checked: value.checked } : {}),
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
