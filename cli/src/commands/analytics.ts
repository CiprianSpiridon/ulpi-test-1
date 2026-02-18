/**
 * Analytics command: view click statistics for shortened URLs.
 *
 * Displays visitor counts, geographic distribution, browser breakdown,
 * device types, and daily click trends as colorized bar charts.
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';

import { apiGet } from '../utils/api-client.js';
import { getConfigValue, isAuthenticated } from '../utils/config.js';
import { AuthenticationError } from '../utils/errors.js';
import { handleError } from '../utils/error-handler.js';
import { formatAnalytics, type AnalyticsData } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsResponse {
  totalClicks: number;
  uniqueVisitors: number;
  topCountries: Array<{ country: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
  topReferers: Array<{ referer: string; count: number }>;
  clicksByDay: Array<{ date: string; count: number }>;
}

// ---------------------------------------------------------------------------
// Analytics action
// ---------------------------------------------------------------------------

async function analyticsAction(
  idOrCode: string | undefined,
  options: {
    period?: string;
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
          message: 'Enter the URL ID or short code:',
          validate: (input: string) =>
            input.trim().length > 0 ? true : 'ID or short code is required.',
        },
      ]);
      identifier = answers['identifier'] as string;
    }

    const spinner = ora('Fetching analytics...').start();

    const params = new URLSearchParams();
    if (options.period) {
      params.set('period', options.period);
    }

    const queryString = params.toString();
    const path = `/api/urls/${identifier}/analytics${queryString ? `?${queryString}` : ''}`;

    const { data } = await apiGet<AnalyticsResponse>(path);

    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const analyticsData: AnalyticsData = {
      totalClicks: data.totalClicks,
      uniqueVisitors: data.uniqueVisitors,
      topCountries: data.topCountries,
      topBrowsers: data.topBrowsers,
      topDevices: data.topDevices,
      topReferers: data.topReferers,
      clicksByDay: data.clicksByDay,
    };

    const baseUrl = getConfigValue('apiUrl');
    console.log(formatAnalytics(analyticsData, identifier!, baseUrl));

    logger.debug({ identifier }, 'Analytics fetched');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Register command
// ---------------------------------------------------------------------------

export function registerAnalyticsCommand(program: Command): void {
  program
    .command('analytics [id]')
    .alias('stats')
    .description('View click analytics for a shortened URL')
    .option('--period <period>', 'Time period: 7d, 30d, 90d, 1y', '30d')
    .option('--json', 'Output as JSON')
    .addHelpText(
      'after',
      `
Examples:
  $ urlshort analytics abc1234
  $ urlshort analytics abc1234 --period 7d
  $ urlshort stats abc1234 --json
`,
    )
    .action(analyticsAction);
}
