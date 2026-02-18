/**
 * Global error handler for the URL Shortener CLI.
 *
 * Formats errors with chalk colors, prints actionable suggestions,
 * and exits with the appropriate exit code.
 */

import chalk from 'chalk';
import { CLIError, ValidationError } from './errors.js';
import { logger } from './logger.js';

const isDebug =
  process.env['DEBUG'] !== undefined ||
  process.argv.includes('--debug');

/**
 * Handle an error, print a user-friendly message, and exit.
 */
export function handleError(err: unknown): never {
  if (err instanceof CLIError) {
    formatCLIError(err);
    process.exit(err.exitCode);
  }

  if (err instanceof Error) {
    logger.error({ err }, 'Unexpected error');
    console.error('');
    console.error(chalk.red.bold('  Error: ') + chalk.red(err.message));

    if (isDebug && err.stack) {
      console.error('');
      console.error(chalk.dim('  Stack trace:'));
      console.error(chalk.dim(`  ${err.stack}`));
    } else {
      console.error(chalk.dim('  Run with --debug for a full stack trace.'));
    }

    console.error('');
    process.exit(1);
  }

  console.error(chalk.red.bold('  An unexpected error occurred.'));
  console.error(chalk.dim('  Run with --debug for details.'));
  process.exit(1);
}

/**
 * Format and print a CLIError with suggestions.
 */
function formatCLIError(err: CLIError): void {
  console.error('');
  console.error(chalk.red.bold('  Error: ') + chalk.red(err.message));

  if (err instanceof ValidationError && err.errors.length > 0) {
    console.error('');
    console.error(chalk.yellow('  Validation errors:'));
    for (const validationErr of err.errors) {
      console.error(chalk.yellow(`    - ${validationErr}`));
    }
  }

  if (err.suggestions.length > 0) {
    console.error('');
    console.error(chalk.yellow('  Suggestions:'));
    for (const suggestion of err.suggestions) {
      console.error(chalk.yellow(`    - ${suggestion}`));
    }
  }

  if (isDebug && err.stack) {
    console.error('');
    console.error(chalk.dim('  Stack trace:'));
    console.error(chalk.dim(`  ${err.stack}`));
  }

  console.error('');
}

/**
 * Install global handlers for unhandled rejections and uncaught exceptions.
 */
export function installGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ reason }, 'Unhandled promise rejection');
    if (reason instanceof Error) {
      handleError(reason);
    }
    handleError(new CLIError('Unhandled promise rejection', 1));
  });

  process.on('uncaughtException', (err: Error) => {
    logger.fatal({ err }, 'Uncaught exception');
    handleError(err);
  });
}

/**
 * Install SIGINT handler for graceful Ctrl+C exit.
 */
export function installSignalHandlers(): void {
  process.on('SIGINT', () => {
    console.error('');
    console.error(chalk.yellow('  Interrupted by user.'));
    console.error('');
    process.exit(130);
  });

  process.on('SIGTERM', () => {
    console.error('');
    console.error(chalk.yellow('  Process terminated.'));
    console.error('');
    process.exit(143);
  });
}
