import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { diagnoseProject } from "../src/index.js";

describe("node-project-doctor audit rules", () => {
  test("detects missing package.json", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doc-test-1-"));
    const report = await diagnoseProject(tmp);

    assert.equal(report.isHealthy, false);
    assert.equal(report.errorCount, 1);
    assert(report.issues.some((i) => i.id === "PKG-000"));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("detects dev dependencies misplaced in dependencies", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doc-test-2-"));
    const pkg = {
      name: "sample-app",
      version: "1.0.0",
      license: "MIT",
      scripts: { test: "echo ok" },
      dependencies: {
        express: "^4.19.0",
        typescript: "^5.0.0", // misplaced!
        "@types/node": "^20.0.0", // misplaced!
      },
    };
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify(pkg));
    fs.writeFileSync(path.join(tmp, "package-lock.json"), "{}");

    const report = await diagnoseProject(tmp);
    assert(report.issues.some((i) => i.id === "DEP-001"));
    const issue = report.issues.find((i) => i.id === "DEP-001")!;
    assert(issue.message.includes("typescript"));
    assert(issue.message.includes("@types/node"));

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("detects multiple conflicting lockfiles", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doc-test-3-"));
    const pkg = {
      name: "sample-app",
      version: "1.0.0",
      license: "MIT",
      scripts: { test: "echo ok" },
      dependencies: { express: "^4.19.0" },
    };
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify(pkg));
    fs.writeFileSync(path.join(tmp, "package-lock.json"), "{}");
    fs.writeFileSync(path.join(tmp, "yarn.lock"), "");

    const report = await diagnoseProject(tmp);
    assert(report.issues.some((i) => i.id === "LOCKFILE-001"));

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("detects missing gitignore entries for node_modules and .env", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doc-test-4-"));
    const pkg = {
      name: "sample-app",
      version: "1.0.0",
      license: "MIT",
      scripts: { test: "echo ok" },
    };
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify(pkg));
    fs.writeFileSync(path.join(tmp, ".gitignore"), "# empty gitignore\nbuild/\n");

    const report = await diagnoseProject(tmp);
    assert(report.issues.some((i) => i.id === "GIT-001"));
    assert(report.issues.some((i) => i.id === "GIT-002"));

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
