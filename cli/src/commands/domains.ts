/**
 * Custom domains management: list, add, remove, verify.
 *
 * Allows users to manage custom domains for branded short links
 * through the URL Shortener API.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

import { apiGet, apiPost, apiDelete } from '../utils/api-client.js';
import { isAuthenticated } from '../utils/config.js';
import { AuthenticationError } from '../utils/errors.js';
import { handleError } from '../utils/error-handler.js';
import { validateDomain } from '../utils/validators.js';
import {
  formatDomainsTable,
  info,
  bold,
  successBox,
  type DomainRecord,
} from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DomainsListResponse {
  domains: DomainRecord[];
}

interface DomainAddResponse {
  id: string;
  domain: string;
  verificationToken: string;
  isVerified: boolean;
}

interface DomainVerifyResponse {
  id: string;
  domain: string;
  isVerified: boolean;
  verifiedAt: string;
}

// ---------------------------------------------------------------------------
// List domains
// ---------------------------------------------------------------------------

async function listAction(options: { json?: boolean }): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    const spinner = ora('Fetching domains...').start();

    const { data } = await apiGet<DomainsListResponse>('/api/domains');

    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(data.domains, null, 2));
      return;
    }

    console.log('');
    console.log(bold('  Custom Domains'));
    console.log('');
    console.log(formatDomainsTable(data.domains));
    console.log('');

    logger.debug({ count: data.domains.length }, 'Domains listed');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Add domain
// ---------------------------------------------------------------------------

async function addAction(
  domain: string | undefined,
  options: { json?: boolean },
): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    let domainName = domain;
    if (!domainName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'domain',
          message: 'Enter the domain name:',
          validate: validateDomain,
          filter: (input: string) => input.trim().toLowerCase(),
        },
      ]);
      domainName = answers['domain'] as string;
    }

    const spinner = ora('Adding domain...').start();

    const { data } = await apiPost<DomainAddResponse>('/api/domains', {
      domain: domainName,
    });

    spinner.succeed(`Domain "${domainName}" added`);

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log(
      successBox(
        'Domain Added',
        [
          `${bold('Domain:')}  ${chalk.white(data.domain)}`,
          '',
          chalk.yellow('To verify ownership, create a DNS TXT record:'),
          '',
          `  ${bold('Name:')}   _urlshort-verify.${data.domain}`,
          `  ${bold('Value:')}  ${chalk.cyan(data.verificationToken)}`,
          '',
          chalk.dim('After adding the DNS record, run:'),
          chalk.dim(`  urlshort domains verify ${data.domain}`),
        ].join('\n'),
      ),
    );

    logger.debug({ domainId: data.id, domain: data.domain }, 'Domain added');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Remove domain
// ---------------------------------------------------------------------------

async function removeAction(
  domain: string | undefined,
  options: { force?: boolean },
): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    let domainName = domain;
    if (!domainName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'domain',
          message: 'Enter the domain name to remove:',
          validate: validateDomain,
        },
      ]);
      domainName = answers['domain'] as string;
    }

    if (!options.force) {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Remove domain "${chalk.cyan(domainName)}"? URLs using it will revert to the default domain.`,
          default: false,
        },
      ]) as { confirmed: boolean };

      if (!confirmed) {
        console.log(info('Removal cancelled.'));
        return;
      }
    }

    const spinner = ora('Removing domain...').start();

    await apiDelete(`/api/domains/${domainName}`);

    spinner.succeed(`Domain "${domainName}" removed`);

    logger.debug({ domain: domainName }, 'Domain removed');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Verify domain
// ---------------------------------------------------------------------------

async function verifyAction(
  domain: string | undefined,
  options: { json?: boolean },
): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError();
    }

    let domainName = domain;
    if (!domainName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'domain',
          message: 'Enter the domain name to verify:',
          validate: validateDomain,
        },
      ]);
      domainName = answers['domain'] as string;
    }

    const spinner = ora('Verifying domain...').start();

    const { data } = await apiPost<DomainVerifyResponse>(
      `/api/domains/${domainName}/verify`,
    );

    if (data.isVerified) {
      spinner.succeed(`Domain "${domainName}" verified successfully`);
    } else {
      spinner.fail(`Domain "${domainName}" could not be verified`);
      console.log('');
      console.log(chalk.yellow('  DNS record not found. Please ensure you have added:'));
      console.log(chalk.dim(`    TXT record: _urlshort-verify.${domainName}`));
      console.log(chalk.dim('  DNS changes can take up to 48 hours to propagate.'));
      console.log('');
    }

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    }

    logger.debug({ domain: domainName, verified: data.isVerified }, 'Domain verification attempted');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Register commands
// ---------------------------------------------------------------------------

export function registerDomainsCommands(program: Command): void {
  const domainsCmd = program
    .command('domains')
    .description('Manage custom domains for short links');

  domainsCmd
    .command('list')
    .alias('ls')
    .description('List custom domains')
    .option('--json', 'Output as JSON')
    .action(listAction);

  domainsCmd
    .command('add [domain]')
    .description('Add a custom domain')
    .option('--json', 'Output as JSON')
    .action(addAction);

  domainsCmd
    .command('remove [domain]')
    .alias('rm')
    .description('Remove a custom domain')
    .option('-f, --force', 'Skip confirmation prompt')
    .action(removeAction);

  domainsCmd
    .command('verify [domain]')
    .description('Verify domain ownership via DNS')
    .option('--json', 'Output as JSON')
    .action(verifyAction);
}
