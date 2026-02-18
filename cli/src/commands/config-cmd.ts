/**
 * Configuration management commands: show, set, reset, path.
 *
 * Allows users to view and modify persistent CLI settings such
 * as the API endpoint, default domain, and output format.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';

import {
  getConfig,
  setConfigValue,
  clearAllConfig,
  getConfigPath,
  type CLIConfig,
} from '../utils/config.js';
import { handleError } from '../utils/error-handler.js';
import { formatConfigDisplay, info, bold } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';
import { validateUrl, validateDomain } from '../utils/validators.js';

// ---------------------------------------------------------------------------
// Config show
// ---------------------------------------------------------------------------

async function showAction(options: { json?: boolean }): Promise<void> {
  try {
    const configData = getConfig();

    if (options.json) {
      // Mask sensitive values in JSON output too
      const safe = {
        ...configData,
        authToken: configData.authToken ? '****' : '',
        apiKey: configData.apiKey ? '****' : '',
        refreshToken: configData.refreshToken ? '****' : '',
      };
      console.log(JSON.stringify(safe, null, 2));
      return;
    }

    console.log('');
    console.log(bold('  Configuration'));
    console.log(chalk.dim(`  File: ${getConfigPath()}`));
    console.log('');
    console.log(formatConfigDisplay(configData as unknown as Record<string, unknown>));
    console.log('');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Config set
// ---------------------------------------------------------------------------

const EDITABLE_KEYS: Array<{ key: keyof CLIConfig; label: string }> = [
  { key: 'apiUrl', label: 'API URL' },
  { key: 'outputFormat', label: 'Output format (text/json)' },
  { key: 'colorEnabled', label: 'Color enabled' },
  { key: 'defaultDomain', label: 'Default custom domain' },
  { key: 'apiKey', label: 'API key' },
];

async function setAction(
  key: string | undefined,
  value: string | undefined,
): Promise<void> {
  try {
    if (key && value !== undefined) {
      // Direct set: urlshort config set apiUrl http://example.com
      applyConfigValue(key, value);
      console.log(chalk.green(`  Configuration updated: ${key} = ${value}`));
      logger.debug({ key, value }, 'Config value set');
      return;
    }

    // Interactive mode
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'key',
        message: 'Which setting do you want to change?',
        choices: EDITABLE_KEYS.map((k) => ({
          name: `${k.label} (${k.key})`,
          value: k.key,
        })),
        when: !key,
      },
      {
        type: 'input',
        name: 'value',
        message: (ans: Record<string, unknown>) =>
          `New value for ${chalk.cyan(String(key ?? ans['key']))}:`,
        validate: (input: string, ans: Record<string, unknown> | undefined) => {
          const selectedKey = key ?? ans?.['key'] as string;
          if (selectedKey === 'apiUrl') return validateUrl(input);
          if (selectedKey === 'defaultDomain') {
            if (!input) return true;
            return validateDomain(input);
          }
          if (selectedKey === 'outputFormat') {
            return ['text', 'json'].includes(input) ? true : 'Must be "text" or "json".';
          }
          return true;
        },
        when: value === undefined,
      },
    ]);

    const finalKey = key ?? answers['key'] as string;
    const finalValue = value ?? answers['value'] as string;

    applyConfigValue(finalKey, finalValue);
    console.log(chalk.green(`  Configuration updated: ${finalKey} = ${finalValue}`));
    logger.debug({ key: finalKey, value: finalValue }, 'Config value set');
  } catch (err: unknown) {
    handleError(err);
  }
}

function applyConfigValue(key: string, value: string): void {
  const validKeys = EDITABLE_KEYS.map((k) => k.key);
  if (!validKeys.includes(key as keyof CLIConfig) && key !== 'apiKey') {
    console.log(chalk.yellow(`  Unknown config key: ${key}`));
    console.log(chalk.dim(`  Valid keys: ${validKeys.join(', ')}`));
    return;
  }

  if (key === 'colorEnabled') {
    setConfigValue('colorEnabled', value === 'true' || value === '1');
  } else if (key === 'outputFormat') {
    if (value !== 'text' && value !== 'json') {
      console.log(chalk.yellow('  Output format must be "text" or "json".'));
      return;
    }
    setConfigValue('outputFormat', value);
  } else {
    setConfigValue(key as keyof CLIConfig, value as never);
  }
}

// ---------------------------------------------------------------------------
// Config reset
// ---------------------------------------------------------------------------

async function resetAction(options: { force?: boolean }): Promise<void> {
  try {
    if (!options.force) {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Reset all configuration to defaults? This will log you out.',
          default: false,
        },
      ]) as { confirmed: boolean };

      if (!confirmed) {
        console.log(info('Reset cancelled.'));
        return;
      }
    }

    clearAllConfig();
    console.log(chalk.green('  Configuration reset to defaults.'));
    logger.debug('Config reset');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Config path
// ---------------------------------------------------------------------------

function pathAction(): void {
  console.log(getConfigPath());
}

// ---------------------------------------------------------------------------
// Register commands
// ---------------------------------------------------------------------------

export function registerConfigCommands(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage CLI configuration');

  configCmd
    .command('show')
    .alias('list')
    .description('Display current configuration')
    .option('--json', 'Output as JSON')
    .action(showAction);

  configCmd
    .command('set [key] [value]')
    .description('Set a configuration value')
    .addHelpText(
      'after',
      `
Available keys:
  apiUrl          API server URL (e.g., http://localhost:3000)
  outputFormat    Default output format: text or json
  colorEnabled    Enable terminal colors: true or false
  defaultDomain   Default custom domain for short URLs
  apiKey          API key for authentication

Examples:
  $ urlshort config set apiUrl http://localhost:3000
  $ urlshort config set outputFormat json
  $ urlshort config set                          # interactive mode
`,
    )
    .action(setAction);

  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(resetAction);

  configCmd
    .command('path')
    .description('Show the configuration file path')
    .action(pathAction);
}
