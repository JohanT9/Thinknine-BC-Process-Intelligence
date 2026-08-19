const { execFileSync } = require("child_process");

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("release:verify must be started through npm");
const commands = [
  "ci",
  "test:step-editor",
  "test:step-structure",
  "test:manual-steps",
  "test:notes-annotations",
  "test:hierarchy",
  "test:process-model",
  "test:process-versioning",
  "test:regeneration",
  "test:pilot-compatibility"
];

for (const command of commands) {
  execFileSync(process.execPath, [npmCli, "run", command], {
    stdio: "inherit"
  });
}

console.log("Pilot release verification gate passed.");
