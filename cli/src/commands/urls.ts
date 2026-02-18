/**
 * URL management commands: create, list, delete, update, info.
 *
 * Provides full CRUD operations against the URL Shortener API
 * with interactive prompts, progress indicators, and formatted output.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

import { apiPost, apiGet, apiDelete, apiPatch } from '../utils/api-client.js';
import { getConfigValue, isAuthenticated } from '../utils/config.js';
import { AuthenticationError, ValidationError } from '../utils/errors.js';
import { handleError } from '../utils/error-handler.js';
import { validateUrl, validateSlug } from '../utils/validators.js';
import {
  formatUrlTable,
  formatShortUrl,
  successBox,
  info,
  bold,
  link,
  type UrlRecord,
} from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateUrlResponse {
  id: string;
  shortCode: string;
  originalUrl: string;
  customSlug?: string;
  title?: string;
  createdAt: string;
}

interface ListUrlsResponse {
  urls: UrlRecord[];
  total: number;
  page: number;
  limit: number;
}

interface UrlDetailResponse extends UrlRecord {
  description?: string;
  maxClicks?: number;
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Create command
// ---------------------------------------------------------------------------

async function createAction(
  url: string | undefined,
  options: {
    slug?: string;
    title?: string;
    expires?: string;
    password?: string;
    json?: boolean;
  },
): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    // Prompt for URL if not provided as argument
    let targetUrl = url;
    if (!targetUrl) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Enter the URL to shorten:',
          validate: validateUrl,
          filter: (input: string) => input.trim(),
        },
      ]);
      targetUrl = answers['url'] as string;
    } else {
      const validation = validateUrl(targetUrl);
      if (validation !== true) {
        throw new ValidationError(validation);
      }
    }

    // Prompt for optional slug
    if (options.slug !== undefined) {
      const slugValidation = validateSlug(options.slug);
      if (slugValidation !== true) {
        throw new ValidationError(slugValidation);
      }
    }

    const spinner = ora('Creating short URL...').start();

    const body: Record<string, unknown> = {
      originalUrl: targetUrl,
    };

    if (options.slug) body['customSlug'] = options.slug;
    if (options.title) body['title'] = options.title;
    if (options.expires) body['expiresAt'] = options.expires;
    if (options.password) body['password'] = options.password;

    const { data } = await apiPost<CreateUrlResponse>('/api/urls', body);

    spinner.succeed('Short URL created');

    const baseUrl = getConfigValue('apiUrl');
    const slug = data.customSlug ?? data.shortCode;

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log(
      successBox(
        'URL Shortened',
        [
          `${bold('Short URL:')}    ${formatShortUrl(baseUrl, slug)}`,
          `${bold('Original:')}     ${link(data.originalUrl)}`,
          `${bold('Short Code:')}   ${chalk.white(data.shortCode)}`,
          data.title ? `${bold('Title:')}        ${chalk.white(data.title)}` : '',
          `${bold('ID:')}           ${chalk.dim(data.id)}`,
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    );

    logger.debug({ urlId: data.id, shortCode: data.shortCode }, 'URL created');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// List command
// ---------------------------------------------------------------------------

async function listAction(options: {
  page?: string;
  limit?: string;
  status?: string;
  sort?: string;
  json?: boolean;
}): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    const spinner = ora('Fetching URLs...').start();

    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page);
    if (options.limit) params.set('limit', options.limit);
    if (options.status) params.set('status', options.status);
    if (options.sort) params.set('sort', options.sort);

    const queryString = params.toString();
    const path = `/api/urls${queryString ? `?${queryString}` : ''}`;

    const { data } = await apiGet<ListUrlsResponse>(path);

    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const baseUrl = getConfigValue('apiUrl');

    console.log('');
    console.log(bold(`  Your URLs (${data.total} total, page ${data.page})`));
    console.log('');
    console.log(formatUrlTable(data.urls, baseUrl));
    console.log('');

    if (data.total > data.page * data.limit) {
      console.log(
        info(`Showing ${data.urls.length} of ${data.total}. Use --page to see more.`),
      );
      console.log('');
    }

    logger.debug({ total: data.total, page: data.page }, 'URLs listed');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Delete command
// ---------------------------------------------------------------------------

async function deleteAction(
  idOrCode: string | undefined,
  options: { force?: boolean; json?: boolean },
): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    let identifier = idOrCode;
    if (!identifier) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'identifier',
          message: 'Enter the URL ID or short code to delete:',
          validate: (input: string) =>
            input.trim().length > 0 ? true : 'ID or short code is required.',
        },
      ]);
      identifier = answers['identifier'] as string;
    }

    // Confirm unless --force
    if (!options.force) {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Are you sure you want to delete URL "${chalk.cyan(identifier)}"?`,
          default: false,
        },
      ]) as { confirmed: boolean };

      if (!confirmed) {
        console.log(info('Deletion cancelled.'));
        return;
      }
    }

    const spinner = ora('Deleting URL...').start();

    await apiDelete(`/api/urls/${identifier}`);

    spinner.succeed(`URL "${identifier}" deleted successfully`);

    if (options.json) {
      console.log(JSON.stringify({ deleted: true, identifier }, null, 2));
    }

    logger.debug({ identifier }, 'URL deleted');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Update command
// ---------------------------------------------------------------------------

async function updateAction(
  idOrCode: string | undefined,
  options: {
    title?: string;
    slug?: string;
    status?: string;
    expires?: string;
    json?: boolean;
  },
): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    let identifier = idOrCode;
    if (!identifier) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'identifier',
          message: 'Enter the URL ID or short code to update:',
          validate: (input: string) =>
            input.trim().length > 0 ? true : 'ID or short code is required.',
        },
      ]);
      identifier = answers['identifier'] as string;
    }

    // Build update body from options; if nothing passed, prompt interactively
    const body: Record<string, unknown> = {};

    if (options.title !== undefined) body['title'] = options.title;
    if (options.slug !== undefined) body['customSlug'] = options.slug;
    if (options.status !== undefined) body['status'] = options.status;
    if (options.expires !== undefined) body['expiresAt'] = options.expires;

    if (Object.keys(body).length === 0) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'New title (leave blank to skip):',
        },
        {
          type: 'input',
          name: 'customSlug',
          message: 'New custom slug (leave blank to skip):',
          validate: validateSlug,
        },
        {
          type: 'list',
          name: 'status',
          message: 'Status:',
          choices: [
            { name: 'Keep current', value: '' },
            { name: 'Active', value: 'active' },
            { name: 'Disabled', value: 'disabled' },
          ],
        },
      ]);

      if (answers['title']) body['title'] = answers['title'];
      if (answers['customSlug']) body['customSlug'] = answers['customSlug'];
      if (answers['status']) body['status'] = answers['status'];
    }

    if (Object.keys(body).length === 0) {
      console.log(info('No changes specified.'));
      return;
    }

    const spinner = ora('Updating URL...').start();

    const { data } = await apiPatch<UrlDetailResponse>(
      `/api/urls/${identifier}`,
      body,
    );

    spinner.succeed('URL updated successfully');

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const baseUrl = getConfigValue('apiUrl');
    const slug = data.customSlug ?? data.shortCode;

    console.log('');
    console.log(bold('  Updated URL'));
    console.log(`  ${chalk.dim('Short URL:')}  ${formatShortUrl(baseUrl, slug)}`);
    console.log(`  ${chalk.dim('Title:')}      ${chalk.white(data.title ?? '(none)')}`);
    console.log(`  ${chalk.dim('Status:')}     ${chalk.white(data.status)}`);
    console.log(`  ${chalk.dim('Clicks:')}     ${chalk.white(String(data.clicks))}`);
    console.log('');

    logger.debug({ identifier, updates: body }, 'URL updated');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Info command
// ---------------------------------------------------------------------------

async function infoAction(
  idOrCode: string | undefined,
  options: { json?: boolean },
): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    let identifier = idOrCode;
    if (!identifier) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'identifier',
          message: 'Enter the URL ID or short code:',
          validate: (input: string) =>
            input.trim().length > 0 ? true : 'ID or short code is required.',
        },
      ]);
      identifier = answers['identifier'] as string;
    }

    const spinner = ora('Fetching URL details...').start();

    const { data } = await apiGet<UrlDetailResponse>(`/api/urls/${identifier}`);

    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const baseUrl = getConfigValue('apiUrl');
    const slug = data.customSlug ?? data.shortCode;

    console.log('');
    console.log(bold('  URL Details'));
    console.log(`  ${chalk.dim('ID:')}           ${chalk.white(data.id)}`);
    console.log(`  ${chalk.dim('Short URL:')}    ${formatShortUrl(baseUrl, slug)}`);
    console.log(`  ${chalk.dim('Original:')}     ${link(data.originalUrl)}`);
    console.log(`  ${chalk.dim('Short Code:')}   ${chalk.white(data.shortCode)}`);
    if (data.customSlug) {
      console.log(`  ${chalk.dim('Custom Slug:')}  ${chalk.white(data.customSlug)}`);
    }
    console.log(`  ${chalk.dim('Title:')}        ${chalk.white(data.title ?? '(none)')}`);
    if (data.description) {
      console.log(`  ${chalk.dim('Description:')}  ${chalk.white(data.description)}`);
    }
    console.log(`  ${chalk.dim('Status:')}       ${chalk.white(data.status)}`);
    console.log(`  ${chalk.dim('Clicks:')}       ${chalk.green(String(data.clicks))}`);
    console.log(`  ${chalk.dim('Created:')}      ${chalk.white(new Date(data.createdAt).toLocaleString())}`);
    if (data.expiresAt) {
      console.log(`  ${chalk.dim('Expires:')}      ${chalk.white(new Date(data.expiresAt).toLocaleString())}`);
    }
    if (data.maxClicks) {
      console.log(`  ${chalk.dim('Max Clicks:')}   ${chalk.white(String(data.maxClicks))}`);
    }
    console.log('');

    logger.debug({ identifier }, 'URL info fetched');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Register sub-commands
// ---------------------------------------------------------------------------

export function registerUrlCommands(program: Command): void {
  // Create
  program
    .command('create [url]')
    .alias('shorten')
    .description('Create a new short URL')
    .option('-s, --slug <slug>', 'Custom slug for the short URL')
    .option('-t, --title <title>', 'Title or label for the URL')
    .option('--expires <date>', 'Expiration date (ISO 8601)')
    .option('--password <password>', 'Password-protect the URL')
    .option('--json', 'Output as JSON')
    .addHelpText(
      'after',
      `
Examples:
  $ urlshort create https://example.com
  $ urlshort create https://example.com -s my-link -t "My Link"
  $ urlshort create https://example.com --expires 2025-12-31
`,
    )
    .action(createAction);

  // List
  program
    .command('list')
    .alias('ls')
    .description('List your shortened URLs')
    .option('-p, --page <number>', 'Page number', '1')
    .option('-l, --limit <number>', 'Results per page', '20')
    .option('--status <status>', 'Filter by status (active, disabled, expired)')
    .option('--sort <field>', 'Sort by field (created, clicks, title)')
    .option('--json', 'Output as JSON')
    .action(listAction);

  // Delete
  program
    .command('delete [id]')
    .alias('rm')
    .description('Delete a shortened URL')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('--json', 'Output as JSON')
    .action(deleteAction);

  // Update
  program
    .command('update [id]')
    .alias('edit')
    .description('Update a shortened URL')
    .option('-t, --title <title>', 'New title')
    .option('-s, --slug <slug>', 'New custom slug')
    .option('--status <status>', 'New status (active, disabled)')
    .option('--expires <date>', 'New expiration date (ISO 8601)')
    .option('--json', 'Output as JSON')
    .action(updateAction);

  // Info
  program
    .command('info [id]')
    .description('Show detailed information about a URL')
    .option('--json', 'Output as JSON')
    .action(infoAction);
}
