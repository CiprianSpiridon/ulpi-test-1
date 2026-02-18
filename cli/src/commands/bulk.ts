/**
 * Bulk operations: import URLs from CSV, export URLs to CSV.
 *
 * Import reads a CSV file with columns (url, slug?, title?) and
 * creates short URLs in batches. Export writes all user URLs to
 * a CSV file with full metadata.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, constants } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';


import { apiPost, apiGet } from '../utils/api-client.js';
import { getConfigValue, isAuthenticated } from '../utils/config.js';
import { AuthenticationError, FileSystemError, ValidationError } from '../utils/errors.js';
import { handleError } from '../utils/error-handler.js';
import { validateCsvPath } from '../utils/validators.js';
import { success, info, bold, warning } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CsvImportRow {
  url: string;
  slug?: string;
  title?: string;
}

interface ImportResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ row: number; url: string; error: string }>;
}

interface ListUrlsResponse {
  urls: Array<{
    id: string;
    shortCode: string;
    originalUrl: string;
    customSlug?: string;
    title?: string;
    clicks: number;
    status: string;
    createdAt: string;
    expiresAt?: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Import action
// ---------------------------------------------------------------------------

async function importAction(
  csvFile: string | undefined,
  options: { dryRun?: boolean; batchSize?: string; json?: boolean },
): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    let filePath = csvFile;
    if (!filePath) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'filePath',
          message: 'Path to CSV file:',
          validate: validateCsvPath,
        },
      ]);
      filePath = answers['filePath'] as string;
    }

    const absPath = resolve(filePath);

    // Check file exists
    try {
      await access(absPath, constants.R_OK);
    } catch {
      throw new FileSystemError(`File not found or not readable: ${absPath}`, absPath);
    }

    const spinner = ora('Reading CSV file...').start();

    // Parse CSV
    const rows: CsvImportRow[] = [];
    const parseErrors: string[] = [];

    await new Promise<void>((resolvePromise, rejectPromise) => {
      const parser = createReadStream(absPath).pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }),
      );

      parser.on('data', (row: Record<string, string>) => {
        const url = row['url'] ?? row['URL'] ?? row['original_url'] ?? '';
        if (url) {
          rows.push({
            url,
            slug: row['slug'] ?? row['custom_slug'] ?? undefined,
            title: row['title'] ?? undefined,
          });
        }
      });

      parser.on('error', (err: Error) => {
        parseErrors.push(err.message);
        rejectPromise(err);
      });

      parser.on('end', () => {
        resolvePromise();
      });
    });

    if (rows.length === 0) {
      spinner.fail('No valid URLs found in CSV');
      throw new ValidationError(
        'CSV file contains no valid URL rows.',
        ['Ensure the CSV has a "url" column header.'],
      );
    }

    spinner.text = `Found ${rows.length} URLs to import`;
    spinner.succeed();

    if (options.dryRun) {
      console.log('');
      console.log(bold('  Dry Run - URLs to import:'));
      for (const [index, row] of rows.slice(0, 10).entries()) {
        console.log(`  ${chalk.dim(`${index + 1}.`)} ${chalk.cyan(row.url)}${row.slug ? chalk.dim(` (slug: ${row.slug})`) : ''}`);
      }
      if (rows.length > 10) {
        console.log(chalk.dim(`  ... and ${rows.length - 10} more`));
      }
      console.log('');
      console.log(info('No changes made. Remove --dry-run to import.'));
      return;
    }

    // Confirm
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Import ${rows.length} URLs?`,
        default: true,
      },
    ]) as { confirmed: boolean };

    if (!confirmed) {
      console.log(info('Import cancelled.'));
      return;
    }

    // Import in batches
    const batchSize = parseInt(options.batchSize ?? '10', 10);
    const result: ImportResult = {
      total: rows.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    const importSpinner = ora(`Importing URLs (0/${rows.length})...`).start();

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const batchPromises = batch.map(async (row, batchIndex) => {
        const rowIndex = i + batchIndex + 1;
        try {
          const body: Record<string, unknown> = { originalUrl: row.url };
          if (row.slug) body['customSlug'] = row.slug;
          if (row.title) body['title'] = row.title;

          await apiPost('/api/urls', body);
          result.succeeded++;
        } catch (err: unknown) {
          result.failed++;
          const message = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push({ row: rowIndex, url: row.url, error: message });
        }
      });

      await Promise.all(batchPromises);
      importSpinner.text = `Importing URLs (${Math.min(i + batchSize, rows.length)}/${rows.length})...`;
    }

    if (result.failed === 0) {
      importSpinner.succeed(`All ${result.succeeded} URLs imported successfully`);
    } else {
      importSpinner.warn(
        `Imported ${result.succeeded}/${result.total} URLs (${result.failed} failed)`,
      );
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log('');
    console.log(bold('  Import Results'));
    console.log(success(`Succeeded: ${result.succeeded}`));
    if (result.failed > 0) {
      console.log(warning(`Failed:    ${result.failed}`));
      console.log('');
      console.log(bold('  Errors:'));
      for (const err of result.errors.slice(0, 20)) {
        console.log(`  ${chalk.dim(`Row ${err.row}:`)} ${chalk.red(err.error)}`);
        console.log(`           ${chalk.dim(err.url)}`);
      }
      if (result.errors.length > 20) {
        console.log(chalk.dim(`  ... and ${result.errors.length - 20} more errors`));
      }
    }
    console.log('');

    logger.debug({ total: result.total, succeeded: result.succeeded, failed: result.failed }, 'Import completed');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Export action
// ---------------------------------------------------------------------------

async function exportAction(options: {
  output?: string;
  status?: string;
  json?: boolean;
}): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    const spinner = ora('Fetching URLs for export...').start();

    // Fetch all URLs (paginated)
    const allUrls: ListUrlsResponse['urls'] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (options.status) params.set('status', options.status);

      const { data } = await apiGet<ListUrlsResponse>(`/api/urls?${params.toString()}`);
      allUrls.push(...data.urls);
      spinner.text = `Fetching URLs (${allUrls.length}/${data.total})...`;

      hasMore = allUrls.length < data.total;
      page++;
    }

    if (allUrls.length === 0) {
      spinner.info('No URLs to export.');
      return;
    }

    spinner.text = `Writing ${allUrls.length} URLs to CSV...`;

    const baseUrl = getConfigValue('apiUrl');
    const outputPath = resolve(options.output ?? 'urls-export.csv');

    // Build CSV
    const csvRows = allUrls.map((url) => ({
      id: url.id,
      short_url: `${baseUrl}/${url.customSlug ?? url.shortCode}`,
      short_code: url.shortCode,
      custom_slug: url.customSlug ?? '',
      original_url: url.originalUrl,
      title: url.title ?? '',
      clicks: String(url.clicks),
      status: url.status,
      created_at: url.createdAt,
      expires_at: url.expiresAt ?? '',
    }));

    await new Promise<void>((resolvePromise, rejectPromise) => {
      const stringifier = stringify({ header: true });
      const output = createWriteStream(outputPath);

      stringifier.pipe(output);

      output.on('finish', () => resolvePromise());
      output.on('error', (err: Error) => rejectPromise(err));
      stringifier.on('error', (err: Error) => rejectPromise(err));

      for (const row of csvRows) {
        stringifier.write(row);
      }

      stringifier.end();
    });

    spinner.succeed(`Exported ${allUrls.length} URLs to ${chalk.cyan(outputPath)}`);

    logger.debug({ count: allUrls.length, outputPath }, 'URLs exported');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Register commands
// ---------------------------------------------------------------------------

export function registerBulkCommands(program: Command): void {
  // Import
  program
    .command('import [csvFile]')
    .description('Bulk import URLs from a CSV file')
    .option('--dry-run', 'Preview import without making changes')
    .option('--batch-size <size>', 'Number of concurrent requests', '10')
    .option('--json', 'Output results as JSON')
    .addHelpText(
      'after',
      `
CSV Format:
  url,slug,title
  https://example.com,my-link,My Example
  https://another.com,,Another Link

Examples:
  $ urlshort import urls.csv
  $ urlshort import urls.csv --dry-run
  $ urlshort import urls.csv --batch-size 5
`,
    )
    .action(importAction);

  // Export
  program
    .command('export')
    .description('Export all URLs to a CSV file')
    .option('-o, --output <file>', 'Output file path', 'urls-export.csv')
    .option('--status <status>', 'Filter by status (active, disabled, expired)')
    .option('--json', 'Output as JSON instead of CSV')
    .action(exportAction);
}
