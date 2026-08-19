const { execFileSync } = require("child_process");
const path = require("path");
const source = require("./release-source");

const root = path.resolve(__dirname, "..");
const allowDirty = process.env.PILOT_ALLOW_DIRTY === "1" ||
  process.argv.includes("--allow-dirty");
const sourceState = source.inspectSource({ cwd: root, allowDirty });
if (sourceState.developmentOverride) {
  console.warn("WARNING: dirty-tree development override; not publishable.");
}

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("release:pilot must be started through npm");
execFileSync(process.execPath, [npmCli, "run", "release:verify"], {
  cwd: root, stdio: "inherit"
});
const args = [path.join("scripts", "release.js"), "--pilot",
  `--git-commit=${sourceState.gitCommit}`];
if (!sourceState.clean) args.push("--source-dirty");
const idArgument = process.argv.find(value => value.startsWith("--extension-id="));
if (idArgument) args.push(idArgument);
execFileSync(process.execPath, args, { cwd: root, stdio: "inherit",
  env: { ...process.env, RELEASE_CHANNEL: "pilot" } });
