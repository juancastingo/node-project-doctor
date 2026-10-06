import fs from "node:fs";
import path from "node:path";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface DiagnosticIssue {
  id: string;
  severity: DiagnosticSeverity;
  title: string;
  message: string;
  remediation: string;
}

export interface DoctorReport {
  projectPath: string;
  packageName: string;
  packageVersion: string;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  isHealthy: boolean;
  issues: DiagnosticIssue[];
}

const KNOWN_DEV_ONLY_PACKAGES = new Set([
  "typescript",
  "tsup",
  "esbuild",
  "vite",
  "vitest",
  "jest",
  "mocha",
  "eslint",
  "prettier",
  "tsx",
  "nodemon",
  "rimraf",
  "husky",
  "lint-staged",
  "ts-node",
]);

export async function diagnoseProject(projectDir: string = process.cwd()): Promise<DoctorReport> {
  const issues: DiagnosticIssue[] = [];
  const pkgPath = path.join(projectDir, "package.json");

  if (!fs.existsSync(pkgPath)) {
    issues.push({
      id: "PKG-000",
      severity: "error",
      title: "Missing package.json",
      message: `No package.json file was found at ${projectDir}.`,
      remediation: "Initialize a Node.js project by running `npm init` or `pnpm init`.",
    });

    return {
      projectPath: projectDir,
      packageName: "unknown",
      packageVersion: "0.0.0",
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      isHealthy: false,
      issues,
    };
  }

  let pkg: any = {};
  try {
    const raw = fs.readFileSync(pkgPath, "utf-8");
    pkg = JSON.parse(raw);
  } catch (err: any) {
    issues.push({
      id: "PKG-001",
      severity: "error",
      title: "Malformed package.json",
      message: `Failed to parse package.json as valid JSON: ${err.message}`,
      remediation: "Fix the syntax errors in your package.json file.",
    });

    return {
      projectPath: projectDir,
      packageName: "invalid",
      packageVersion: "0.0.0",
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      isHealthy: false,
      issues,
    };
  }

  const pkgName = pkg.name || "(unnamed)";
  const pkgVersion = pkg.version || "0.0.0";

  // Check 1: Engines vs Running Node version
  if (pkg.engines?.node) {
    const nodeRequirement = pkg.engines.node;
    const currentVersion = process.version; // e.g. "v20.19.2"
    // Basic semver check for minimum version
    const minMatch = nodeRequirement.match(/>=?\s*(\d+)/);
    if (minMatch) {
      const requiredMajor = parseInt(minMatch[1], 10);
      const currentMajor = parseInt(currentVersion.replace("v", "").split(".")[0], 10);
      if (currentMajor < requiredMajor) {
        issues.push({
          id: "ENGINES-001",
          severity: "error",
          title: "Node.js Engine Mismatch",
          message: `Your current Node.js runtime (${currentVersion}) is older than the required engine (${nodeRequirement}).`,
          remediation: `Upgrade Node.js to match '${nodeRequirement}' using nvm or fnm (e.g. \`nvm install ${requiredMajor}\`).`,
        });
      }
    }
  }

  // Check 2: Conflicting Lockfiles
  const lockfiles = [
    { name: "package-lock.json", manager: "npm" },
    { name: "yarn.lock", manager: "yarn" },
    { name: "pnpm-lock.yaml", manager: "pnpm" },
    { name: "bun.lockb", manager: "bun" },
    { name: "bun.lock", manager: "bun" },
  ];

  const presentLockfiles = lockfiles.filter((lf) =>
    fs.existsSync(path.join(projectDir, lf.name))
  );

  if (presentLockfiles.length > 1) {
    const names = presentLockfiles.map((l) => l.name).join(", ");
    issues.push({
      id: "LOCKFILE-001",
      severity: "warning",
      title: "Multiple Conflicting Lockfiles Detected",
      message: `Found multiple lockfiles (${names}). This causes inconsistent installs and dependency tree divergence across team members and CI.`,
      remediation: `Standardize on one package manager and delete the conflicting lockfile(s).`,
    });
  } else if (presentLockfiles.length === 0 && (pkg.dependencies || pkg.devDependencies)) {
    issues.push({
      id: "LOCKFILE-002",
      severity: "warning",
      title: "Missing Dependency Lockfile",
      message: "No lockfile found. Build reproducibility in CI and production cannot be guaranteed.",
      remediation: "Run `npm install`, `pnpm install`, or `yarn install` to generate a lockfile and commit it to git.",
    });
  }

  // Check 3: Dev dependencies misplaced in dependencies
  if (pkg.dependencies) {
    const misplaced: string[] = [];
    for (const dep of Object.keys(pkg.dependencies)) {
      if (KNOWN_DEV_ONLY_PACKAGES.has(dep) || dep.startsWith("@types/")) {
        misplaced.push(dep);
      }
    }

    if (misplaced.length > 0) {
      issues.push({
        id: "DEP-001",
        severity: "warning",
        title: "Development Tools in Production Dependencies",
        message: `Found dev-only packages in 'dependencies': ${misplaced.join(", ")}. This inflates production container images and deployment bundle sizes.`,
        remediation: `Move them to 'devDependencies' (e.g. \`npm install -D ${misplaced.join(" ")}\`).`,
      });
    }

    // Check wildcard versions
    const riskyVersions: string[] = [];
    for (const [dep, ver] of Object.entries<string>(pkg.dependencies)) {
      if (ver === "*" || ver === "latest") {
        riskyVersions.push(`${dep}@${ver}`);
      }
    }

    if (riskyVersions.length > 0) {
      issues.push({
        id: "DEP-002",
        severity: "warning",
        title: "Unpinned Wildcard Dependencies",
        message: `Dependencies using '*' or 'latest' ranges: ${riskyVersions.join(", ")}. This exposes builds to breaking upstream changes.`,
        remediation: "Pin dependencies to specific semantic version ranges (e.g. `^1.2.0`).",
      });
    }
  }

  // Check 4: Essential package metadata
  if (!pkg.license) {
    issues.push({
      id: "META-001",
      severity: "info",
      title: "Missing License Field",
      message: "No 'license' field specified in package.json.",
      remediation: "Add a license field (e.g. `\"license\": \"MIT\"`).",
    });
  }

  if (!pkg.scripts?.test) {
    issues.push({
      id: "META-002",
      severity: "info",
      title: "Missing Test Script",
      message: "No 'test' script defined in package.json 'scripts'.",
      remediation: "Add an automated test script under 'scripts' in package.json.",
    });
  }

  // Check 5: .gitignore hygiene
  const gitignorePath = path.join(projectDir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
    if (!gitignoreContent.includes("node_modules")) {
      issues.push({
        id: "GIT-001",
        severity: "error",
        title: ".gitignore Missing 'node_modules'",
        message: "Your .gitignore does not exclude 'node_modules'. Large dependency binaries might get committed to git.",
        remediation: "Add `node_modules/` to your .gitignore file.",
      });
    }
    if (!gitignoreContent.includes(".env")) {
      issues.push({
        id: "GIT-002",
        severity: "warning",
        title: ".gitignore Missing '.env'",
        message: "Your .gitignore does not exclude '.env' files. Environment secrets risk being committed to repository history.",
        remediation: "Add `.env` and `.env.*` (except `.env.example`) to your .gitignore.",
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return {
    projectPath: projectDir,
    packageName: pkgName,
    packageVersion: pkgVersion,
    errorCount,
    warningCount,
    infoCount,
    isHealthy: errorCount === 0 && warningCount === 0,
    issues,
  };
}

export function formatReport(report: DoctorReport): string {
  const lines: string[] = [];
  lines.push("════════════════════════════════════════════════════════════════════");
  lines.push(` 🩺 Node Project Doctor: ${report.packageName}@${report.packageVersion}`);
  lines.push(` Path: ${report.projectPath}`);
  lines.push("════════════════════════════════════════════════════════════════════");
  lines.push(
    ` Summary: Errors: ${report.errorCount} | Warnings: ${report.warningCount} | Info: ${report.infoCount}`
  );
  lines.push("────────────────────────────────────────────────────────────────────");

  if (report.issues.length === 0) {
    lines.push(" ✓ Clean bill of health! No project configuration issues detected.");
    lines.push("════════════════════════════════════════════════════════════════════");
    return lines.join("\n");
  }

  for (const issue of report.issues) {
    const badge =
      issue.severity === "error"
        ? "[ERROR]"
        : issue.severity === "warning"
        ? "[WARN] "
        : "[INFO] ";
    lines.push(` ${badge} ${issue.title} (${issue.id})`);
    lines.push(`        Problem: ${issue.message}`);
    lines.push(`        Action:  → ${issue.remediation}`);
    lines.push("");
  }

  lines.push("════════════════════════════════════════════════════════════════════");
  return lines.join("\n");
}
