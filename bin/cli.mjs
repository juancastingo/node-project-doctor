#!/usr/bin/env node

import { diagnoseProject, formatReport } from "../dist/index.mjs";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const failOnError = args.includes("--fail-on-error") || args.includes("--strict");

const targetDir = args.find((a) => !a.startsWith("-")) || process.cwd();

async function run() {
  const report = await diagnoseProject(targetDir);

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReport(report));
  }

  if (failOnError && report.errorCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Node Project Doctor failed:", err);
  process.exit(2);
});
