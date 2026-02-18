# Architecture

System structure and data flows for the ULPI monorepo.

## Package Dependency Graph

```
                        ┌──────────────────┐
                        │   @ulpi/web-ui   │
                        │ (Vite React SPA) │
                        └───────┬──────────┘
                                │ imports
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
            ┌──────────┐ ┌──────────┐ ┌──────────────┐
            │ @ulpi/   │ │ @ulpi/   │ │ @ulpi/       │
            │ api-client│ │contracts │ │ contracts    │
            └──────┬───┘ └──────────┘ └──────────────┘
                   │
                   ▼
           ┌──────────────┐
           │  @ulpi/cli   │ ────────────────────────────┐
           │ (CLI + hooks)│                              │
           └──────┬───────┘                              ▼
                  │ imports                      ┌──────────────┐
     ┌────────────┼────────────────┐             │  @ulpi/api   │
     ▼            ▼                ▼             │ (HTTP server)│
┌──────────┐ ┌──────────┐ ┌──────────────┐      └──────┬───────┘
│ guards-  │ │ session- │ │notifications-│             │
│ engine   │ │ engine   │ │ engine       │   ┌─────────┼──────────┐
└────┬─────┘ └────┬─────┘ └──────────────┘   ▼         ▼          ▼
     │            │                    ┌──────────┐ ┌────────┐ ┌────────┐
     ├────────────┼───────── ... ─────►│ review-  │ │history-│ │stack-  │
     │            │                    │ runtime  │ │engine  │ │engine  │
     ▼            ▼                    └────┬─────┘ └────┬───┘ └────────┘
┌──────────────────────┐                    ▼            │
│   @ulpi/contracts    │◄───────────── review-engine     │
│  (shared types/Zod)  │                                 │
└──────────┬───────────┘                                 │
           ▲                    ┌──────────┐             │
           └────────────────────┤ @ulpi/   │◄────────────┘
                                │ config   │
                                └──────────┘
```

**Foundation layer:** `@ulpi/contracts` (types + Zod) → `@ulpi/config` (paths, env)
**Engine layer:** guards, session, stack, templates, notifications, projects, history, review, review-runtime, codemap-engine, codemap-mcp, depgraph-engine, memory-engine, memory-mcp
**CI layer:** `@ulpi/contracts-ci` (CI types + Zod) → `@ulpi/ci-engine` (GitHub, Jira, jobs, workspace)
**App layer:** api (HTTP server), cli (entry + hooks), web-ui (React SPA), vector-admin (LanceDB admin), orchestrator (CI webhook server), worker (Docker image)

---

## Hook Execution Flow

```
Claude Code executes a tool (e.g., Write src/auth.ts)
    │
    ▼
Claude Code invokes: ulpi pre-tool (stdin: JSON)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ apps/cli/src/hooks/handler.ts                                │
│                                                              │
│ 1. Read stdin JSON → HookInput (@ulpi/contracts)             │
│ 2. Load guards.yml → RulesConfig (@ulpi/guards-engine)       │
│ 3. Load session state → SessionState (@ulpi/session-engine)  │
│ 4. Dispatch to hook-specific handler                         │
│ 5. Evaluate rules against input + state                      │
│ 6. Update session state (files read/written, commands)       │
│ 7. Append event to JSONL log                                 │
│ 8. Output result (exit code + stdout/stderr)                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Exit code 0 = allow, Exit code 2 = block with feedback
```

---

## Session State Machine

```
  ┌──────┐  session-start  ┌────────┐  git commit  ┌──────────────────┐
  │ idle │ ──────────────► │ active │ ───────────► │ active_committed │
  └──────┘                 └────────┘              └──────────────────┘
                              │  ▲                        │
                              │  │ pre-tool/post-tool     │
                              │  │ permission/stop        │
                              │  └────────────────────────┘
                              │
                              │ session-end
                              ▼
                           ┌───────┐
                           │ ended │
                           └───────┘
```

**SessionPhase:** `"idle" | "active" | "active_committed" | "ended"`

| Current | Trigger | New Phase | Action |
|---------|---------|-----------|--------|
| idle | SessionStart | active | Initialize state, detect stack |
| active | PreToolUse | active | Evaluate rules, update filesRead |
| active | PostToolUse | active | Update filesWritten, run postconditions |
| active | PermissionRequest | active | Auto-approve/deny |
| active | git commit detected | active_committed | Record commit SHA |
| active_committed | PreToolUse | active_committed | Continue with commit context |
| active / active_committed | SessionEnd | ended | Persist summary, write history |

---

## Rule Evaluation Flow

```
evaluateRules(input, rules, state)      // @ulpi/guards-engine
│
├─ 1. DANGEROUS COMMANDS CHECK (always runs, never bypassable)
│  └─ Block rm -rf, git push --force, etc.
│
├─ 2. PERMISSION RULES (PermissionRequest trigger)
│  └─ Match by tool + command pattern → allow/deny/ask
│
├─ 3. PRECONDITION RULES (PreToolUse trigger)
│  ├─ Check requires_read (file must be in filesRead)
│  ├─ Check requires flags (tests_run, lint_run, etc.)
│  └─ Block with message + optional skill injection
│
├─ 4. PIPELINE RULES
│  └─ Execute multi-step workflows
│
└─ 5. POSTCONDITION RULES (PostToolUse trigger)
   └─ Queue commands to run after tool execution
```

---

## Storage Layout

### Project Config (`.ulpi/`)

```
.ulpi/
├── guards.yml          # Project-specific rules (YAML)
└── .no-auto-gen       # Optional: dismisses auto-generation prompt
```

### User Config (`~/.ulpi/`)

```
~/.ulpi/
├── guards.yml              # Global rules (fallback)
├── settings.json           # User preferences (UlpiSettings)
├── projects.json           # Multi-project registry
├── .version-cache.json     # npm registry check cache (4h TTL)
├── sessions/
│   └── {projectSlug}/
│       ├── {session_id}.json        # Session state
│       └── {session_id}.events.jsonl  # Session event log
├── templates/
│   └── {name}.yml         # User-saved templates
├── reviews/
│   └── {slug}/plan.json   # Plan versions, annotations, decisions
├── review-flags/           # Ephemeral inter-hook communication
│   ├── clear-context
│   ├── review-feedback
│   └── team-delegation.json
└── memory/
    └── {projectSlug}/      # Per-project memory storage
        ├── config.json     # MemoryConfig
        ├── entries/        # Individual MemoryEntry JSON files
        ├── lance/          # LanceDB vector index
        ├── history/        # Captured session events + transcripts
        ├── watermarks/     # Classification progress per session
        └── stats.json      # MemoryStats
```

---

## Key Subsystems

### Guards Engine (`packages/guards-engine/`)
Parses YAML, validates with Zod, evaluates against hook input + session state. 4 rule types: preconditions, postconditions, permissions, pipelines.
Key files: `parser.ts`, `evaluator.ts`, `matchers.ts`, `schema.ts`, `variables.ts`

### Session Engine (`packages/session-engine/`)
JSON state files + JSONL event logs. `JsonSessionStore` handles CRUD + `getLatestForProject()`.
Key files: `store.ts`, `tracker.ts`, `events.ts`, `phase.ts`

### Stack Engine (`packages/stack-engine/`)
10 detectors: runtime, language, framework, packageManager, formatter, linter, testRunner, orm, gitWorkflow, features.
Key files: `detector.ts` (orchestrator), individual detector files

### Templates Engine (`packages/templates-engine/`)
28 bundled YAML templates. Compose layers, resolve `{variables}`. User templates at `~/.ulpi/templates/`.
Key files: `loader.ts`, `resolver.ts`, `user-templates.ts`, `catalog.ts`

### History Engine (`packages/history-engine/`)
Shadow git branch (per-user: `ulpi/history-<username>`) stores structured records of each coding session.
Key files: `git-ops.ts`, `collector.ts`, `entries.ts`, `transcript.ts`

### Review Engine (`packages/review-engine/`)
Plan/code review logic: markdown parsing, quality scoring, diff, feedback, storage.
Key files: `parser.ts`, `scoring.ts`, `storage.ts`, `diff.ts`, `feedback.ts`

### Review Runtime (`packages/review-runtime/`)
In-memory `ReviewHub` for session management with long-poll + SSE. Server discovery for hook→browser communication.
Key files: `hub.ts`, `discovery.ts`, `transport.ts`

### CodeMap Engine (`packages/codemap-engine/`)
Semantic code search with hybrid vector + BM25 indexing. Scans repos, chunks files, generates embeddings via OpenAI or Ollama, stores in LanceDB.
Key files: `pipeline.ts`, `query.ts`, `store.ts`, `bm25.ts`, `hybrid.ts`, `watcher.ts`, `lock.ts`

### CodeMap MCP (`packages/codemap-mcp/`)
MCP server (stdio transport) exposing 11 tools: 5 search (`search_code`, `search_symbols`, `get_file_summary`, `get_index_stats`, `reindex`) + 6 depgraph (`get_dependencies`, `get_dependents`, `get_file_rank`, `find_cycles`, `get_coupling_metrics`, `get_depgraph_stats`).
Key files: `server.ts`, `tools/*.ts`

### DepGraph Engine (`packages/depgraph-engine/`)
Dependency graph analysis using tree-sitter SCM tag extraction (35 languages). Builds directed reference graphs, computes PageRank importance, detects circular dependencies (Tarjan's SCC), and calculates coupling metrics (Ca/Ce/instability).
Key files: `tags.ts`, `graph.ts`, `pagerank.ts`, `cycles.ts`, `coupling.ts`, `metrics.ts`, `scm.ts`

### Memory Engine (`packages/memory-engine/`)
Agent memory capture, LLM classification, vector search, deduplication, and ranking. Per-user shadow branch (`ulpi/memory-<username>`).
Key files: `store.ts`, `capture.ts`, `classifier.ts`, `search.ts`, `surfacer.ts`, `pipeline.ts`, `git-ops.ts`, `dedup.ts`, `ranking.ts`

### Memory MCP (`packages/memory-mcp/`)
MCP server (stdio transport) exposing 6 memory tools: `search_memory`, `save_memory`, `get_timeline`, `get_session_context`, `forget`, `memory_stats`.
Key files: `server.ts`, `tools/*.ts`

### API Server (`apps/api/`)
Node.js HTTP server: React SPA + 44 REST endpoints + WebSocket (2s poll) + SSE (review).
Security: loopback-only auth, rate limiting (200 req/min), path traversal protection, Content-Type validation.
LaunchAgent at `~/Library/LaunchAgents/com.ulpi.ui.plist` for macOS auto-start.

### Vector Admin (`apps/vector-admin/`)
LanceDB admin tool for inspecting and managing vector indexes. Used for debugging codemap and memory vector stores.
Key files: `server.ts`, `routes/tables.ts`, `routes/rows.ts`

### Contracts CI (`packages/contracts-ci/`)
CI-specific type definitions and Zod schemas for the CI orchestrator. Covers commands, jobs, orchestrator config, worker I/O, and Jira integration.
Key files: `command.ts`, `job.ts`, `config.ts`, `worker.ts`, `jira.ts`

### CI Engine (`packages/ci-engine/`)
Shared CI logic used by orchestrator and worker. GitHub/Jira API clients, job persistence, git workspace operations, prompt building, result formatting, and Claude credential management.
Key files: `github-client.ts`, `github-auth.ts`, `jira-client.ts`, `job-store.ts`, `workspace.ts`, `result-formatter.ts`, `prompt-builder.ts`, `claude-auth.ts`

### Orchestrator (`apps/orchestrator/`)
Long-running HTTP server that receives GitHub webhooks and spawns Docker worker containers for CI jobs. Supports `/ulpi run|cancel|fork|status` commands on PRs. Security: HMAC-SHA256 webhook verification, repo/author allowlists, rate limiting.
Key files: `server.ts`, `docker-manager.ts`, `job-scheduler.ts`, `result-collector.ts`, `handlers/*.ts`, `routes/*.ts`

### Worker (`apps/worker/`)
Ephemeral Docker container (node:22-slim) for CI/PR jobs. Contains full ULPI CLI + Claude Code CLI. Spawned by orchestrator with volume mounts for workspace, ULPI state, and Claude credentials.
Key files: `Dockerfile`, `entrypoint.sh`

---

## Security Model

### Shell Execution
All git and system commands use `execFileSync` with argument arrays (never `execSync` with template literals). The only exception is `post-tool.ts` postcondition runner which needs shell features for user-defined commands.

### API Access Control
- **Auth**: `validateAuth()` rejects non-loopback IPs (127.0.0.1, ::1)
- **Rate limiting**: 200 requests/min per IP, in-memory sliding window
- **WebSocket**: `verifyClient` checks loopback IP + origin header
- **SSE**: Max 100 concurrent clients via `SSEBroadcaster.canAccept()`

### Input Validation

| Layer | Validation |
|-------|-----------|
| Hook handler | `validateInput()` checks session_id, cwd, hook_event_name |
| Session store | `validateSessionId()` — alphanumeric + hyphens, max 128 chars |
| Review storage | `validateSlug()` — rejects `..` and path separators |
| Notification webhook | `validateWebhookUrl()` — rejects private IPs, metadata endpoints |
| Template names | `validateTemplateName()` — alphanumeric + hyphens |
| Skill paths | `isWithinBase()` — prevents path traversal above base dir |
| History git ops | SHA validation, branch path validation, worktree ID validation |

### Resource Limits

| Resource | Limit |
|----------|-------|
| Review hub sessions | 100 max, 30-min TTL |
| SSE clients | 100 max |
| Notification dedup entries | 1,000 max |
| Session events | 10,000 per session |
| Session commands tracked | 500 max |
| Diff computation input | 50,000 chars max |
| Plan scoring input | 500,000 chars max |
| Template YAML size | 1 MB max |
| Config file size | 5 MB max |
| Version check response | 64 KB max |

---

## Web UI

### Pages (20)

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | View/toggle rules, stats |
| Setup | `/setup` | Stack detection, template selection, init |
| Rules | `/rules` | Browse and manage all rules |
| RuleBuilder | `/rules/new`, `/rules/:id` | Create/edit individual rules |
| Skills | `/skills` | Browse bundled skills |
| Pipelines | `/pipelines` | View pipeline rules |
| Session | `/session` | Live session monitor with timeline |
| Responses | `/responses` | Notification settings |
| Projects | `/projects` | Multi-project management |
| Settings | `/settings` | AI model selection, preferences |
| History | `/history` | Shadow branch history timeline |
| TranscriptPage | `/history/:sha/transcript` | View session transcript |
| ReviewQueue | `/review/queue` | Pending review sessions |
| ReviewConfig | `/review/config` | Review settings |
| PlanReview | `/review/plan` | Full plan review with annotations |
| CodeReview | `/review/code` | Code/diff review with annotations |
| CodeMap | `/codemap` | Codebase visualization |
| Memory | `/memory` | Memory overview and search |
| MemorySettings | `/memory/settings` | Memory configuration |
| MemoryTimeline | `/memory/timeline` | Chronological memory timeline |

### Components (24)

Sidebar, ProjectSelector, AddProjectModal, SessionTimeline, RuleCard, PipelineEditor, SkillPicker, StackSelector, UpdateBanner, HistoryEntryDetail, TranscriptViewer, DiffViewer, QualityScoreCard, ImageAnnotator, ImageLightbox, InlineEditor, FloatingToolbar, ContextMenu, CommentDialog, ConfirmationDialog, RiskPopover, PriorityPopover, KeyboardOverlay, ExportModal

---

## CLI Commands (18)

| Command | Purpose |
|---------|---------|
| `init` | Detect stack, select templates, install hooks |
| `projects` | List/register/unregister/switch between projects |
| `rules` | List/add/enable/disable/validate rules |
| `templates` | List/save/apply/delete/export/import templates |
| `skills` | List/add/get/attach skills |
| `status` | Show current session state |
| `log` | View activity log |
| `export-import` | Export/import rules configuration |
| `ui` | Start web UI server (delegates to @ulpi/api) |
| `history` | Shadow branch history (init/capture/list/show/enrich/backfill) |
| `review` | Plan/code review management (list/show/config/migrate) |
| `update` | Check for and install updates (`--check` for check-only) |
| `uninstall` | Remove hooks from project |
| `memory` | Memory management (status/search/classify/reindex/export/import/stats) |
| `config` | Configuration management (get/set/list settings) |
| `codemap` | CodeMap index management (status/init/search/reindex) |
| `ci` | CI worker mode (execute jobs inside containers) |
| `auth` | Claude Code credential management for CI (setup/check/refresh) |

---

## Hook Handlers (7)

| Handler | Trigger | Can Block? |
|---------|---------|-----------|
| `session-start` | SessionStart | No |
| `pre-tool` | PreToolUse | Yes (exit 2) |
| `post-tool` | PostToolUse | Yes |
| `permission` | PermissionRequest | Yes |
| `notification` | Notification | No |
| `stop` | Stop | Yes |
| `session-end` | SessionEnd | No |
