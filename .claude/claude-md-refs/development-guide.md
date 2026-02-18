# Development Guide

Step-by-step guides for implementing features in the ULPI monorepo.

## Adding a New Rule Type

### Step 1: Define the Type

Add to `packages/contracts/src/rule.ts`:

```typescript
export interface MyNewRule extends RuleBase {
  type: "my-new-rule";
  myField: string;
  optionalField?: number;
}

// Update the union type
export type Rule =
  | PreconditionRule
  | PostconditionRule
  | PermissionRule
  | PipelineRule
  | MyNewRule;
```

### Step 2: Add Zod Schema

Add to `packages/guards-engine/src/schema.ts`:

```typescript
export const MyNewRuleInputSchema = z.object({
  enabled: z.boolean().default(true),
  trigger: HookEventSchema,
  matcher: z.string(),
  file_pattern: z.string().optional(),
  command_pattern: z.string().optional(),
  myField: z.string(),
  optionalField: z.number().int().positive().optional(),
  locked: z.boolean().default(false),
  priority: z.number().int().default(100),
});

// Add to RulesConfigSchema
```

### Step 3: Update Parser

Add section handling in `packages/guards-engine/src/parser.ts`.

### Step 4: Update Evaluator

Add evaluation logic in `packages/guards-engine/src/evaluator.ts`.

### Step 5: Export from contracts

```typescript
export type { MyNewRule } from "./rule";
```

---

## Adding a New CLI Command

### Step 1: Create Command File

Create `apps/cli/src/commands/my-command.ts`:

```typescript
import chalk from "chalk";

export function runMyCommand(args: string[], projectDir: string): void {
  switch (args[0]) {
    case "list": /* list logic */ break;
    case "add":  /* add logic */  break;
    default: console.log("Usage: ulpi my-command <list|add>");
  }
}
```

### Step 2: Register in Entry Point

Add to `apps/cli/src/index.ts`:

```typescript
case "my-command":
  return (await import("./commands/my-command")).runMyCommand(args.slice(1), projectDir);
```

### Step 3: Update Help Text

Add to `printUsage()` in `apps/cli/src/index.ts`.

---

## Adding a New Hook Handler

### Step 1: Create Handler File

Create `apps/cli/src/hooks/my-hook.ts`:

```typescript
import type { HookInput, EvaluationResult, SessionState, RulesConfig } from "@ulpi/contracts";

export function handleMyHook(
  input: HookInput,
  rules: RulesConfig,
  state: SessionState,
): EvaluationResult {
  const matchingRules = Object.values(rules.permissions).filter(
    (rule) => rule.enabled && rule.trigger === input.hook_event_name
  );
  for (const rule of matchingRules) {
    // Rule evaluation logic
  }
  return { action: "allow", exitCode: 0, matchedRules: [] };
}
```

### Step 2: Register in Handler

Add to `apps/cli/src/hooks/handler.ts` switch statement.

### Step 3: Add to Hook List

Update `hookCommands` array in `apps/cli/src/index.ts`.

---

## Adding a New API Endpoint

API routes live in `apps/api/src/routes/`. Each file exports handler functions.

### Step 1: Create Route Handler

Create `apps/api/src/routes/my-resource.ts`:

```typescript
import type { RouteContext } from "../router";
import { jsonResponse } from "../http/response";
import { readBody } from "../http/request";

// GET /api/my-resource
export async function myResourceList(ctx: RouteContext): Promise<void> {
  const data = getMyResource(ctx.projectDir);
  jsonResponse(ctx.res, data);
}

// POST /api/my-resource
export async function myResourceCreate(ctx: RouteContext): Promise<void> {
  const body = await readBody(ctx.req);
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    jsonResponse(ctx.res, { error: "Invalid JSON body" }, 400);
    return;
  }
  const result = createMyResource(payload);
  jsonResponse(ctx.res, { success: true, data: result }, 201);
}
```

### Step 2: Register Routes

Add to the router in `apps/api/src/router.ts`:

```typescript
import { myResourceList, myResourceCreate } from "./routes/my-resource";

// In createRouter():
routes.push(
  { method: "GET", path: "/api/my-resource", handler: myResourceList },
  { method: "POST", path: "/api/my-resource", handler: myResourceCreate },
);
```

---

## Adding a New Bundled Template

### Step 1: Create Template YAML

Create `packages/templates-engine/templates/my-template.yml`:

```yaml
id: my-template
name: My Template
category: framework
variables:
  test_command: "npm test"
rules:
  preconditions:
    check-something:
      trigger: PreToolUse
      matcher: "Write|Edit"
      file_pattern: "*.config.*"
      message: "Check configuration before editing config files."
      priority: 100
  permissions:
    auto-approve-my-tool:
      trigger: PermissionRequest
      matcher: Bash
      command_pattern: "my-tool"
      decision: allow
      message: "Auto-approved my-tool command."
```

### Step 2: Template is Auto-Loaded

Templates in `packages/templates-engine/templates/` are automatically loaded by `loadBundledTemplates()`.

---

## Adding a New Bundled Skill

### Step 1: Create Skill Markdown

Create `packages/templates-engine/skills/my-skill.md`.

### Step 2: Register in Catalog

Add to `packages/templates-engine/src/catalog.ts`:

```typescript
export const BUNDLED_SKILLS: SkillInfo[] = [
  // ... existing
  { name: "my-skill", description: "My skill description", path: "my-skill.md" },
];
```

---

## Adding a New Shared Type

Types go in `packages/contracts/src/`. Each domain has its own file:

| File | Domain |
|------|--------|
| `hook-input.ts` | Hook system (HookInput, HookOutput, EvaluationResult) |
| `rule.ts` | Rules (Rule, PreconditionRule, PermissionRule, etc.) |
| `session.ts` | Sessions (SessionState, SessionEvent, SessionPhase) |
| `template.ts` | Templates (TemplateLayer, StackConfig, RulesConfig) |
| `stack.ts` | Stack detection (DetectedItem, StackDetectionResult) |
| `response.ts` | Notifications (ResponseConfig, NotifyChannel) |
| `skill.ts` | Skills (Skill, SkillAttachment) |
| `project.ts` | Projects (ProjectEntry, ProjectRegistry) |
| `history.ts` | History (HistoryEntry, TimelineEntry, etc.) |
| `review.ts` | Review (Plan, Block, ReviewAnnotation, etc.) |
| `codemap.ts` | CodeMap (CodemapConfig, CodemapStatus, SearchResult, etc.) |
| `depgraph.ts` | DepGraph (Tag, DepGraph, PageRankResult, CyclicDependency, etc.) |
| `memory.ts` | Memory (MemoryEntry, MemoryConfig, MemoryStats, ClassifyResult, etc.) |

After adding to a file, re-export from `packages/contracts/src/index.ts` if not using `export *`.

---

## Response Formats

### Success Response

```typescript
{ success: true, data?: T }
// Status: 200 or 201
```

### Error Response

```typescript
{ error: string }
// Status: 400 (bad request), 404 (not found), 500 (server error)
```

### Hook Output (stdout JSON)

```typescript
{
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision?: "allow" | "deny" | "ask_user";
    permissionDecisionReason?: string;
  }
}
```

---

## Error Handling Patterns

### CLI Commands

```typescript
try {
  const result = doSomething();
  console.log(chalk.green(`✓ Success: ${result}`));
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.log(chalk.red(`Error: ${message}`));
}
```

### Hook Handlers (Fail Open)

```typescript
// In apps/cli/src/index.ts
main().catch((err) => {
  if (hookCommands.includes(command)) {
    console.error(`[ulpi] Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(0); // Fail open
  }
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

### API Route Handlers

```typescript
export async function myHandler(ctx: RouteContext): Promise<void> {
  try {
    const data = await doWork(ctx.projectDir);
    jsonResponse(ctx.res, data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    jsonResponse(ctx.res, { error: message }, 500);
  }
}
```

---

## Testing Patterns

### Unit Tests (Vitest)

Tests exist in 3 packages: `guards-engine`, `session-engine`, `history-engine`.

```typescript
import { describe, it, expect } from "vitest";
import { parseRules } from "../src/parser";

describe("parseRules", () => {
  it("should parse valid YAML", () => {
    const yaml = `
project:
  name: test
  runtime: node
  package_manager: npm
`;
    const result = parseRules(yaml);
    expect(result.project.name).toBe("test");
  });
});
```

### Testing Hook Handlers

```bash
echo '{"session_id":"test","cwd":"/tmp","hook_event_name":"PreToolUse","tool_name":"Read"}' | \
  node apps/cli/dist/index.js pre-tool
```

### Testing API Endpoints

```bash
curl http://localhost:9800/api/rules
curl http://localhost:9800/api/sessions
curl -X POST http://localhost:9800/api/rules -H "Content-Type: application/json" \
  -d '{"type":"precondition","id":"test","trigger":"PreToolUse","matcher":"*","message":"Test"}'
```

---

## SessionEvent Format

Events logged to `~/.ulpi/sessions/{slug}/{id}.events.jsonl`:

```typescript
interface SessionEvent {
  ts: string;              // ISO timestamp
  event: SessionEventType; // e.g., "tool_allowed", "tool_blocked"
  hookEvent: HookEvent;    // e.g., "PreToolUse", "PermissionRequest"
  toolName?: string;
  filePath?: string;
  command?: string;
  ruleName?: string;
  message?: string;
  durationMs?: number;
}
```

---

## Build Commands

| Task | Command |
|------|---------|
| Build all | `pnpm -r build` |
| Build single package | `pnpm --filter @ulpi/<name> build` |
| Run tests | `pnpm test` |
| Clean all | `pnpm -r clean` |

**Build order:** Automatic via pnpm. Contracts → Config → Engines → API → CLI → Web UI.

---

## Security Conventions

### Shell Execution: Always use `execFileSync`

```typescript
// CORRECT: argument array prevents injection
const output = execFileSync("git", ["log", "--oneline", `-${count}`], {
  cwd: projectDir, encoding: "utf-8", timeout: 5000,
}).toString();
// WRONG: execSync(`git log -${count}`, ...) allows injection
```

**Exception:** `post-tool.ts` postcondition runner uses `execSync` for user-defined commands.

### Input Validation at Boundaries

```typescript
import { validateSessionId } from "@ulpi/session-engine";
validateSessionId(sessionId); // Throws if invalid (alphanumeric + hyphens, max 128)
```

| Validator | Location | Checks |
|-----------|----------|--------|
| `validateSessionId()` | session-engine | Alphanumeric + hyphens, max 128 |
| `validateSlug()` | review-engine/storage | Rejects `..`, `/`, `\` |
| `validateWebhookUrl()` | notifications/webhook | Rejects private IPs, SSRF |
| `validateTemplateName()` | templates/user-templates | Alphanumeric + hyphens |
| `isWithinBase()` | templates/skill-loader | Path traversal prevention |
| `validateInput()` | cli/hooks/handler | session_id, cwd, hook_event_name |

### Resource Limits

All in-memory stores must have capacity limits. See architecture.md Security Model for full table.

### API Route Security

All `/api/*` routes: `validateAuth()` (loopback-only) + rate limiting (200 req/min per IP) + Content-Type validation for POST.

---

## Review System

### Architecture

```
Hook fires (permission.ts or pre-tool.ts)
    │
    ├─ review-integration.ts checks isReviewEnabled()
    ├─ Discovers running API server via discoverUlpiServer() (@ulpi/review-runtime)
    ├─ Registers session via /api/review/hub/register
    ├─ Opens browser to review page
    ├─ Long-polls /api/review/hub/session/:id/await for decision
    │
    ▼
Decision received → allow (exit 0) or deny (exit 2 with feedback)
```

### Key Files

| File | Purpose |
|------|---------|
| `packages/contracts/src/review.ts` | All review type definitions + Zod schemas |
| `packages/review-engine/src/parser.ts` | Markdown block parser + section extraction |
| `packages/review-engine/src/scoring.ts` | Plan quality scorer (8 dimensions) |
| `packages/review-engine/src/storage.ts` | Plan persistence |
| `packages/review-runtime/src/hub.ts` | ReviewHub class |
| `packages/review-runtime/src/discovery.ts` | Server discovery |
| `apps/api/src/routes/review-hub.ts` | Review hub API routes |
| `apps/cli/src/hooks/review-integration.ts` | Central review integration |
| `apps/cli/src/hooks/permission.ts` | ExitPlanMode plan review |
| `apps/cli/src/hooks/pre-tool.ts` | Git commit code review |

### guards.yml Configuration

```yaml
review:
  enabled: true
  plan_review: true
  code_review: true
  auto_open_browser: true
```

### Flag Files

Ephemeral flag files at `~/.ulpi/review-flags/`:

| Flag | Purpose |
|------|---------|
| `clear-context` | Signals context should be cleared after plan approval |
| `review-feedback` | Review feedback text to inject via PostToolUse |
| `team-delegation.json` | Team delegation sections for parallel execution |
