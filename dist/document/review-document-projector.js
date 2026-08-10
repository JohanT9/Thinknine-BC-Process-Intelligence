(function (root, factory) {
  const model = typeof module === "object" && module.exports
    ? require("./semantic-document")
    : root.T9DocumentModel;
  const stepEditor = typeof module === "object" && module.exports
    ? require("../review/step-editor")
    : root.T9StepEditor;
  const api = factory(model, stepEditor);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewDocumentProjector = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (model, stepEditor) {
  const PROJECTOR_VERSION = "1.0.0";
  const ORIGIN = "review-document-projector";
  const DEFAULT_PURPOSE =
    "Beskriver hur processen genomförs i Business Central.";
  const DEFAULT_PREREQUISITES = Object.freeze([
    "Användaren har behörighet till berörda sidor och åtgärder.",
    "Nödvändiga grunddata och inställningar finns upplagda.",
    "Instruktionerna följer de benämningar som visades i Business Central."
  ]);
  const DEFAULT_EXPECTED_RESULT =
    "Processen är genomförd enligt arbetsgången och de registrerade " +
    "ändringarna har sparats i Business Central.";

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function firstText(...values) {
    return values.map(text).find(Boolean) || "";
  }

  function idPart(value) {
    const input = String(value);
    let result = "";
    for (let index = 0; index < input.length; index += 1) {
      result += input.charCodeAt(index).toString(16).padStart(4, "0");
    }
    return result || "empty";
  }

  function diagnostic(code, path, message, severity = "warning", sourceRef) {
    return {
      code,
      path,
      message,
      severity,
      ...(sourceRef ? { sourceRef: clone(sourceRef) } : {})
    };
  }

  function screenshotRefs(task) {
    const values = Array.isArray(task?.screenshots) && task.screenshots.length
      ? task.screenshots
      : task?.screenshot
        ? [task.screenshot]
        : [];
    return values.map(text).filter(Boolean);
  }

  function annotationSets(review) {
    return Array.isArray(review?.annotations?.screenshotSets)
      ? review.annotations.screenshotSets
      : [];
  }

  function annotationRefsFor(review, screenshotRef, diagnostics) {
    const usedIds = new Set();
    const matchingSets = annotationSets(review)
      .map((set, index) => ({ set, index }))
      .filter(entry => entry.set?.screenshotRef === screenshotRef);
    return matchingSets.flatMap(({ set, index: setIndex }) => {
      if (!Array.isArray(set?.items)) {
        diagnostics.push(diagnostic(
          "invalid-reference",
          `$.annotations.screenshotSets[${setIndex}].items`,
          "Annotation items must be an array."
        ));
        return [];
      }
      return set.items.flatMap((annotation, annotationIndex) => {
        const annotationId = text(annotation?.annotationId);
        if (annotationId) {
          if (usedIds.has(annotationId)) {
            diagnostics.push(diagnostic(
              "invalid-reference",
              `$.annotations.screenshotSets[${setIndex}].items[${annotationIndex}]`,
              `Duplicate annotation ID: ${annotationId}.`,
              "warning",
              { annotationId, screenshotRef }
            ));
            return [];
          }
          usedIds.add(annotationId);
          return [{ annotationId, screenshotRef }];
        }
        diagnostics.push(diagnostic(
          "invalid-reference",
          `$.annotations.screenshotSets[${setIndex}].items[${annotationIndex}]`,
          "Annotation reference has no stable annotation ID.",
          "warning",
          { screenshotRef }
        ));
        return [];
      });
    });
  }

  function projectMetadata(review, session) {
    return {
      title: firstText(
        review.sessionName,
        session.name,
        "Business Central-process"
      ),
      sessionId: firstText(review.sessionId, session.id),
      status: text(review.status),
      reviewer: text(review.reviewer) || "Ej angiven",
      notes: text(review.notes),
      purpose: text(session.purpose) || DEFAULT_PURPOSE,
      environment: text(session.settings?.environmentName) || "Ej angiven",
      documentationProfile: text(session.settings?.documentationProfile) || "generic",
      documentVersion: "1.0",
      statusLabel: review.status === "completed" ? "Slutförd" : "Pågående",
      createdAt: firstText(review.createdAt, session.startedAt),
      updatedAt: firstText(review.updatedAt, session.endedAt)
    };
  }

  function provenance(review, session, extensions) {
    return {
      ...clone(object(extensions)),
      origin: ORIGIN,
      version: PROJECTOR_VERSION,
      generatedAt: firstText(
        review.updatedAt,
        review.createdAt,
        session.endedAt,
        session.startedAt
      ) || null,
      transformations: [
        "review-metadata",
        "review-tasks",
        "review-comments",
        "review-screenshots",
        "review-annotation-references"
      ]
    };
  }

  function project(reviewValue, options = {}) {
    const review = object(stepEditor.resolveReview(reviewValue));
    const session = object(options.session);
    const diagnostics = [];
    const metadata = projectMetadata(review, session);
    const sessionId = metadata.sessionId;

    if (!firstText(review.sessionName, session.name)) {
      diagnostics.push(diagnostic(
        "missing-title", "$.sessionName", "Review has no document title."
      ));
    }
    const missingMetadata = [];
    if (!sessionId) missingMetadata.push("session ID");
    if (!metadata.createdAt && !metadata.updatedAt) {
      missingMetadata.push("Review timestamp");
    }
    if (missingMetadata.length) {
      diagnostics.push(diagnostic(
        "missing-metadata",
        "$",
        `Review is missing ${missingMetadata.join(" and ")}.`
      ));
    }

    const coverBlocks = [{
      blockId: "block:cover:title",
      kind: "heading",
      level: 1,
      text: metadata.title
    }];

    const assets = [];
    const assetByScreenshot = new Map();
    const annotationRefsByScreenshot = new Map();
    const taskIdCounts = new Map();
    const workflowBlocks = [];
    const tasks = Array.isArray(review.tasks) ? review.tasks : [];

    tasks.filter(task => !task?.deleted).forEach((taskValue, taskIndex) => {
      const task = object(taskValue);
      const taskId = text(task.taskId);
      const sourceTaskId = taskId || `ReviewTask-${taskIndex + 1}`;
      if (!taskId) {
        diagnostics.push(diagnostic(
          "invalid-reference",
          `$.tasks[${taskIndex}].taskId`,
          "Task has no stable task ID; a deterministic compatibility ID was used."
        ));
      }
      const occurrence = (taskIdCounts.get(sourceTaskId) || 0) + 1;
      taskIdCounts.set(sourceTaskId, occurrence);
      if (occurrence > 1) {
        diagnostics.push(diagnostic(
          "invalid-reference",
          `$.tasks[${taskIndex}].taskId`,
          `Duplicate task ID: ${sourceTaskId}.`
        ));
      }
      const stepKey = `${idPart(sourceTaskId)}:${occurrence}`;
      const sourceEventIds = Array.isArray(task.sourceEventIds)
        ? task.sourceEventIds.map(String)
        : Array.isArray(task.sourceEventNos) ? task.sourceEventNos.map(String) : [];
      const sourceRef = { taskId: sourceTaskId,
        ...(sourceEventIds.length ? { sourceEventIds } : {}) };
      const instruction = firstText(task.instruction, task.description);
      if (!instruction) {
        diagnostics.push(diagnostic(
          "empty-step",
          `$.tasks[${taskIndex}].instruction`,
          "Task has no instruction.",
          "warning",
          sourceRef
        ));
      }
      const blocks = [{
        blockId: `block:instruction:${stepKey}`,
        kind: "paragraph",
        text: instruction,
        sourceRef,
        provenance: task.fieldProvenance?.instruction || "generated",
        preserveUserText: task.fieldProvenance?.instruction === "user-edited"
      }];

      const comment = text(task.userComment);
      if (comment) {
        blocks.push({
          blockId: `block:comment:${stepKey}`,
          kind: "callout",
          calloutType: "note",
          sourceRef,
          blocks: [{
            blockId: `block:comment-text:${stepKey}`,
            kind: "paragraph",
            text: comment,
            sourceRef,
            provenance: task.fieldProvenance?.comment || "generated",
            preserveUserText: task.fieldProvenance?.comment === "user-edited"
          }]
        });
      }

      const screenshots = screenshotRefs(task);
      if (!screenshots.length) {
        diagnostics.push(diagnostic(
          "missing-screenshot",
          `$.tasks[${taskIndex}].screenshots`,
          "Task has no screenshot reference.",
          "info",
          sourceRef
        ));
      }
      const screenshotCounts = new Map();
      screenshots.forEach(screenshotRef => {
        const imageOccurrence =
          (screenshotCounts.get(screenshotRef) || 0) + 1;
        screenshotCounts.set(screenshotRef, imageOccurrence);
        let assetId = assetByScreenshot.get(screenshotRef);
        if (!assetId) {
          assetId = `asset:screenshot:${idPart(screenshotRef)}`;
          assetByScreenshot.set(screenshotRef, assetId);
          assets.push({
            assetId,
            kind: "image",
            sourceRef: { screenshotRef }
          });
        }
        if (!annotationRefsByScreenshot.has(screenshotRef)) {
          annotationRefsByScreenshot.set(
            screenshotRef,
            annotationRefsFor(review, screenshotRef, diagnostics)
          );
        }
        blocks.push({
          blockId: `block:image:${stepKey}:${idPart(screenshotRef)}:${imageOccurrence}`,
          kind: "image",
          assetId,
          sourceRef: { taskId: sourceTaskId, screenshotRef },
          annotationRefs: clone(annotationRefsByScreenshot.get(screenshotRef))
        });
      });

      workflowBlocks.push({
        blockId: `block:step:${stepKey}`,
        kind: "step",
        stepNumber: workflowBlocks.length + 1,
        sourceRef,
        interaction: clone(task),
        ...(task.screenshotSelection &&
          typeof task.screenshotSelection === "object"
          ? { screenshotSelection: clone(task.screenshotSelection) } : {}),
        blocks
      });
    });

    const referencedScreenshots = new Set(assetByScreenshot.keys());
    annotationSets(review).forEach((set, index) => {
      const screenshotRef = text(set?.screenshotRef);
      if (!screenshotRef) {
        diagnostics.push(diagnostic(
          "invalid-reference",
          `$.annotations.screenshotSets[${index}].screenshotRef`,
          "Annotation set has no screenshot reference."
        ));
      } else if (!referencedScreenshots.has(screenshotRef)) {
        diagnostics.push(diagnostic(
          "invalid-reference",
          `$.annotations.screenshotSets[${index}].screenshotRef`,
          "Annotation set references a screenshot not used by an active task.",
          "warning",
          { screenshotRef }
        ));
      }
    });

    const prerequisites = Array.isArray(options.prerequisites)
      ? options.prerequisites.map(text).filter(Boolean)
      : [...DEFAULT_PREREQUISITES];
    const expectedResult = text(options.expectedResult) ||
      DEFAULT_EXPECTED_RESULT;
    const sections = [{
      sectionId: "section:cover",
      kind: "cover",
      blocks: coverBlocks
    }, {
      sectionId: "section:purpose",
      kind: "purpose",
      blocks: [{
        blockId: "heading:purpose",
        kind: "heading",
        level: 1,
        text: "Syfte"
      }, {
        blockId: "paragraph:purpose",
        kind: "paragraph",
        text: metadata.purpose
      }]
    }, {
      sectionId: "section:prerequisites",
      kind: "prerequisites",
      blocks: [{
        blockId: "heading:prerequisites",
        kind: "heading",
        level: 1,
        text: "Förutsättningar"
      }, {
        blockId: "list:prerequisites",
        kind: "list",
        items: prerequisites.map((value, index) => ({
          itemId: `prerequisite:${index + 1}`,
          blocks: [{
            blockId: `paragraph:prerequisite:${index + 1}`,
            kind: "paragraph",
            text: value
          }]
        }))
      }]
    }, {
      sectionId: "section:workflow",
      kind: "workflow",
      blocks: [{
        blockId: "heading:workflow",
        kind: "heading",
        level: 1,
        text: "Arbetsgång"
      }, ...workflowBlocks]
    }, {
      sectionId: "section:expected-result",
      kind: "expectedResult",
      blocks: [{
        blockId: "heading:expected-result",
        kind: "heading",
        level: 1,
        text: "Förväntat resultat"
      }, {
        blockId: "paragraph:expected-result",
        kind: "paragraph",
        text: expectedResult
      }]
    }, {
      sectionId: "section:revision-history",
      kind: "revisionHistory",
      blocks: [{
        blockId: "heading:revision-history",
        kind: "heading",
        level: 1,
        text: "Versionshistorik"
      }, {
        blockId: "block:revision-history",
        kind: "revisionHistory",
        entries: [{
          revisionId: "revision:document:1",
          version: metadata.documentVersion,
          createdAt: metadata.updatedAt || metadata.createdAt,
          change: "Första version",
          reviewer: text(review.reviewer)
        }],
        sourceHistory: clone(Array.isArray(review.history) ? review.history : [])
      }]
    }];

    const document = model.normalize({
      documentId: `document:review:${idPart(sessionId || "unknown")}`,
      metadata,
      provenance: provenance(review, session, options.provenance),
      assets,
      sections
    });
    return model.deepFreeze({
      document,
      diagnostics: diagnostics.map(clone)
    });
  }

  return {
    ORIGIN,
    PROJECTOR_VERSION,
    project
  };
});
