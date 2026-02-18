# Framework-Specific Rules

## Next.js

```yaml
permissions:
  auto-approve-next:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "next"
    decision: allow

  # Build output protection
  block-next-cache:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: ".next/**"
    decision: deny
    message: "Do not edit .next/ cache. Run `next build` to regenerate."
    locked: true

preconditions:
  warn-app-router-convention:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "app/**/page.tsx"
    message: "Page files must export default. Check naming conventions."
    priority: 70

  warn-next-config:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "next.config.*"
    message: "Next.js config changes may require dev server restart and affect build behavior."
    priority: 60

  warn-middleware:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "middleware.ts"
    message: "Middleware runs on every request. Verify edge runtime compatibility."
    priority: 60

postconditions:
  # Lint on save (Next.js built-in linter)
  nextjs-lint-on-save:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.{ts,tsx}"
    run: "npx next lint --quiet"
    timeout: 30000
    block_on_failure: false

  # Typecheck on save
  nextjs-typecheck:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.{ts,tsx}"
    run: "tsc --noEmit"
    timeout: 30000
    block_on_failure: true
```

## Nuxt

```yaml
permissions:
  auto-approve-nuxt:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "nuxt"
    decision: allow

  auto-approve-nuxi:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "nuxi"
    decision: allow

  # Build output protection
  block-nuxt-cache:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: ".nuxt/**"
    decision: deny
    message: "Do not edit .nuxt/ cache. Run `nuxt build` to regenerate."
    locked: true

  block-nuxt-output:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: ".output/**"
    decision: deny
    message: "Do not edit .output/. Run `nuxt build` to regenerate."
    locked: true

preconditions:
  warn-nuxt-config:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "nuxt.config.*"
    message: "Nuxt config changes may require dev server restart."
    priority: 60

postconditions:
  nuxt-typecheck:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.{ts,vue}"
    run: "npx nuxi typecheck"
    timeout: 30000
    block_on_failure: true
```

## NestJS

```yaml
permissions:
  auto-approve-nest:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "nest"
    decision: allow

  # Build output protection
  block-nest-dist:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "dist/**"
    decision: deny
    message: "Do not edit dist/. Run `nest build` to regenerate."
    locked: true

preconditions:
  warn-module-changes:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.module.ts"
    message: "Module changes affect dependency injection. Verify imports/exports."
    priority: 70

postconditions:
  nest-build-check:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "src/**/*.ts"
    run: "nest build"
    timeout: 30000
    block_on_failure: true
```

## SvelteKit

```yaml
permissions:
  auto-approve-svelte:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "svelte-kit"
    decision: allow

  # Build output protection
  block-svelte-kit-output:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: ".svelte-kit/**"
    decision: deny
    message: "Do not edit .svelte-kit/. Run `svelte-kit build` to regenerate."
    locked: true

preconditions:
  warn-svelte-config:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "svelte.config.*"
    message: "SvelteKit config changes may require dev server restart."
    priority: 60

postconditions:
  svelte-check:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.{ts,svelte}"
    run: "npx svelte-check"
    timeout: 30000
    block_on_failure: true
```

## Angular

```yaml
permissions:
  auto-approve-ng:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "ng"
    decision: allow

  # Build output protection
  block-angular-dist:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "dist/**"
    decision: deny
    message: "Do not edit dist/. Run `ng build` to regenerate."
    locked: true

preconditions:
  warn-angular-json:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "angular.json"
    message: "angular.json changes affect build configuration and all projects."
    priority: 60

postconditions:
  angular-lint:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.ts"
    run: "ng lint"
    timeout: 30000
    block_on_failure: false
```

## Expo React Native

```yaml
permissions:
  auto-approve-expo:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "expo"
    decision: allow

  auto-approve-npx-expo:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "npx expo"
    decision: allow

  auto-approve-eas:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "eas"
    decision: allow

  # Build output protection
  block-expo-cache:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: ".expo/**"
    decision: deny
    message: "Do not edit .expo/ cache. Run `npx expo start --clear` to regenerate."
    locked: true

preconditions:
  warn-app-json:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "app.json"
    message: "app.json changes may require a native rebuild (npx expo prebuild --clean)."
    priority: 60

  warn-plugins:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "plugins/**"
    message: "Plugin changes require prebuild. Run `npx expo prebuild` after editing."
    priority: 60

postconditions:
  expo-typecheck:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.{ts,tsx}"
    run: "tsc --noEmit"
    timeout: 30000
    block_on_failure: true

  expo-config-check:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "app.json"
    run: "npx expo config --type public"
    timeout: 10000
    block_on_failure: false
```

## Laravel

```yaml
permissions:
  auto-approve-artisan:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "php artisan"
    decision: allow

  block-migrate-fresh:
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "artisan migrate:fresh"
    decision: deny
    message: "migrate:fresh drops all tables. Use migrate instead."

  block-db-wipe:
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "artisan db:wipe"
    decision: deny
    message: "db:wipe destroys the database."

  # Build artifact protection
  block-vendor:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "vendor/**"
    decision: deny
    message: "Do not edit vendor/ directly. Use composer to manage dependencies."
    locked: true

  block-storage-framework:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "storage/framework/**"
    decision: deny
    message: "Do not edit storage/framework/ directly. These are generated cache files."
    locked: true

postconditions:
  # Cache clears after config/route/view changes
  laravel-config-clear:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "config/**/*.php"
    run: "php artisan config:clear"
    timeout: 10000
    block_on_failure: true

  laravel-route-clear:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "routes/**/*.php"
    run: "php artisan route:clear"
    timeout: 10000
    block_on_failure: true

  laravel-view-clear:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "resources/views/**/*.blade.php"
    run: "php artisan view:clear"
    timeout: 10000
    block_on_failure: true

  # Migration check
  migrate-after-migration:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "database/migrations/*.php"
    run: "php artisan migrate --pretend"
    timeout: 15000
    block_on_failure: false

  # Lint on save (if Pint or PHP-CS-Fixer detected)
  laravel-lint:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.php"
    run: "./vendor/bin/pint --test"  # or php-cs-fixer fix --dry-run
    timeout: 30000
    block_on_failure: false
```

## Django

```yaml
permissions:
  auto-approve-manage:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "python manage.py"
    decision: allow

  block-flush:
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "manage.py flush"
    decision: deny
    message: "manage.py flush deletes all data."

postconditions:
  # Django system check
  django-check:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.py"
    run: "python manage.py check"
    timeout: 15000
    block_on_failure: true

  # Migration check after model changes
  django-migrations-check:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/models.py"
    run: "python manage.py makemigrations --check --dry-run"
    timeout: 15000
    block_on_failure: false

  makemigrations:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/models.py"
    run: "python manage.py makemigrations"
    timeout: 30000
    block_on_failure: false
```

## FastAPI

```yaml
permissions:
  auto-approve-uvicorn:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "uvicorn"
    decision: allow

  auto-approve-fastapi:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "fastapi"
    decision: allow

preconditions:
  warn-schema-changes:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "**/schemas.py"
    message: "Schema changes may affect API contracts."
    priority: 70

postconditions:
  # Typecheck on save (use detected: mypy or pyright)
  fastapi-typecheck:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.py"
    run: "mypy ."  # or pyright .
    timeout: 30000
    block_on_failure: true
```

## Rails

```yaml
permissions:
  auto-approve-rails:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "rails"
    decision: allow

  block-db-drop:
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "rails db:drop"
    decision: deny
    message: "rails db:drop destroys the database."

postconditions:
  db-migrate:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "db/migrate/*.rb"
    run: "rails db:migrate"
    timeout: 30000
    block_on_failure: false

  # Lint on save (if RuboCop detected)
  rubocop-check:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.rb"
    run: "rubocop --format quiet"
    timeout: 30000
    block_on_failure: false
```

## Prisma

```yaml
permissions:
  auto-approve-prisma:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "prisma"
    decision: allow

  block-prisma-reset:
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "prisma migrate reset"
    decision: deny
    message: "prisma migrate reset is destructive. Use prisma migrate dev."

postconditions:
  prisma-generate:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "prisma/schema.prisma"
    run: "npx prisma generate"
    timeout: 30000
    block_on_failure: true
```

## Drizzle

```yaml
permissions:
  auto-approve-drizzle:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "drizzle-kit"
    decision: allow

postconditions:
  drizzle-generate:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/schema.ts"
    run: "npx drizzle-kit generate"
    timeout: 30000
    block_on_failure: false
```

## Vitest

```yaml
permissions:
  auto-approve-vitest:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "vitest"
    decision: allow
```

## Jest

```yaml
permissions:
  auto-approve-jest:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "jest"
    decision: allow
```

## ESLint

```yaml
permissions:
  auto-approve-eslint:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "eslint"
    decision: allow

postconditions:
  eslint-on-save:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.{ts,tsx,js,jsx}"
    run: "eslint --quiet {file_path}"
    timeout: 15000
    block_on_failure: false
```

## Prettier

```yaml
permissions:
  auto-approve-prettier:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "prettier"
    decision: allow

postconditions:
  prettier-check-on-save:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.{ts,tsx,js,jsx,json,css,md}"
    run: "prettier --check {file_path}"
    timeout: 10000
    block_on_failure: false
```

## Biome

```yaml
permissions:
  auto-approve-biome:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "biome"
    decision: allow

postconditions:
  biome-check-on-save:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.{ts,tsx,js,jsx,json}"
    run: "biome check {file_path}"
    timeout: 15000
    block_on_failure: false
```

## TypeScript (tsup/tsc)

```yaml
permissions:
  auto-approve-tsc:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "tsc"
    decision: allow

  auto-approve-tsup:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "tsup"
    decision: allow

postconditions:
  typecheck-on-save:
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "**/*.{ts,tsx}"  # Detect extensions: add .vue if Vue SFC, .mts/.cts if used
    run: "tsc --noEmit"
    timeout: 30000
    block_on_failure: true
```

## Vite

```yaml
permissions:
  auto-approve-vite:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "vite"
    decision: allow

preconditions:
  warn-vite-config:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "vite.config.*"
    message: "Vite config changes may require dev server restart."
    priority: 60
```

## Turborepo (Monorepo)

When Turborepo is detected, the skill MUST map the full workspace topology (Step 2b in SKILL.md) and generate monorepo-aware rules. The rules below are templates — replace placeholders with actual package names and paths from the detected topology.

### Header — Workspace Topology Comment

Always include a topology diagram in the YAML header:

```yaml
# Workspace Topology:
#   {app-package} → {lib-package} (one-way dependency)
#   {standalone-package} (no internal deps)
#
# Task Graph (from turbo.json):
#   build: depends on ^build
#   type-check: depends on ^type-check
#   lint: depends on ^lint
```

### Permissions

```yaml
permissions:
  auto-approve-turbo:
    trigger: PermissionRequest
    matcher: Bash
    command_pattern: "turbo"
    decision: allow

  # Build artifact protection
  block-turbo-cache:
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: ".turbo/**"
    decision: deny
    message: "Do not edit .turbo/ cache. Run `turbo` to regenerate."
    locked: true
```

### Preconditions — Package Boundary Enforcement

Generate one rule per dependency boundary. The `file_pattern` and `import_pattern` should reflect the actual package names.

```yaml
preconditions:
  # Package boundary: {lib-package} must NOT import from {app-package}
  # Generate one rule per forbidden import direction
  no-{lib-short}-imports-{app-short}:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "{lib-package-path}/**"
    message: "{lib-package} must not import from {app-package}. Dependency flows {app} → {lib}, never reverse."
    priority: 80

  # Prefer turbo over direct package manager for tasks defined in turbo.json
  prefer-turbo-over-direct:
    enabled: true
    trigger: PreToolUse
    matcher: Bash
    command_pattern: "{package_manager} (build|lint|type-check|test)"
    message: "Use `turbo run <task>` or `turbo run <task> --filter=<package>` instead of running {package_manager} directly for tasks defined in turbo.json."
    priority: 70

  # Critical config cautions
  caution-turbo-config:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "turbo.json"
    message: "turbo.json defines the task graph and caching for ALL packages. Changes affect the entire monorepo build pipeline."
    priority: 90

  caution-root-package-json:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "package.json"
    message: "Root package.json defines workspace scripts and shared devDependencies. Changes affect all packages."
    priority: 80

  caution-workspace-config:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "pnpm-workspace.yaml"  # or package.json workspaces field
    message: "Workspace config defines which directories are packages. Changes affect monorepo structure."
    priority: 90
```

### Preconditions — Project-Specific Critical Files

Generate caution rules for files identified as architecturally critical during topology mapping. Examples:

```yaml
  # Barrel exports (index.ts files that re-export from a package)
  caution-barrel-exports:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "{lib-package-path}/src/index.ts"
    message: "Barrel export for {lib-package}. Adding/removing exports affects all consumers."
    priority: 80

  # Framework middleware, adapters, or other high-impact files
  # Customize based on what you find during topology mapping
  caution-{critical-file}:
    enabled: true
    trigger: PreToolUse
    matcher: "Write|Edit"
    file_pattern: "{path-to-critical-file}"
    message: "{Explanation of why this file is critical}"
    priority: 80
```

### Postconditions — Per-Package Type Checking

Generate one postcondition per package. Use `turbo run --filter=` to scope to the affected package.

```yaml
postconditions:
  # Per-package type checking — one rule per workspace package
  type-check-{package-short}-on-change:
    enabled: false  # postconditions disabled by default
    trigger: PostToolUse
    matcher: "Write|Edit"
    file_pattern: "{package-path}/**/*.{ts,tsx}"
    run: "turbo run type-check --filter={package-name}"
    timeout: 30000
    block_on_failure: true

  # Example for a package with no build step (consumed as source):
  # type-check-ui-on-change:
  #   file_pattern: "packages/ui/**/*.{ts,tsx}"
  #   run: "turbo run type-check --filter=@maya/ui"

  # Example for an app package:
  # type-check-web-on-change:
  #   file_pattern: "apps/web/**/*.{ts,tsx}"
  #   run: "turbo run type-check --filter=@maya/web"
```

### Pipelines — Use Turbo Directly

**IMPORTANT:** Every pipeline MUST include `on_failure`. It is a required field. Omitting it causes a validation error.

```yaml
pipelines:
  pre-commit-checks:
    enabled: true
    trigger: "PreToolUse"
    matcher: "Bash"
    command_pattern: "git commit"
    steps:
      - name: "type-check"
        run: "turbo run type-check"
        timeout: 60000
      - name: "lint"
        run: "turbo run lint"
        timeout: 60000
    on_failure: "block"          # REQUIRED — "block" or "warn"
    message: "Pre-commit checks via turbo."
    locked: true
    priority: 5

  full-check:
    enabled: false
    steps:
      - run: "turbo run type-check"
        label: "Type-check all packages"
        timeout: 60000
      - run: "turbo run lint"
        label: "Lint all packages"
        timeout: 60000
    on_failure: "warn"           # REQUIRED — "block" or "warn"
```

### What NOT to Generate for Turborepo

- **Do NOT use `pnpm build` / `pnpm lint` in postconditions** — use `turbo run <task> --filter=<pkg>` instead
- **Do NOT generate global `tsc --noEmit` postconditions** — each package has its own tsconfig; use turbo to respect the task graph
- **Do NOT omit the topology comment** — it documents the workspace structure for humans
- **Do NOT skip package boundary rules** — they prevent the most common monorepo mistake (reverse imports)
- **Do NOT auto-approve git push** — even in monorepos, pushes affect shared state
