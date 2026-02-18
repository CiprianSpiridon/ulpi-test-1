# Exports Reference

Summary of all packages. **~692 exports across 20 packages.** For per-export details, see each package's `CLAUDE.md`.

| Package | Exports | Purpose |
|---------|---------|---------|
| @ulpi/contracts | 198 | Shared types + Zod schemas (13 domain files) |
| @ulpi/config | 70 | Paths, env, settings |
| @ulpi/guards-engine | 42 | Parser, evaluator, matchers, Zod schemas |
| @ulpi/session-engine | 11 | Store, tracker, events, phase, validation |
| @ulpi/stack-engine | 19 | 10 detectors + helpers |
| @ulpi/templates-engine | 17 | Loader, resolver, skills |
| @ulpi/notifications-engine | 19 | 4 channels, routing, dedup |
| @ulpi/projects-engine | 11 | Registry CRUD |
| @ulpi/history-engine | 42 | Git ops, collector, entries |
| @ulpi/review-engine | 31 | Parser, scoring, storage, diff |
| @ulpi/review-runtime | 9 | ReviewHub, discovery, transport |
| @ulpi/api-client | 37 | Typed HTTP/WS client |
| @ulpi/api | 34 | HTTP server, router, middleware |
| @ulpi/codemap-engine | 80 | Semantic code search, vector + BM25 + AST chunking |
| @ulpi/codemap-mcp | 2 | MCP server for CodeMap tools (11 tools: 5 search + 6 depgraph) |
| @ulpi/depgraph-engine | 28 | Tag extraction, reference graph, PageRank, cycle detection, coupling |
| @ulpi/memory-engine | 58 | Agent memory capture, classification, search |
| @ulpi/memory-mcp | 2 | MCP server for memory tools (6 tools) |
| @ulpi/contracts-ci | 42 | CI types + Zod schemas (commands, jobs, config, worker, Jira) |
| @ulpi/ci-engine | 30 | CI logic (GitHub/Jira clients, jobs, workspace, formatters) |

## Import Patterns

```typescript
// Types (from contracts)
import type {
  HookInput, HookOutput, EvaluationResult,
  Rule, PreconditionRule, PermissionRule,
  SessionPhase, SessionState, SessionEvent,
  RulesConfig, StackConfig, TemplateLayer,
  DetectedItem, StackDetectionResult,
  ProjectEntry, HistoryEntry, TimelineEntry,
  Block, Plan, PlanSection, ReviewAnnotation,
  ReviewDecision, ReviewConfig, ReviewHubSession,
} from "@ulpi/contracts";

// Config
import { ULPI_GLOBAL_DIR, projectGuardsFile, loadUlpiSettings } from "@ulpi/config";

// Guards engine
import { parseRules, loadRulesSync, evaluateRules, RulesConfigSchema } from "@ulpi/guards-engine";

// Session
import { JsonSessionStore, createInitialState, appendEvent, nextPhase, validateSessionId } from "@ulpi/session-engine";

// Stack detection
import { detectStack } from "@ulpi/stack-engine";

// Templates & skills
import { loadBundledTemplates, composeTemplates, resolveTemplate, BUNDLED_SKILLS } from "@ulpi/templates-engine";

// Notifications
import { classifyNotification, routeNotification, NotificationDeduplicator } from "@ulpi/notifications-engine";

// Projects
import { registerProject, listProjects, getProject } from "@ulpi/projects-engine";

// History
import { historyBranchExists, writeHistoryEntry, readTimeline, buildSessionSummary, listBranchOnlyCommits } from "@ulpi/history-engine";

// Review
import { parseMarkdownToBlocks, scorePlanQuality, savePlan, loadPlan } from "@ulpi/review-engine";
import { ReviewHub, discoverUlpiServer, waitForServerDecision } from "@ulpi/review-runtime";

// API (library usage)
import { createApiServer, attachWebSocket, createRouter } from "@ulpi/api";
import type { RouteContext } from "@ulpi/api";

// API client (web-ui usage)
import { UlpiClient, createClient, SessionWebSocket } from "@ulpi/api-client";

// CodeMap
import { runInitPipeline, searchCode, getCodemapStatus, CodemapStore } from "@ulpi/codemap-engine";
import { createMcpServer, startMcpServer } from "@ulpi/codemap-mcp";

// DepGraph
import type { Tag, DepGraph, DepGraphEdge, PageRankResult, CyclicDependency, ModuleCoupling } from "@ulpi/contracts";
import { loadGraph, computePageRank, detectCycles, computeCoupling } from "@ulpi/depgraph-engine";

// Memory
import { searchMemory, getTopMemories, formatMemoriesForAgent, classifySession, rememberMemory } from "@ulpi/memory-engine";
import { writeClassifyBatchProgress, readClassifyBatchProgress, clearClassifyBatchProgress } from "@ulpi/memory-engine";
import type { ClassifyResult, ClassifyBatchProgress, DedupResult, MemoryVectorItem } from "@ulpi/memory-engine";
import { createMemoryMcpServer, startMemoryMcpServer } from "@ulpi/memory-mcp";

// CI types
import type {
  CiCommand, CiCommandType, Job, JobConfig, JobResult, JobStatus,
  OrchestratorConfig, GitHubAuthConfig, DockerConfig, SecurityConfig,
  WorkerInput, WorkerOutput, WorkerProgress,
  JiraTicket, JiraReference, ClaudeCredentials,
} from "@ulpi/contracts-ci";

// CI engine
import {
  parseCommand, JobStore,
  postPrComment, updateComment, getPullRequest, createCheckRun,
  generateAppJwt, getInstallationToken, resolveGitHubToken,
  extractJiraKeys, fetchTickets, formatTicketsForPrompt,
  cloneRepo, checkoutRef, collectDiff, pushChanges,
  formatJobResult, formatQueuedComment, buildPrompt,
  extractCredentials, writeCredentials, validateCredentials,
} from "@ulpi/ci-engine";
```

## Bundled Templates (28) & Skills (6)

**Templates** (`packages/templates-engine/templates/`): quality-of-life, nodejs, typescript, python, go, rust, php, ruby, pnpm, npm, yarn, prettier, eslint, biome, vitest, jest, nextjs, express, nestjs, laravel, django, fastapi, prisma, git-flow, github-flow, conventional-commits, monorepo, docker

**Skills** (`packages/templates-engine/skills/`): conventional-commits, safe-migrations, env-management, error-handling, test-writing, code-review-checklist
