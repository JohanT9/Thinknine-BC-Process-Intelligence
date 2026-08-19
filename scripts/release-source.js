const { execFileSync } = require("child_process");

function statusEntries(output) {
  return String(output || "").split(/\r?\n/u).filter(Boolean);
}

function inspectSource(options = {}) {
  const cwd = options.cwd || process.cwd();
  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd, encoding: "utf8"
  });
  const dirtyEntries = statusEntries(status);
  const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd, encoding: "utf8"
  }).trim();
  const allowDirty = options.allowDirty === true;
  if (dirtyEntries.length && !allowDirty) {
    throw new Error(
      "Pilot releases require a clean Git working tree. " +
      "PILOT_ALLOW_DIRTY=1 is development-only."
    );
  }
  return { clean: dirtyEntries.length === 0, dirtyEntries, gitCommit,
    developmentOverride: Boolean(dirtyEntries.length && allowDirty) };
}

module.exports = { inspectSource, statusEntries };
