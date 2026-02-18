# @urlshortener/cli

Professional command-line interface for the Enterprise URL Shortener service.

Manage shortened URLs, view analytics, handle bulk operations, and configure
custom domains -- all from your terminal.

## Installation

### Global (recommended)

```bash
npm install -g @urlshortener/cli
```

### npx (no install)

```bash
npx @urlshortener/cli --help
```

### From source

```bash
git clone <repo-url>
cd cli
npm install
npm run build
npm link
```

## Quick Start

```bash
# 1. Point to your API server (defaults to http://localhost:3000)
urlshort config set apiUrl http://localhost:3000

# 2. Authenticate
urlshort login

# 3. Shorten a URL
urlshort create https://example.com

# 4. List your URLs
urlshort list
```

## Commands

### Authentication

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `urlshort login`    | Authenticate with email/password  |
| `urlshort logout`   | Clear stored credentials          |
| `urlshort whoami`   | Show current user profile         |
| `urlshort register` | Create a new account              |

```bash
# Interactive login
urlshort login

# Non-interactive login (useful in scripts)
urlshort login -e user@example.com -p mypassword

# Show profile as JSON
urlshort whoami --json
```

### URL Management

| Command                | Description                   |
| ---------------------- | ----------------------------- |
| `urlshort create <url>` | Create a short URL           |
| `urlshort list`         | List all your URLs           |
| `urlshort info <id>`    | Show URL details             |
| `urlshort update <id>`  | Update URL properties        |
| `urlshort delete <id>`  | Delete a URL                 |

```bash
# Basic shortening
urlshort create https://example.com/very/long/path

# With custom slug and title
urlshort create https://example.com -s my-link -t "My Link"

# With expiration date
urlshort create https://example.com --expires 2025-12-31

# List with pagination and filtering
urlshort list --page 2 --limit 50 --status active

# Update a URL
urlshort update abc1234 --title "Updated Title" --status disabled

# Delete with confirmation skip (for scripts)
urlshort delete abc1234 --force
```

### Analytics

| Command                    | Description                    |
| -------------------------- | ------------------------------ |
| `urlshort analytics <id>`  | View click analytics           |

```bash
# View last 30 days (default)
urlshort analytics abc1234

# View last 7 days
urlshort analytics abc1234 --period 7d

# JSON output for programmatic use
urlshort analytics abc1234 --json
```

The analytics display includes:

- Total clicks and unique visitors
- Top countries (bar chart)
- Top browsers (bar chart)
- Top devices (bar chart)
- Clicks by day (sparkline)

### Bulk Operations

| Command                    | Description                    |
| -------------------------- | ------------------------------ |
| `urlshort import <csv>`    | Bulk import URLs from CSV      |
| `urlshort export`          | Export all URLs to CSV         |

```bash
# Import from CSV
urlshort import urls.csv

# Preview import without changes
urlshort import urls.csv --dry-run

# Import with smaller batch size
urlshort import urls.csv --batch-size 5

# Export all URLs
urlshort export

# Export to specific file
urlshort export -o backup.csv

# Export only active URLs
urlshort export --status active
```

**CSV import format:**

```csv
url,slug,title
https://example.com,my-link,Example Site
https://another.com,,Another Site
```

Required column: `url` (or `URL` or `original_url`).
Optional columns: `slug` (or `custom_slug`), `title`.

### Custom Domains

| Command                          | Description                    |
| -------------------------------- | ------------------------------ |
| `urlshort domains list`          | List custom domains            |
| `urlshort domains add <domain>`  | Add a custom domain            |
| `urlshort domains remove <domain>` | Remove a custom domain       |
| `urlshort domains verify <domain>` | Verify domain ownership      |

```bash
# Add a domain
urlshort domains add links.example.com

# Verify after adding DNS record
urlshort domains verify links.example.com

# List all domains
urlshort domains list
```

### Configuration

| Command                          | Description                    |
| -------------------------------- | ------------------------------ |
| `urlshort config show`           | Display current settings       |
| `urlshort config set <key> <val>` | Set a config value            |
| `urlshort config reset`          | Reset to defaults              |
| `urlshort config path`           | Show config file location      |

```bash
# View configuration
urlshort config show

# Change API endpoint
urlshort config set apiUrl https://api.example.com

# Set default output format
urlshort config set outputFormat json

# Reset everything
urlshort config reset
```

**Available configuration keys:**

| Key             | Description                          | Default                 |
| --------------- | ------------------------------------ | ----------------------- |
| `apiUrl`        | API server URL                       | `http://localhost:3000` |
| `outputFormat`  | Default output: `text` or `json`     | `text`                  |
| `colorEnabled`  | Enable terminal colors               | `true`                  |
| `defaultDomain` | Default custom domain                | (empty)                 |
| `apiKey`        | API key for authentication           | (empty)                 |

## Global Options

| Flag          | Description                          |
| ------------- | ------------------------------------ |
| `--verbose`   | Enable debug-level log output        |
| `--quiet`     | Suppress all non-essential output    |
| `--debug`     | Show full stack traces on errors     |
| `--no-color`  | Disable colorized output             |
| `--json`      | Output machine-readable JSON         |
| `-v, --version` | Show version number                |
| `-h, --help`  | Show help text                       |

## Environment Variables

Configuration values can be overridden with environment variables:

| Variable                | Overrides        |
| ----------------------- | ---------------- |
| `URLSHORT_API_URL`      | `apiUrl`         |
| `URLSHORT_AUTH_TOKEN`   | `authToken`      |
| `URLSHORT_API_KEY`      | `apiKey`         |
| `URLSHORT_OUTPUT_FORMAT`| `outputFormat`   |
| `URLSHORT_DEFAULT_DOMAIN` | `defaultDomain`|

```bash
# Use API key authentication
export URLSHORT_API_KEY=your-api-key
urlshort list

# Override API URL for a single command
URLSHORT_API_URL=https://staging.example.com urlshort list
```

## Configuration Storage

Settings are stored in the OS-appropriate config directory:

- **Linux:** `~/.config/urlshort/config.json`
- **macOS:** `~/Library/Preferences/urlshort/config.json`
- **Windows:** `%APPDATA%/urlshort/config.json`

Run `urlshort config path` to see the exact location.

## Exit Codes

| Code | Meaning                  |
| ---- | ------------------------ |
| 0    | Success                  |
| 1    | General error            |
| 2    | Invalid arguments        |
| 66   | File not found           |
| 69   | Network/service error    |
| 77   | Authentication error     |
| 78   | Configuration error      |
| 130  | Interrupted (Ctrl+C)     |

## Development

```bash
# Install dependencies
npm install

# Run in development mode (auto-reload)
npm run dev -- create https://example.com

# Build TypeScript
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npx tsc --noEmit
```

## Project Structure

```
cli/
  src/
    index.ts              Main CLI entry point (Commander.js program)
    commands/
      auth.ts             login, logout, whoami, register
      urls.ts             create, list, delete, update, info
      analytics.ts        analytics / stats
      bulk.ts             import, export (CSV)
      config-cmd.ts       config show/set/reset/path
      domains.ts          domains list/add/remove/verify
    utils/
      api-client.ts       HTTP client wrapping fetch()
      config.ts           Persistent config with `conf` package
      errors.ts           Custom error classes with exit codes
      error-handler.ts    Global error/signal handlers
      formatters.ts       chalk, cli-table3, boxen output helpers
      logger.ts           Pino logger setup
      validators.ts       Input validation for prompts
    __tests__/
      api-client.test.ts
      config.test.ts
      error-handler.test.ts
      errors.test.ts
      formatters.test.ts
      validators.test.ts
  dist/                   Compiled JavaScript output
  package.json
  tsconfig.json
  jest.config.cjs
  README.md
```

## License

MIT
