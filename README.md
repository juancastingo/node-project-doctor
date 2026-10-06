# 🩺 Node Project Doctor

[![CI](https://github.com/juancastingo/node-project-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/juancastingo/node-project-doctor/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/node-project-doctor.svg)](https://www.npmjs.com/package/node-project-doctor)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)

**Node Project Doctor** is an actionable audit CLI and diagnostics library for Node.js repositories. It catches common configuration smells, version divergences, conflicting lockfiles, and `package.json` blunders before they disrupt CI/CD or inflate container images.

---

## 📸 Preview

```text
════════════════════════════════════════════════════════════════════
 🩺 Node Project Doctor: my-service@1.0.0
 Path: /home/developer/projects/my-service
════════════════════════════════════════════════════════════════════
 Summary: Errors: 1 | Warnings: 2 | Info: 1
────────────────────────────────────────────────────────────────────
 [ERROR] Node.js Engine Mismatch (ENGINES-001)
        Problem: Your current Node.js runtime (v18.16.0) is older than required (>=20.0.0).
        Action:  → Upgrade Node.js using nvm or fnm (e.g. `nvm install 20`).

 [WARN]  Multiple Conflicting Lockfiles Detected (LOCKFILE-001)
        Problem: Found multiple lockfiles (package-lock.json, pnpm-lock.yaml).
        Action:  → Standardize on one package manager and delete the conflicting lockfile.

 [WARN]  Development Tools in Production Dependencies (DEP-001)
        Problem: Found dev-only packages in 'dependencies': typescript, tsup, @types/node.
        Action:  → Move them to 'devDependencies' (`npm install -D typescript tsup @types/node`).

 [WARN]  .gitignore Missing '.env' (GIT-002)
        Problem: Your .gitignore does not exclude '.env' files.
        Action:  → Add `.env` and `.env.*` (except `.env.example`) to your .gitignore.
════════════════════════════════════════════════════════════════════
```

---

## ✨ Rules Checked

| Code | Severity | Description |
|---|---|---|
| `ENGINES-001` | Error | Current runtime version violates `engines.node` specification |
| `LOCKFILE-001` | Warning | Conflicting lockfiles detected (`package-lock.json` + `pnpm-lock.yaml` / `yarn.lock`) |
| `LOCKFILE-002` | Warning | Missing lockfile in root despite active dependencies |
| `DEP-001` | Warning | Dev packages (`typescript`, `vite`, `eslint`, `@types/*`) misplaced in `dependencies` |
| `DEP-002` | Warning | Wildcard or unpinned dependency ranges (`"*"`, `"latest"`) |
| `GIT-001` | Error | `.gitignore` does not exclude `node_modules` |
| `GIT-002` | Warning | `.gitignore` does not exclude `.env` files |
| `META-001` | Info | Missing `license` specification |
| `META-002` | Info | Missing automated `test` script in `scripts` |

---

## 🚀 Instant Run (Zero Install)

```bash
npx node-project-doctor
```

Or install globally:
```bash
npm install -g node-project-doctor
node-project-doctor
```

---

## ⚙️ CLI Options

```bash
# Output structured JSON for automated pipelines
node-project-doctor --json

# Fail with non-zero exit code if errors are found (CI gate)
node-project-doctor --fail-on-error

# Run diagnostics against another directory
node-project-doctor ./packages/my-subpackage
```

---

## 📦 Programmatic Library API

You can also import Node Project Doctor into build scripts, dev tools, or custom monorepo linting scripts:

```typescript
import { diagnoseProject, formatReport } from "node-project-doctor";

const report = await diagnoseProject("./my-project");

if (!report.isHealthy) {
  console.log(formatReport(report));
}
```

---

## 🧪 Testing

```bash
npm test
npm run lint
npm run build
```

---

## 📄 License

MIT © [Juan Castiñeira](https://github.com/juancastingo)
