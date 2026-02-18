---
name: ulpi-generate-guards
description: Use when the user asks to generate ULPI configuration for a project. Detects language, framework, package manager, and tooling to create optimized guards.yml with preconditions, permissions, postconditions, and pipelines. Invoke via /ulpi-generate-guards or when user says "generate guards", "create guards.yml", "setup ulpi", "configure guardian".
---

<EXTREMELY-IMPORTANT>
Before generating ANY guards.yml configuration, you **ABSOLUTELY MUST**:

1. Verify the target directory exists
2. Check for existing `.ulpi/guards.yml` (ask before overwriting)
3. Detect at least one technology signal (language, framework, or package manager)

**Generating without verification = wrong rules, overwritten configs, broken guards**

This is not optional. Every generation requires disciplined verification.
</EXTREMELY-IMPORTANT>

# Generate ULPI Configuration

## MANDATORY FIRST RESPONSE PROTOCOL

Before generating ANY configuration, you **MUST** complete this checklist:

1. ☐ Verify target directory exists
2. ☐ Check for existing guards.yml
3. ☐ Detect language (tsconfig.json, pyproject.toml, go.mod, etc.)
4. ☐ Detect framework (next.config.*, artisan, manage.py, etc.)
5. ☐ Detect package manager (pnpm-lock.yaml, yarn.lock, etc.)
6. ☐ Announce: "Generating ULPI configuration for [language]/[framework]/[package_manager]"

Do NOT ask "Proceed?" — the user invoked this skill explicitly. Show the detected stack as an informational summary, then generate immediately.

**Generating WITHOUT completing this checklist = wrong or harmful rules.**

## Purpose

This skill generates configuration for **ULPI**, a tool that:
- Auto-approves safe operations (reads, package manager commands)
- Blocks dangerous commands (force push, database wipes, env file edits)
- Enforces best practices (read-before-write)
- Runs postconditions (lint, test, generate) after file changes

**Output:** `.ulpi/guards.yml` configuration file

**Does NOT:** Install ULPI, run the generated rules, or modify existing configurations without confirmation.

## Overview

Analyze a project directory, detect the technology stack, and generate a complete `guards.yml` configuration for ULPI. Creates rules that auto-approve safe operations, block dangerous commands, and enforce best practices.

## When to Use

- User says "generate guards", "create guards.yml", "/ulpi-generate-guards"
- User says "setup ulpi", "configure guardian for this project"
- $ARGUMENTS contains a path (e.g., `/ulpi-generate-guards /path/to/project`)

**Never generate unprompted.** Only when explicitly requested.

## Step 1: Determine Target Directory

**Gate: Valid directory confirmed before proceeding to Step 2.**

If $ARGUMENTS has a path, use it. Otherwise use current working directory.

Verify the directory exists before proceeding. If not found, stop and inform the user.

Check for existing `.ulpi/guards.yml`:
- If found, ask user: merge, overwrite, or abort?
- Never overwrite without explicit confirmation

## Step 2: Detect Technology Stack

**Gate: Stack detected before proceeding to Step 3.**

Scan for indicator files in priority order:

### Language Detection

| Signal | Language |
|--------|----------|
| `tsconfig.json` | TypeScript |
| `package.json` (no tsconfig) | JavaScript |
| `pyproject.toml`, `requirements.txt` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `composer.json` | PHP |
| `Gemfile` | Ruby |
| `pom.xml`, `build.gradle` | Java |
| `*.csproj`, `*.sln` | C# |
| `mix.exs` | Elixir |

### Framework Detection

| Signal | Framework |
|--------|-----------|
| `next.config.*` | Next.js |
| `nuxt.config.*` | Nuxt |
| `angular.json` | Angular |
| `svelte.config.*` | SvelteKit |
| `nest-cli.json` | NestJS |
| `artisan` | Laravel |
| `manage.py` + django | Django |
| `fastapi` in deps | FastAPI |
| `actix-web` in Cargo.toml | Actix |
| `gin` in go.mod | Gin |

### Package Manager Detection

| Signal | Package Manager |
|--------|-----------------|
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `package-lock.json` | npm |
| `bun.lockb` | bun |
| `poetry.lock` | poetry |
| `uv.lock` | uv |
| `Cargo.lock` | cargo |
| `composer.lock` | composer |
| `Gemfile.lock` | bundler |

### Tooling Detection

| Signal | Tool | Type |
|--------|------|------|
| `vitest.config.*` | Vitest | test |
| `jest.config.*` | Jest | test |
| `pytest.ini` | pytest | test |
| `.eslintrc*` | ESLint | lint |
| `.prettierrc*` | Prettier | format |
| `biome.json` | Biome | lint+format |
| `prisma/schema.prisma` | Prisma | ORM |
| `drizzle.config.*` | Drizzle | ORM |

### Monorepo Detection

| Signal | Structure |
|--------|-----------|
| `turbo.json` | Turborepo |
| `lerna.json` | Lerna |
| `pnpm-workspace.yaml` | pnpm workspaces |
| `"workspaces"` in package.json | Yarn/npm workspaces |

**If a monorepo is detected, you MUST proceed to Step 2b (Map Monorepo Topology) before continuing.**

## Step 2b: Map Monorepo Topology (Monorepos Only)

**Gate: Full workspace topology mapped before proceeding to Step 3.**

When a monorepo is detected, do NOT treat it as a flat project. You must:

1. **Read the workspace config** — `pnpm-workspace.yaml`, `lerna.json`, or `package.json` workspaces field to find all workspace globs
2. **List all packages** — Resolve workspace globs to actual directories (e.g., `apps/*`, `packages/*`)
3. **Read each package's `package.json`** — Identify name, dependencies, devDependencies, scripts
4. **Map the dependency graph** — Which packages depend on which? Identify the direction of dependency flow
5. **Read the task runner config** — `turbo.json` task definitions, dependency chains (`^` prefix = depends on upstream)
6. **Identify build characteristics** — Does the package have a build step? Is it consumed as source? Does it have its own tsconfig?

### Topology Output Format

Record the topology as a YAML comment in the header:

```yaml
# Workspace Topology:
#   {package-a} → {package-b} (one-way dependency)
#   {package-c} (standalone)
#
# Task Graph (turbo.json):
#   build: depends on ^build
#   type-check: depends on ^type-check
```

### What Monorepo Topology Enables

- **Package boundary enforcement** — Prevent imports in the wrong direction
- **Per-package postconditions** — Type-check only the affected package using `turbo --filter=`
- **Turbo-first commands** — Use `turbo run` instead of direct package manager for tasks defined in turbo.json
- **Critical file cautions** — Barrel exports, shared configs, workspace manifests

See `references/framework-rules.md` → Turborepo section for complete rule templates.

## Step 3: Extract Commands from Config

**Gate: Commands extracted before proceeding to Step 4.**

For Node.js projects, read package.json scripts to identify:
- `test_command` (from "test" script)
- `build_command` (from "build" script)
- `lint_command` (from "lint" script)
- `format_command` (from "format" script)

**For monorepos:** Read BOTH the root `package.json` AND `turbo.json`:
- If root scripts delegate to turbo (e.g., `"build": "turbo run build"`), the real commands are turbo tasks
- Read each workspace's `package.json` scripts to understand what turbo invokes per-package
- Postconditions and pipelines should use `turbo run <task> --filter=<package>`, NOT direct `pnpm <script>`

For Python projects, check pyproject.toml for tool configurations.

For Rust projects, use standard cargo commands.

## Step 4: Generate guards.yml

**Gate: Complete rules generated before proceeding to Step 5.**

Create `.ulpi/guards.yml` with these sections:

### Header

```yaml
# ULPI — Generated Configuration
# Stack: {language} / {framework} / {package_manager}
# Generated: {timestamp}

project:
  name: "{project_name}"
  runtime: "{runtime}"
  package_manager: "{package_manager}"
```

### Universal Preconditions (Always Include)

```yaml
preconditions:
  read-before-write:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit|MultiEdit"
    requires_read: true
    message: "Read {file_path} before editing it."
    locked: true
    priority: 10
```

### Universal Permissions (Always Include)

```yaml
permissions:
  # --- Auto-approvals ---
  auto-approve-reads:
    enabled: true
    trigger: PermissionRequest
    matcher: "Read|LS|Glob|Grep"
    decision: allow
    priority: 100

  auto-approve-git-readonly:
    enabled: true
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "git (status|log|diff|branch|show|stash list|remote -v|rev-parse)"
    decision: allow
    priority: 90

  auto-approve-gh-cli:
    enabled: true
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "gh"
    decision: allow
    priority: 80

  auto-approve-prettier:
    enabled: true
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "prettier"
    decision: allow
    priority: 80

  auto-approve-shell-inspection:
    enabled: true
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "(ls|cat|head|tail|wc|file|which|echo|pwd|whoami)"
    decision: allow
    priority: 80

  # --- Git destructive blocks (comprehensive) ---
  no-force-push:
    enabled: true
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "git push.*(--force|-f)"
    decision: deny
    message: "Force push blocked. Use --force-with-lease."
    locked: true
    priority: 1

  no-git-checkout-dot:
    enabled: true
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "git checkout \\."
    decision: deny
    message: "git checkout . discards all unstaged changes."
    locked: true
    priority: 1

  no-git-restore-dot:
    enabled: true
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "git restore \\."
    decision: deny
    message: "git restore . discards all unstaged changes."
    locked: true
    priority: 1

  no-git-reset-hard:
    enabled: true
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "git reset --hard"
    decision: deny
    message: "git reset --hard destroys uncommitted work."
    locked: true
    priority: 1

  no-git-clean-force:
    enabled: true
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "git clean.* -f"
    decision: deny
    message: "git clean -f permanently deletes untracked files."
    locked: true
    priority: 1

  no-git-branch-delete-force:
    enabled: true
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "git branch -D"
    decision: deny
    message: "git branch -D force-deletes branches. Use -d for safe delete."
    locked: true
    priority: 1

  no-skip-hooks:
    enabled: true
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "--no-verify"
    decision: deny
    message: "Do not skip git hooks."
    locked: true
    priority: 1

  no-rm-rf:
    enabled: true
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "rm -rf"
    decision: deny
    message: "rm -rf is destructive. Remove specific files instead."
    locked: true
    priority: 1

  # --- File protection ---
  block-env-files:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: ".env*"
    decision: deny
    message: "Cannot edit .env files directly."
    priority: 50

  block-node-modules:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "node_modules/**"
    decision: deny
    locked: true
    priority: 1

  block-dist:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "**/dist/**"
    decision: deny
    locked: true
    priority: 1
```

**Important:** `git push` is intentionally NOT auto-approved. Pushes affect shared state and should always require confirmation.

### Language-Specific Rules

Add based on detected language. See `references/language-rules.md`.

### Framework-Specific Rules

Add based on detected framework. See `references/framework-rules.md`.

### Pipelines (Required Fields)

Every pipeline MUST include `on_failure`. It is a **required field** — omitting it causes a validation error.

```yaml
pipelines:
  pre-commit-checks:
    enabled: true
    trigger: "PreToolUse"
    matcher: "Bash"
    command_pattern: "git commit"
    steps:
      - name: "type-check"
        run: "{type_check_command}"
        timeout: 60000
      - name: "lint"
        run: "{lint_command}"
        timeout: 60000
    on_failure: "block"          # REQUIRED — "block" or "warn"
    message: "Pre-commit checks failed."
    locked: true
    priority: 5
```

Valid `on_failure` values: `"block"` (prevent the action) or `"warn"` (show warning but allow).

## Step 5: Write Configuration

**Gate: File written before proceeding to Step 6.**

Create the `.ulpi/` directory if it doesn't exist.

Write the generated YAML to `guards.yml`.

Verify the file was written successfully.

## Step 6: Report Results

**Gate: Results reported before marking complete.**

Report to the user:
- Stack detected
- Rules created (counts)
- File location
- Suggested next steps

## Pre-Generation Checklist

Before generating, verify:
- [ ] Target directory exists and is accessible
- [ ] No existing guards.yml OR user approved overwrite
- [ ] At least one technology detected

## Error Handling

| Situation | Action |
|-----------|--------|
| Directory not found | Stop and inform user |
| No tech stack detected | Generate minimal universal rules only |
| Multiple frameworks | Ask user which is primary |
| Existing guards.yml | Ask: merge, overwrite, or abort |
| Conflicting signals | Prefer more specific (framework > language) |

## About Postconditions

Postconditions are **disabled by default** because they run automatically after file changes and may:
- Slow down workflows
- Produce unexpected side effects
- Conflict with user's preferred workflow

**To enable:** User should manually set `enabled: true` for desired postconditions after reviewing them.

## About Pipelines

Pipelines define multi-step checks (e.g., pre-commit). Every pipeline **MUST** include the `on_failure` field — it is required. Valid values: `"block"` (stop the action) or `"warn"` (show warning but proceed).

```yaml
pipelines:
  pre-commit-checks:
    enabled: true
    trigger: "PreToolUse"
    matcher: "Bash"
    command_pattern: "git commit"
    steps:
      - name: "type-check"
        run: "{type_check_command}"
        timeout: 60000
      - name: "lint"
        run: "{lint_command}"
        timeout: 60000
    on_failure: "block"    # REQUIRED — omitting this causes validation error
    message: "Pre-commit checks."
    locked: true
    priority: 5
```

## Safety Rules

| Rule | Reason |
|------|--------|
| Always include read-before-write | Prevents editing files without reading first |
| Always block force push (--force AND -f) | Prevents history destruction |
| Always block all git destructive ops | checkout ., restore ., reset --hard, clean -f, branch -D |
| Always block --no-verify | Never skip git hooks |
| Always block rm -rf | Prevents catastrophic deletions |
| Always block .env edits | Protects secrets |
| Always block node_modules/dist | Build artifacts should not be edited |
| Auto-approve reads | Safe operations should not prompt |
| Auto-approve ONLY the detected package manager | Do not auto-approve all package managers |
| Never auto-approve git push | Pushes affect shared state, always confirm |
| Never generate state-tracking rules | ULPI has no state; rules like "track last N" are non-functional |
| Never generate redundant rules | If a rule duplicates another, remove the weaker one |
| Always include `on_failure` in pipelines | Required field — omitting causes validation error |
| Always map monorepo topology when detected | Flat treatment of monorepos produces wrong rules |
| Never overwrite without asking | Preserves existing configuration |
| Always verify directory exists | Prevents errors |

## Quick Reference: Command Detection

```
package.json scripts:
  "test"   → test_command
  "build"  → build_command
  "lint"   → lint_command
  "format" → format_command
  "dev"    → auto-approve permission

pyproject.toml:
  [tool.pytest]     → pytest
  [tool.ruff]       → ruff
  [tool.black]      → black

Cargo.toml:
  cargo test        → test_command
  cargo build       → build_command
  cargo clippy      → lint_command
```

---

## Quality Checklist (Must Score 8/10)

Score yourself honestly before marking generation complete:

### Detection Accuracy (0-2 points)
- **0 points:** Guessed technology without file verification
- **1 point:** Detected some signals but missed others
- **2 points:** Verified all signals, detection matches reality

### Stack Announcement (0-2 points)
- **0 points:** Generated without showing detected stack
- **1 point:** Showed partial detection
- **2 points:** Full detection shown before generation

### Rule Coverage (0-2 points)
- **0 points:** Missing universal rules (read-before-write, block-env)
- **1 point:** Universal rules present but missing language/framework rules
- **2 points:** Complete coverage: universal + language + framework + tooling

### Safety Rules (0-2 points)
- **0 points:** Missing critical blocks (force-push, env files)
- **1 point:** Some safety rules but incomplete
- **2 points:** All dangerous operations blocked

### Output Quality (0-2 points)
- **0 points:** Invalid YAML or missing required fields
- **1 point:** Valid but poorly organized
- **2 points:** Clean, well-commented, properly structured YAML

**Minimum passing score: 8/10**

---

## Common Rationalizations (All Wrong)

These are excuses. Don't fall for them:

- **"The directory is obvious"** → STILL verify it exists
- **"I know this is a Node.js project"** → STILL detect from config files
- **"There's no existing guards.yml"** → STILL check before generating
- **"The user wants it fast"** → STILL show detected stack first
- **"These are standard rules"** → STILL customize for detected stack
- **"Postconditions are disabled anyway"** → STILL generate them correctly
- **"It's a monorepo but I'll just use global commands"** → Map the topology and use per-package `--filter`
- **"git push is just like other git commands"** → Push affects shared state, NEVER auto-approve it
- **"I'll add a rule to track recent actions"** → ULPI has no state between invocations, this won't work
- **"All Node.js package managers should be auto-approved"** → Only approve the DETECTED one

---

## Failure Modes

### Failure Mode 1: Wrong Technology Detection

**Symptom:** Generated Python rules for a TypeScript project
**Fix:** Always verify with config files, not assumptions

### Failure Mode 2: Overwritten Existing Config

**Symptom:** User's custom guards.yml was replaced without warning
**Fix:** Always check for existing file, ask before overwriting

### Failure Mode 3: Missing Critical Safety Rules

**Symptom:** Agent force-pushed after generation (rule wasn't blocked)
**Fix:** Always include universal safety rules regardless of stack

### Failure Mode 4: Invalid YAML Generated

**Symptom:** ULPI fails to parse guards.yml
**Fix:** Validate YAML structure before writing

### Failure Mode 5: Flat Treatment of Monorepo

**Symptom:** Postconditions run `tsc --noEmit` globally instead of `turbo --filter=<pkg>`, package boundaries not enforced, no topology in header
**Fix:** Always run Step 2b when monorepo is detected. Map the full workspace dependency graph. Generate per-package postconditions with `--filter`.

### Failure Mode 6: Non-Functional State-Tracking Rules

**Symptom:** Rules reference "last N actions" or "track recent commands" — ULPI has no state between invocations
**Fix:** Only generate rules that use ULPI's actual capabilities: matchers, patterns, triggers. No stateful tracking.

### Failure Mode 7: Redundant Rules

**Symptom:** Multiple rules block the same thing (e.g., separate `block-dist` and `block-build-output` when only one output dir exists)
**Fix:** Audit generated rules for overlap. Each rule should block a distinct concern.

---

## Quick Workflow Summary

```
STEP 1: DETERMINE TARGET
├── Parse $ARGUMENTS for path
├── Default to current directory
├── Verify directory exists
├── Check for existing guards.yml
└── Gate: Valid directory confirmed

STEP 2: DETECT TECHNOLOGY
├── Scan for language signals
├── Scan for framework signals
├── Scan for package manager signals
├── Scan for tooling (test, lint, ORM)
├── Check for monorepo structure
├── Announce detected stack (informational, no question)
└── Gate: Stack detected

STEP 2b: MAP MONOREPO TOPOLOGY (if monorepo detected)
├── Read workspace config (pnpm-workspace.yaml, etc.)
├── List all packages in workspace
├── Read each package's package.json
├── Map dependency graph (who depends on whom)
├── Read turbo.json / lerna.json task definitions
├── Identify build characteristics per package
└── Gate: Full topology mapped

STEP 3: EXTRACT COMMANDS
├── Read package.json scripts (root + per-package for monorepos)
├── Read turbo.json tasks (monorepos)
├── Read pyproject.toml tools
├── Identify test/build/lint commands
├── For monorepos: note turbo --filter commands per package
└── Gate: Commands extracted

STEP 4: GENERATE RULES
├── Start with universal rules (comprehensive git blocks, no push auto-approve)
├── Add language-specific rules (only detected pkg manager)
├── Add framework-specific rules
├── Add monorepo rules (boundaries, per-pkg postconditions, prefer-turbo)
├── Add project-specific critical file cautions
├── Add tooling rules
├── Audit for redundancy (no duplicate rules)
└── Gate: Complete rules generated

STEP 5: WRITE CONFIGURATION
├── Create .ulpi/ directory
├── Write guards.yml
├── Verify file written
└── Gate: File written

STEP 6: REPORT RESULTS
├── Show stack summary
├── Show rule counts
├── Show file location
├── Suggest next steps
└── Gate: Complete
```

---

## Completion Announcement

When generation is complete, announce:

```
ULPI configuration generated.

**Quality Score: X/10**
- Detection Accuracy: X/2
- Stack Announcement: X/2
- Rule Coverage: X/2
- Safety Rules: X/2
- Output Quality: X/2

**Stack Detected:**
- Language: [language]
- Framework: [framework]
- Package Manager: [package_manager]
- Test Runner: [test_runner]
- Linter: [linter]

**Rules Generated:**
- Preconditions: [count]
- Permissions: [count]
- Postconditions: [count]

**Output:** .ulpi/guards.yml

**Next steps:**
Run `ulpi rules validate` to verify configuration.
```

---

## Integration with Other Skills

The `ulpi-generate-guards` skill integrates with:

- **`start`** — Detects ULPI configuration needs during project setup
- **`commit`** — Generated rules can auto-approve git operations
- **`create-pr`** — Generated rules can auto-approve PR creation commands

**Workflow Chain:**

```
New project or directory
       │
       ▼
ulpi-generate-guards skill (this skill)
       │
       ▼
guards.yml created
       │
       ▼
ULPI uses rules during development
```

---

## Resources

See `references/language-rules.md` for language-specific rule templates.
See `references/framework-rules.md` for framework-specific rule templates.
