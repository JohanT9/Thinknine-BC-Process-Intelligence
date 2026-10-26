(function (root, factory) {
  const taskVisibility = typeof module === "object" && module.exports
    ? require("../review/task-visibility") : root.T9ReviewTaskVisibility;
  const api = factory(taskVisibility);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessQualityGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (taskVisibility) {
  "use strict";
  const GUARD_VERSION = "1.5.0";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const FIELD_ACTIONS = new Set([
    "ChangeDate", "ChangeExpectedReceiptDate", "ChangeField", "ChangeShipmentDate",
    "CountedQuantity", "EnterFieldValue", "EnterItemNumber", "EnterMeasuredWeight",
    "EnterProductionConsumption", "EnterProductionOutput", "EnterPurchaseDocumentEmissions",
    "EnterQuantity", "EnterServiceItemQuantity", "ManualInput", "QuantityToAssemble",
    "SelectBin", "SelectCustomer", "SelectDimension", "SelectItem", "SelectLocation", "SelectLookupValue",
    "SelectProductionItem", "SelectPurchaseLineItem", "SelectSalesLineItem",
    "SelectServiceOrderCustomer", "SelectVendor", "SetAssemblyPolicy", "SetDirectUnitCost",
    "SetFieldValue", "SetPickQtyToHandle", "SetProjectQtyToInvoice",
    "SetPurchaseLineQuantity", "SetPurchaseQtyToReceive", "SetPurchaseReturnReasonCode",
    "SetReturnReason", "SetSalesLineQuantity", "SetSalesLineUnitPrice",
    "SetSalesQtyToShip", "SetSalesReturnReasonCode", "SetWarehouseQtyToReceive",
    "BillingThroughDate", "AssignTrackingNumber", "SelectOption"
  ]);
  const freeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze); return Object.freeze(value);
  };
  const normalized = value => String(value ?? "").normalize("NFKC")
    .replace(/\s+/gu, " ").trim().toLocaleLowerCase();
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];
  const result = (code, severity, subjectType, subjectId, evidenceRefs, details = {}) =>
    ({ code, severity, subjectType, subjectId: String(subjectId || ""),
      evidenceRefs: unique(evidenceRefs), details: clone(details),
      provenance: { authorship: "derived", guardVersion: GUARD_VERSION } });

  function evaluate(input = {}) {
    const tasks = input.businessTasks || [];
    const groups = input.stepGroups || [];
    const normalizedEvents = input.normalizedEvents || [];
    const groupingDiagnostics = input.groupingDiagnostics || {};
    const groupById = new Map(groups.map(group => [String(group.stepGroupId), group]));
    const findings = [];
    tasks.forEach(task => {
      const taskId = String(task.taskId || "");
      const sourceEventIds = unique(task.sourceEventIds);
      if (task.knowledgeMatchAmbiguous) findings.push(result(
        "BCPS-PROCESS-GUARD-KNOWLEDGE-001", "review", "task", taskId,
        sourceEventIds, { invariant: "cross-module-action-must-be-disambiguated",
          candidates: (task.ambiguousCandidates || []).map(item => ({
            ruleId: String(item.ruleId || ""), entity: String(item.entity || ""),
            semanticAction: String(item.semanticAction || "") })) }));
      if (normalizedEvents.length && !sourceEventIds.length) findings.push(result(
        "BCPS-PROCESS-GUARD-TRACE-001", "block", "task", taskId,
        unique(task.stepGroupIds), { invariant: "canonical-source-required" }));
      const action = task.semanticActionModel || {};
      const capturedField = normalized(action.targetField);
      const projectedField = normalized(task.fieldCaption);
      if (capturedField && projectedField && capturedField !== projectedField) {
        findings.push(result("BCPS-PROCESS-GUARD-FIELD-001", "block", "task",
          taskId, sourceEventIds, { invariant: "captured-field-preserved" }));
      }
      const capturedValue = normalized(action.selectedValue);
      const projectedValue = normalized(task.selectedCaption ?? task.value);
      if (capturedValue && projectedValue && capturedValue !== projectedValue) {
        findings.push(result("BCPS-PROCESS-GUARD-VALUE-001", "block", "task",
          taskId, sourceEventIds, { invariant: "captured-value-preserved" }));
      }
      const instruction = normalized(task.instruction || task.description);
      const field = normalized(task.fieldCaption || action.targetField);
      const value = normalized(task.selectedCaption ?? task.value ?? action.selectedValue);
      const page = normalized(task.pageCaption || action.pageCaption ||
        task.context?.currentPageCaption ||
        action.pageIdentification?.pageCaption || action.pageIdentification?.caption);
      const actionType = String(task.semanticAction || task.taskType ||
        action.actionType || "");
      const fieldAction = FIELD_ACTIONS.has(actionType);
      const needsPageContext = !/^(?:Unknown|FocusTransition)$/u.test(actionType);
      const pageConfidenceValue = task.pageConfidence ?? task.pageIdentificationConfidence ??
        task.context?.pageIdentificationConfidence ?? action.pageConfidence ??
        task.pageIdentification?.confidence ?? task.pageContext?.confidence ??
        action.pageIdentification?.confidence ?? action.pageContext?.confidence;
      const pageConfidence = pageConfidenceValue == null || pageConfidenceValue === ""
        ? NaN : Number(pageConfidenceValue);
      const pageSource = normalized(task.pageIdentificationSource ||
        task.context?.pageIdentificationSource || action.pageIdentificationSource ||
        task.pageIdentification?.source ||
        task.pageContext?.source || action.pageIdentification?.source ||
        action.pageContext?.source);
      const weakPageSource = /(?:generic[- ]fallback|unknown|unresolved)/u.test(pageSource);
      if (needsPageContext && !page) {
        findings.push(result("BCPS-PROCESS-GUARD-CONTEXT-002", "review",
          "task", taskId, sourceEventIds,
          { invariant: "business-step-requires-observed-page-context",
            actionType, pageConfidence: Number.isFinite(pageConfidence)
              ? pageConfidence : null, pageIdentificationSource: pageSource || null }));
      } else if (needsPageContext && (weakPageSource ||
          (Number.isFinite(pageConfidence) && pageConfidence < 0.6))) {
        findings.push(result("BCPS-PROCESS-GUARD-CONTEXT-003", "review",
          "task", taskId, sourceEventIds,
          { invariant: "weak-page-identification-requires-review", actionType,
            pageConfidence: Number.isFinite(pageConfidence)
              ? pageConfidence : null, pageIdentificationSource: pageSource || null }));
      }
      const missingContext = [];
      if (fieldAction && !field) missingContext.push("field");
      if (fieldAction && !value && !/^(?:FocusTransition|ChangeField)$/u.test(actionType)) {
        missingContext.push("value");
      }
      if (taskVisibility.isGenericInstruction(instruction) ||
          (instruction.length < 12 && !field && !value)) {
        findings.push(result("BCPS-PROCESS-GUARD-INSTRUCTION-001", "review",
          "task", taskId, sourceEventIds,
          // Instructions embed captured values; report only their shape.
          { invariant: "instruction-must-explain-observed-action",
            genericInstruction: taskVisibility.isGenericInstruction(instruction),
            instructionLength: instruction.length }));
      } else if (missingContext.length) {
        findings.push(result("BCPS-PROCESS-GUARD-CONTEXT-001", "review",
          "task", taskId, sourceEventIds,
          { invariant: "field-action-requires-observed-field-and-value",
            missing: missingContext, page: page || null }));
      }
      const verification = task.resultVerification || action.resultVerification;
      const semanticAction = String(task.semanticAction || task.taskType ||
        action.actionType || "");
      const actionTypes = [task.semanticAction, task.taskType, action.actionType]
        .filter(Boolean).map(String);
      const outcomeRequired = /^(?:Post|Release|ReopenDocument|Delete|Cancel|Approve|Reject|Send|FinishQualityInspection|CloseFiscalYear|CloseSalesOpportunity|CompleteInbox|SendOutbox|MoveFailedInspectionInventory|UnblockQualityLotOnPass|BlockQualityLotInWorkflow|ApplyEntries|ApplyPayments|ApplyCustomerPaymentEntries|ApplyPurchaseCreditMemoEntries|ApplySalesCreditMemoEntries|ApplyInspectionStatusFromWorksheet|ApplyEmployeeTemplate|TransferGeneralLedgerEntriesToCostAccounting|TransferProjectUsageToJournal|Recalculate|Calculate|ImportInbox|ImportStatement|ScheduleInventoryQualityChecks|ScheduleQualityInspections|Sync(?:Products|InventoryToShopify|OrdersFromShopify|ProductsFromShopify|ShipmentsToShopify)|ConvertAcceptedServiceQuoteToOrder|Register(?:Absence|Consumption|Output|ItemWeight)|GetProjectPlanningLinesForInvoice|GetPostedPurchaseLinesToReverse|GetPostedSalesLinesToReverse|Get(?:Sales)?ShipmentLines|Create(?:QualityInspectionResult|InspectionResult|ManualQualityInspection|InspectionFromTrackingLine|CustomerNonConformance|NonConformanceFromQC|NonConformanceFromQualityCheck|PurchaseClaim(?:FromSalesClaim)?|InventoryQualityTrigger|QCCheck|QualityCheck|SalesInvoice|ProjectSalesInvoice|SalesDocumentsFromShopifyOrder|PurchaseReturnFromQualityInspection|QualityNegativeAdjustmentFromInspection))/u;
      const outcomeAction = actionTypes.find(type => outcomeRequired.test(type));
      const requiresOutcome = Boolean(outcomeAction);
      if (requiresOutcome && !(verification?.status === "verified" &&
          (verification.outcomes || []).some(outcome =>
            ["navigation", "status-message"].includes(outcome.kind)))) {
        findings.push(result("BCPS-PROCESS-GUARD-RESULT-003", "review",
          "task", taskId, sourceEventIds,
          { invariant: "business-action-requires-observed-completion",
            semanticAction, taskType: task.taskType || null,
            outcomeAction, verificationStatus: verification?.status || "missing",
            observedKinds: (verification?.outcomes || []).map(item => item.kind),
            observedFailure: (verification?.outcomes || []).some(item =>
              item.kind === "error-outcome") }));
      }
      if (fieldAction && verification?.status === "verified" &&
          !(verification.outcomes || []).some(outcome =>
            ["navigation", "status-message", "error-outcome"]
              .includes(outcome.kind))) {
        findings.push(result("BCPS-PROCESS-GUARD-RESULT-002", "review",
          "task", taskId, sourceEventIds,
          { invariant: "field-change-is-not-business-outcome-verification",
            observedKinds: (verification.outcomes || []).map(item => item.kind) }));
      }
      unique(task.stepGroupIds).forEach(groupId => {
        const group = groupById.get(groupId);
        if (!group) return;
        const kinds = unique((group.normalizedEvents || []).map(event => event.kind));
        if (kinds.length && kinds.every(kind => ["status-message", "dialog-open",
          "dialog-close"].includes(kind))) findings.push(result(
          "BCPS-PROCESS-GUARD-RESULT-001", "block", "step-group", groupId,
          group.sourceEventIds, { invariant: "result-only-group-cannot-produce-step" }));
        const interactions = unique(group.interactionIds);
        const reasons = new Set(group.groupingReason || []);
        const allowedRelation = ["confirmation-dialog", "confirmed-action",
          "observed-action-result", "lookup-supporting-mechanic",
          "resulting-control-value-match", "recorder-interaction-id"]
          .some(reason => reasons.has(reason));
        if (interactions.length > 1 && !allowedRelation) findings.push(result(
          "BCPS-PROCESS-GUARD-MERGE-001", "review", "step-group", groupId,
          group.sourceEventIds, { invariant: "multi-interaction-merge-needs-relation",
            interactionCount: interactions.length }));
      });
    });
    const assignedGroups = new Set(tasks.flatMap(task => task.stepGroupIds || [])
      .map(String));
    groups.forEach(group => {
      const groupId = String(group.stepGroupId || "");
      if (group.guidance?.ignored || group.status === "ignored" ||
          assignedGroups.has(groupId)) return;
      const meaningful = (group.normalizedEvents || []).filter(event =>
        !["status-message", "dialog-open", "dialog-close", "navigation"]
          .includes(event.kind));
      if (meaningful.length) findings.push(result(
        "BCPS-PROCESS-GUARD-COVERAGE-001", "review", "step-group", groupId,
        group.sourceEventIds, { invariant: "meaningful-observed-group-must-be-explained",
          eventKinds: meaningful.map(event => event.kind) }));
    });
    const eventById = new Map(normalizedEvents.map(event =>
      [String(event.normalizedEventId || ""), event]));
    unique(groupingDiagnostics.unassignedMeaningfulEventIds).forEach(eventId => {
      const event = eventById.get(eventId);
      findings.push(result("BCPS-PROCESS-GUARD-COVERAGE-002", "review",
        "normalized-event", eventId,
        unique(event?.sourceEventIds || [event?.sourceEventId]),
        { invariant: "meaningful-recorded-event-must-be-assigned",
          normalizedEventId: eventId, eventKind: event?.kind || null }));
    });
    const blocked = findings.filter(item => item.severity === "block").length;
    const review = findings.filter(item => item.severity === "review").length;
    return freeze({ guardVersion: GUARD_VERSION, findings,
      status: blocked ? "blocked" : review ? "review-required" : "passed",
      counts: { blocked, review, total: findings.length } });
  }
  return { GUARD_VERSION, evaluate };
});
