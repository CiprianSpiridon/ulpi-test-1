# CodeMap Search Guide

## What is CodeMap?

CodeMap MCP provides semantic code search over this project's codebase. It indexes all files and lets you search by meaning (not just text patterns). It's faster and cheaper than launching Explore agents or doing broad Glob/Grep sweeps.

## Available Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `mcp__codemap__search_code(query)` | Semantic search by natural language | "where is auth handled?", "session state management", "API route handlers" |
| `mcp__codemap__search_symbols(query)` | Find functions/classes/types by name | "evaluateRules", "SessionStore", "RouteContext" |
| `mcp__codemap__get_file_summary(filePath)` | Get chunks + symbols overview of a file | Before reading a long file, check what's in it |
| `mcp__codemap__get_index_stats()` | Check index health | Verify index is current before searching |
| `mcp__codemap__reindex()` | Rebuild the entire index | After major file changes (rare) |

## Search Decision Tree

```
Need to find code?
├── By concept/description ("authentication logic")
│   └── mcp__codemap__search_code ← FIRST CHOICE
├── By function/class/type name ("evaluateRules")
│   └── mcp__codemap__search_symbols ← FIRST CHOICE
├── By exact filename pattern ("**/*.test.ts")
│   └── Glob
├── By exact string/regex ("from \"@ulpi/session-engine\"")
│   └── Grep
├── Already know the file path
│   └── Read
└── Need multi-round deep investigation (all above failed)
    └── Explore agent ← LAST RESORT
```

## Examples

### Finding code by concept
```
mcp__codemap__search_code("session tracking state management")
→ packages/session-engine/src/store.ts (score: 0.89)
→ packages/session-engine/src/tracker.ts (score: 0.72)
```

### Finding functions by name
```
mcp__codemap__search_symbols("evaluateRules")
→ packages/guards-engine/src/evaluator.ts:42 (exact match)
```

### Typical search workflow
1. Start with 1-2 CodeMap searches to find relevant files and entry points
2. Read the top results (highest score) to understand patterns
3. Use Glob/Grep only if CodeMap misses something specific (exact string matching)
4. Never launch an Explore agent for something CodeMap already answered

## When NOT to Use CodeMap

- Exact string searches (imports, error messages) → Use Grep
- Finding files by name pattern → Use Glob
- Reading a file you already know the path of → Use Read
- AST structural patterns → Use ast-grep skill

## Tips

- `search_code` accepts natural language — describe what you're looking for in plain English
- `search_symbols` matches function, class, interface, type, const names
- Results include file paths + line ranges + relevance scores — use these to target Read calls
- Use `limit` parameter (default 10) to control result count
- Use `pathPrefix` to narrow searches to a specific directory
- Use `includeTests: false` to exclude test files from results
