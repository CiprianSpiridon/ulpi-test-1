---
name: ulpi-rebuild
description: |
  Rebuild the ULPI monorepo with correct build order, type checking, and output verification.
  Triggers on /ulpi-rebuild, "rebuild", "build", "verify build", "clean build", "fix build", "build failed".
  Supports smart (git diff), full (clean), single-package, and recovery modes.
  Handles 12 packages + 3 apps with automatic dependency ordering via pnpm.
---

<EXTREMELY-IMPORTANT>
Before running ANY build, you **ABSOLUTELY MUST** know these facts:

1. **`pnpm -r build` handles dependency order automatically** — Contracts → Config → Engines → API → CLI → Web UI
2. **Root `tsc --noEmit` does NOT work** — use `pnpm lint` which runs per-package `tsc --noEmit`
3. **Always verify build outputs exist** with reasonable file sizes after building
4. **Never commit with a broken build** — fix first, then commit
5. **Web UI must build before CLI** — CLI's tsup onSuccess copies `apps/web-ui/dist/index.html` to `dist/ui.html`

**Building without following these rules = cascading failures, stale artifacts, wasted debugging time**
</EXTREMELY-IMPORTANT>

# Rebuild: Build System Workflow

## MANDATORY FIRST RESPONSE PROTOCOL

Before running ANY build command, you **MUST** complete this checklist:

1. ☐ Run `git diff --name-only HEAD` to detect changed files
2. ☐ Map changed files to affected packages (see mapping table below)
3. ☐ Determine rebuild scope: smart / full / single / recovery
4. ☐ Check if `dist/` directories exist for required packages
5. ☐ Announce: "Rebuilding [scope]: [packages]"

## Overview

Rebuild the ULPI monorepo (12 packages + 3 apps) with correct dependency order, type safety verification, and output validation.

## When to Use

- User says "rebuild", "build", "verify build", "clean build", "fix build", or `/ulpi-rebuild`
- Build errors are encountered during development
- After making changes across multiple packages
- Before committing to verify everything compiles
- $ARGUMENTS provided as scope hint (e.g., `/ulpi-rebuild full`, `/ulpi-rebuild cli`)

## Package Map

### Foundation Layer (build first)

| Package | Build | Output |
|---------|-------|--------|
| `@ulpi/contracts` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/config` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |

### Engine Layer (depends on foundation)

| Package | Build | Output |
|---------|-------|--------|
| `@ulpi/guards-engine` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/session-engine` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/stack-engine` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/templates-engine` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/notifications-engine` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/projects-engine` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/history-engine` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/review-engine` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/review-runtime` | `tsup src/index.ts --format esm --dts` | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/api-client` | `tsup` (tsup.config.ts) | `dist/index.js` + `dist/index.d.ts` |

### App Layer (depends on engines)

| App | Build | Output |
|-----|-------|--------|
| `@ulpi/api` | `tsup` (tsup.config.ts) | `dist/index.js` + `dist/index.d.ts` |
| `@ulpi/cli` | `tsup` (tsup.config.ts) | `dist/index.js` + `dist/ui.html` + `dist/skills/` |
| `@ulpi/web-ui` | `vite build` | `dist/index.html` (single-file SPA) |

## Step 1: Assess Scope

**Gate: Scope determined before proceeding to Step 2.**

Determine the rebuild type from $ARGUMENTS or context:

| Argument | Rebuild Type | Description |
|----------|-------------|-------------|
| *(none)* | **Smart** | `git diff` detects which packages changed |
| `full` or `clean` | **Full** | Clean all dist, lint, build all, test |
| Package name (e.g., `cli`, `api`, `config`) | **Single** | Build that package only |
| *(build error context)* | **Recovery** | Diagnose error, then targeted rebuild |

### Smart Mode Detection

```bash
# Detect changed files since last commit
git diff --name-only HEAD

# Also check staged changes
git diff --name-only --cached
```

Map files to packages:

| Path Pattern | Package |
|-------------|---------|
| `packages/contracts/**` | @ulpi/contracts |
| `packages/config/**` | @ulpi/config |
| `packages/guards-engine/**` | @ulpi/guards-engine |
| `packages/session-engine/**` | @ulpi/session-engine |
| `packages/stack-engine/**` | @ulpi/stack-engine |
| `packages/templates-engine/**` | @ulpi/templates-engine |
| `packages/notifications-engine/**` | @ulpi/notifications-engine |
| `packages/projects-engine/**` | @ulpi/projects-engine |
| `packages/history-engine/**` | @ulpi/history-engine |
| `packages/review-engine/**` | @ulpi/review-engine |
| `packages/review-runtime/**` | @ulpi/review-runtime |
| `packages/api-client/**` | @ulpi/api-client |
| `apps/api/**` | @ulpi/api |
| `apps/cli/**` | @ulpi/cli |
| `apps/web-ui/**` | @ulpi/web-ui |
| `package.json` or `pnpm-lock.yaml` | Full rebuild recommended |

If no files changed, announce "No changes detected — skipping build" and exit.

**Foundation changes cascade:** If contracts or config changed, rebuild all dependent packages too.

### Single Package Prerequisites

Before building a single package, verify its dependencies are built:

| Package | Prerequisites |
|---------|--------------|
| Foundation (contracts, config) | None |
| Any engine | contracts + config dist must exist |
| @ulpi/api | Engine packages it depends on |
| @ulpi/cli | All engines + api + web-ui (copies ui.html) |
| @ulpi/web-ui | None (standalone React SPA) |

If prerequisites are missing, build them first — or just run `pnpm -r build`.

### Recovery Mode

When a build error is provided or detected:

1. Read the error message carefully
2. Identify which package failed
3. Check if the failure is a type error (run `pnpm lint` first) or a build error
4. Fix the root cause before rebuilding
5. Rebuild only the affected package and its dependents

## Step 2: Clean (Full/Clean Mode Only)

**Gate: dist directories removed before proceeding to Step 3.**

Only run this step for `full` or `clean` rebuilds:

```bash
pnpm -r clean
```

## Step 3: TypeScript Check

**Gate: No type errors before proceeding to Step 4.**

```bash
pnpm lint
```

This runs per-package `tsc --noEmit` across the monorepo.

**IMPORTANT:** Do NOT run `tsc --noEmit` at the root — it does not work for this monorepo. Always use `pnpm lint`.

If type errors are found:
1. Read each error carefully
2. Fix errors in the correct package
3. Re-run `pnpm lint` to verify fixes
4. Do NOT proceed to build until all type errors are resolved

## Step 4: Build Packages

**Gate: All packages built successfully before proceeding to Step 5.**

### Full Build (Recommended)

```bash
pnpm -r build
```

pnpm resolves dependency order from workspace references automatically:
Contracts → Config → Engines → API Client → API → Web UI → CLI

### Single Package Build

```bash
pnpm --filter @ulpi/<name> build
```

Examples:
```bash
pnpm --filter @ulpi/contracts build
pnpm --filter @ulpi/guards-engine build
pnpm --filter @ulpi/cli build
```

### CLI Post-Build Verification

After building CLI, verify the onSuccess hook copied artifacts:
- `apps/cli/dist/ui.html` — copied from web-ui build output
- `apps/cli/dist/skills/ulpi-generate-guardian/` — copied from `.claude/skills/`

## Step 5: Verify Build Outputs

**Gate: All output checks pass before proceeding to Step 6.**

```bash
# Foundation
ls -la packages/contracts/dist/index.js packages/contracts/dist/index.d.ts
ls -la packages/config/dist/index.js packages/config/dist/index.d.ts

# Engines (spot check a few)
ls -la packages/guards-engine/dist/index.js
ls -la packages/session-engine/dist/index.js
ls -la packages/history-engine/dist/index.js

# Apps
ls -la apps/api/dist/index.js
ls -la apps/web-ui/dist/index.html
ls -la apps/cli/dist/index.js
ls -la apps/cli/dist/ui.html

# Version injection check — should NOT contain the literal string
grep -c '__ULPI_VERSION__' apps/cli/dist/index.js || true
```

### Expected Output Sizes

| Check | Path | Expected |
|-------|------|----------|
| Contracts JS | `packages/contracts/dist/index.js` | ~5-15 KB |
| Contracts DTS | `packages/contracts/dist/index.d.ts` | ~20-50 KB |
| Web UI HTML | `apps/web-ui/dist/index.html` | ~400-500 KB |
| CLI Entry | `apps/cli/dist/index.js` | ~15-25 KB |
| CLI UI HTML | `apps/cli/dist/ui.html` | ~400-500 KB |
| CLI Skill | `apps/cli/dist/skills/ulpi-generate-guardian/` | Exists |

### Version Injection

The CLI entry point should have the version string injected, NOT the literal `__ULPI_VERSION__`:

```bash
# Should return 0 matches (version was replaced)
grep -c '__ULPI_VERSION__' apps/cli/dist/index.js
```

## Step 6: Run Tests

**Gate: Tests pass before marking rebuild complete.**

```bash
pnpm test
```

This runs vitest across the workspace (guards-engine, session-engine, history-engine).

If tests fail:
1. Read the failure output
2. Determine if the failure is in changed code or pre-existing
3. Fix test failures before declaring the build complete
4. Re-run tests to confirm

## Step 7: Report

**Gate: Report delivered to user.**

### Quality Score (5 categories x 2 points = 10)

| Category | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Scope Assessment | Built wrong packages | Correct packages, no prereq check | Correct scope + prerequisites verified |
| Build Order | Wrong order | Correct order, no dependency check | Correct order + dependency verification |
| Output Verification | Skipped | Partial checks | All outputs verified with sizes |
| Type Safety | Skipped | Ran but proceeded with errors | Clean pass (or errors fixed first) |
| Test Verification | Skipped | Ran but didn't fix failures | All tests pass |

**Minimum passing score: 8/10**

---

## Safety Rules

| Rule | Reason |
|------|--------|
| Never build CLI before web-ui | CLI's onSuccess copies web-ui HTML — will be missing |
| Never use root `tsc --noEmit` | Doesn't resolve monorepo paths — use `pnpm lint` |
| Never skip output verification | Stale dist artifacts cause subtle runtime errors |
| Never commit a broken build | Run `/ulpi-rebuild` before `/commit` when in doubt |
| Never ignore type errors | Type errors cascade into runtime failures |
| Foundation changes cascade | contracts/config changes affect all downstream packages |

---

## Common Rationalizations (All Wrong)

- **"Only CLI changed, I'll just build CLI"** → Did any engine types change too? Check first.
- **"pnpm -r build handles order"** → It usually does, but VERIFY outputs after.
- **"Type check is slow, I'll skip it"** → Type errors caught now save hours of debugging later.
- **"The tests are unrelated"** → Run them anyway — build changes can break anything.
- **"Root tsc should work fine"** → It does NOT work for this monorepo. Use `pnpm lint`.

---

## Failure Modes

### Failure Mode 1: Missing ui.html in CLI Dist

**Symptom:** UI server serves 404, web UI doesn't load
**Fix:** Build web-ui first: `pnpm --filter @ulpi/web-ui build`, then rebuild CLI

### Failure Mode 2: Stale Engine Types

**Symptom:** CLI or API imports fail or use stale types at runtime
**Fix:** Rebuild the affected engine package first, then rebuild downstream consumers

### Failure Mode 3: Using Root tsc --noEmit

**Symptom:** False type errors or missed real errors
**Fix:** Always use `pnpm lint` which runs per-package tsc --noEmit

### Failure Mode 4: Version Not Injected

**Symptom:** CLI reports version as `__ULPI_VERSION__` literal string
**Fix:** Check `apps/cli/tsup.config.ts` define config, ensure version in package.json, rebuild CLI

### Failure Mode 5: Foundation Change Not Propagated

**Symptom:** Downstream packages use stale types from contracts or config
**Fix:** After changing contracts or config, run `pnpm -r build` (full rebuild) to propagate

---

## Quick Workflow Summary

```
STEP 1: ASSESS SCOPE
├── git diff → detect changed packages
├── Check $ARGUMENTS (full/cli/api/config/etc.)
├── Determine: smart / full / single / recovery
└── Gate: Scope determined

STEP 2: CLEAN (full/clean only)
├── pnpm -r clean
└── Gate: Clean slate

STEP 3: TYPE CHECK
├── pnpm lint (NOT root tsc --noEmit)
├── Fix any type errors
└── Gate: Zero type errors

STEP 4: BUILD PACKAGES
├── pnpm -r build (handles dependency order)
├── Or: pnpm --filter @ulpi/<name> build (single)
└── Gate: All builds succeed

STEP 5: VERIFY OUTPUTS
├── Foundation: contracts + config dist files
├── Engines: spot-check dist/index.js files
├── Apps: api, web-ui, cli dist outputs
├── CLI: ui.html + skills/ copied
├── Version: no __ULPI_VERSION__ literal
└── Gate: All outputs verified

STEP 6: RUN TESTS
├── pnpm test
├── Fix failures if any
└── Gate: Tests pass

STEP 7: REPORT
├── Quality score (X/10)
├── Build results summary
└── Announce completion
```

---

## Completion Announcement

```
Rebuild complete.

**Quality Score: X/10**
- Scope Assessment: X/2
- Build Order: X/2
- Output Verification: X/2
- Type Safety: X/2
- Test Verification: X/2

**Build Results:**
| Layer | Package | Status |
|-------|---------|--------|
| Foundation | contracts, config | OK |
| Engines | guards, session, stack, templates, notifications, projects, history, review, review-runtime, api-client | OK |
| Apps | api, web-ui, cli | OK |

**Checks:**
- Type errors: None
- Tests: X passed, 0 failed
- Version injected: Yes
- CLI artifacts: ui.html + skills copied
```

---

## Integration with Other Skills

- **`commit`** — Run `/ulpi-rebuild` before `/commit` to ensure clean build state
- **`start`** — When starting work, `/ulpi-rebuild` verifies the codebase compiles
- **`create-pr`** — Run `/ulpi-rebuild full` before creating a PR to verify everything
- **`update-claude-md-after-install-monorepo`** — After rebuild, run this if packages were added/removed

```
Code changes made
       │
       ▼
/ulpi-rebuild (verify build)
       │
       ▼
/commit (commit changes)
       │
       ▼
/create-pr (submit for review)
```
