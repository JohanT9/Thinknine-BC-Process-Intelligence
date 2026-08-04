(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Review = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeTasks(tasks) {
    return (tasks || []).map((task, index) => ({
      ...clone(task),
      taskNo: index + 1,
      reviewStatus: task.reviewStatus || "unreviewed",
      approved: Boolean(task.approved),
      deleted: Boolean(task.deleted),
      userComment: task.userComment || "",
      originalInstruction:
        task.originalInstruction ||
        task.instruction ||
        "",
      instruction:
        task.instruction ||
        task.description ||
        "Utför uppgiften."
    }));
  }

  function createReview(session, tasks) {
    const now = new Date().toISOString();
    return {
      reviewVersion: "1.0.0",
      sessionId: session.id,
      sessionName: session.name,
      createdAt: now,
      updatedAt: now,
      status: "in-progress",
      reviewer: "",
      notes: "",
      tasks: normalizeTasks(tasks)
    };
  }

  function renumber(review) {
    review.tasks = review.tasks.map((task, index) => ({
      ...task,
      taskNo: index + 1
    }));
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function move(review, index, delta) {
    const target = index + delta;
    if (target < 0 || target >= review.tasks.length) return review;

    const tasks = [...review.tasks];
    const [task] = tasks.splice(index, 1);
    tasks.splice(target, 0, task);
    review.tasks = tasks;
    return renumber(review);
  }

  function remove(review, index) {
    review.tasks.splice(index, 1);
    return renumber(review);
  }

  function add(review, afterIndex = review.tasks.length - 1) {
    const newTask = {
      taskId: `Manual-${Date.now()}`,
      taskNo: 0,
      taskType: "Manual",
      semanticAction: "Manual",
      instruction: "Nytt manuellt steg.",
      originalInstruction: "",
      pageCaption: "",
      actionCaption: "",
      fieldCaption: "",
      selectedCaption: "",
      screenshot: null,
      confidenceScore: 100,
      reviewStatus: "edited",
      approved: false,
      deleted: false,
      userComment: "",
      manuallyAdded: true,
      sourceEventNos: []
    };

    review.tasks.splice(afterIndex + 1, 0, newTask);
    return renumber(review);
  }

  function updateTask(review, index, patch) {
    review.tasks[index] = {
      ...review.tasks[index],
      ...patch,
      reviewStatus:
        patch.instruction !== undefined ||
        patch.userComment !== undefined
          ? "edited"
          : review.tasks[index].reviewStatus
    };
    review.updatedAt = new Date().toISOString();
    return review;
  }

  function approveTask(review, index, approved) {
    return updateTask(review, index, {
      approved: Boolean(approved),
      reviewStatus: approved ? "approved" : "unreviewed"
    });
  }

  function complete(review) {
    review.status = "completed";
    review.updatedAt = new Date().toISOString();
    review.tasks = review.tasks.map(task => ({
      ...task,
      approved: true,
      reviewStatus: "approved"
    }));
    return review;
  }

  function activeTasks(review) {
    return review.tasks.filter(task => !task.deleted);
  }

  function progress(review) {
    const tasks = activeTasks(review);
    if (!tasks.length) return 0;
    return Math.round(
      tasks.filter(task => task.approved).length /
      tasks.length * 100
    );
  }

  return {
    createReview,
    normalizeTasks,
    renumber,
    move,
    remove,
    add,
    updateTask,
    approveTask,
    complete,
    activeTasks,
    progress
  };
});
