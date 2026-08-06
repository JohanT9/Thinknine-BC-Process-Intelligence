(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9AsyncOperations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function withTimeout(promise, milliseconds, label, timers = {}) {
    const schedule = timers.setTimeout || setTimeout;
    const cancel = timers.clearTimeout || clearTimeout;
    return new Promise((resolve, reject) => {
      const timer = schedule(() => reject(
        new Error(`${label} tog för lång tid.`)
      ), milliseconds);
      Promise.resolve(promise).then(
        value => {
          cancel(timer);
          resolve(value);
        },
        error => {
          cancel(timer);
          reject(error);
        }
      );
    });
  }

  function singleFlight(operation) {
    let pending = null;
    return function run(...args) {
      if (pending) return pending;
      pending = Promise.resolve().then(() => operation(...args)).finally(() => {
        pending = null;
      });
      return pending;
    };
  }

  return { singleFlight, withTimeout };
});
