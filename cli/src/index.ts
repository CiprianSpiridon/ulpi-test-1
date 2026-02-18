#!/usr/bin/env node

/**
 * urlshort - Professional CLI for URL Shortener Management
 *
 * Entry point that wires up Commander.js, registers all commands,
 * installs global error/signal handlers, and parses process.argv.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { registerAuthCommands } from './commands/auth.js';
import { registerUrlCommands } from './commands/urls.js';
import { registerAnalyticsCommand } from './commands/analytics.js';
import { registerBulkCommands } from './commands/bulk.js';
import { registerConfigCommands } from './commands/config-cmd.js';
import { registerDomainsCommands } from './commands/domains.js';
import { installGlobalErrorHandlers, installSignalHandlers } from './utils/error-handler.js';
import { setLogLevel } from './utils/logger.js';

// ---------------------------------------------------------------------------
// Read package.json for version
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PackageJson {
  version: string;
  description: string;
}

let pkg: PackageJson = { version: '1.0.0', description: 'URL Shortener CLI' };
try {
  const raw = readFileSync(join(__dirname, '..', 'package.json'), 'utf-8');
  pkg = JSON.parse(raw) as PackageJson;
} catch {
  // Fallback to hardcoded defaults
}

// ---------------------------------------------------------------------------
// Install global handlers
// ---------------------------------------------------------------------------

installGlobalErrorHandlers();
installSignalHandlers();

// ---------------------------------------------------------------------------
// Create program
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name('urlshort')
  .description(pkg.description)
  .version(pkg.version, '-v, --version', 'Display the current version')
  .option('--verbose', 'Enable verbose debug output')
  .option('--quiet', 'Suppress all non-essential output')
  .option('--debug', 'Show full stack traces on errors')
  .option('--no-color', 'Disable colorized output')
  .hook('preAction', (_thisCommand, _actionCommand) => {
    const opts = program.opts<{
      verbose?: boolean;
      quiet?: boolean;
      color?: boolean;
    }>();

    if (opts.quiet) {
      setLogLevel('silent');
    } else if (opts.verbose) {
      setLogLevel('debug');
    }

    if (opts.color === false) {
      chalk.level = 0;
    }
  });

// ---------------------------------------------------------------------------
// Register all command groups
// ---------------------------------------------------------------------------

registerAuthCommands(program);
registerUrlCommands(program);
registerAnalyticsCommand(program);
registerBulkCommands(program);
registerConfigCommands(program);
registerDomainsCommands(program);

// ---------------------------------------------------------------------------
// Custom help
// ---------------------------------------------------------------------------

program.addHelpText(
  'after',
  `
${chalk.bold('Examples:')}
  ${chalk.dim('$')} urlshort login
  ${chalk.dim('$')} urlshort create https://example.com
  ${chalk.dim('$')} urlshort create https://example.com -s my-link
  ${chalk.dim('$')} urlshort list
  ${chalk.dim('$')} urlshort analytics abc1234
  ${chalk.dim('$')} urlshort import urls.csv
  ${chalk.dim('$')} urlshort export -o backup.csv
  ${chalk.dim('$')} urlshort config show
  ${chalk.dim('$')} urlshort domains list

${chalk.bold('Authentication:')}
  Run ${chalk.cyan('urlshort login')} to authenticate, or set the
  ${chalk.cyan('URLSHORT_API_KEY')} environment variable.

${chalk.bold('Configuration:')}
  Settings are stored at ${chalk.dim('~/.config/urlshort/config.json')}
  Use ${chalk.cyan('urlshort config show')} to view current settings.
`,
);

// ---------------------------------------------------------------------------
// Default action when no command is given
// ---------------------------------------------------------------------------

program.action(() => {
  program.outputHelp();
});

// ---------------------------------------------------------------------------
// Parse and execute
// ---------------------------------------------------------------------------

program.parse(process.argv);
