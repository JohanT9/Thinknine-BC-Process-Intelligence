(function (root, factory) {
  const model = typeof module === "object" && module.exports
    ? require("./semantic-document")
    : root.T9DocumentModel;
  const api = factory(model);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewDocumentProjector = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (model) {
  const PROJECTOR_VERSION = "1.0.0";
  const ORIGIN = "review-document-projector";

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
      title: firstText(review.sessionName, session.name),
      sessionId: firstText(review.sessionId, session.id),
      status: text(review.status),
      reviewer: text(review.reviewer),
      notes: text(review.notes),
      purpose: text(session.purpose),
      environment: text(session.settings?.environmentName),
      documentationProfile: text(session.settings?.documentationProfile),
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
    const review = object(reviewValue);
    const session = object(options.session);
    const diagnostics = [];
    const metadata = projectMetadata(review, session);
    const sessionId = metadata.sessionId;

    if (!metadata.title) {
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
    if (metadata.purpose) {
      coverBlocks.push({
        blockId: "block:cover:purpose",
        kind: "paragraph",
        text: metadata.purpose
      });
    }

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
      const sourceRef = { taskId: sourceTaskId };
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
        sourceRef
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
            sourceRef
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

    const sections = [{
      sectionId: "section:cover",
      kind: "cover",
      blocks: coverBlocks
    }, {
      sectionId: "section:workflow",
      kind: "workflow",
      blocks: workflowBlocks
    }];

    if (Array.isArray(review.history) && review.history.length) {
      sections.push({
        sectionId: "section:revision-history",
        kind: "revisionHistory",
        blocks: [{
          blockId: "block:revision-history",
          kind: "revisionHistory",
          entries: review.history.map((entry, index) => ({
            revisionId: `revision:${idPart(entry?.historyId || index + 1)}:${index + 1}`,
            type: text(entry?.type),
            createdAt: text(entry?.createdAt),
            sourceHistoryId: text(entry?.historyId)
          }))
        }]
      });
    }

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
