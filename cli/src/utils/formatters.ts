/**
 * Output formatting utilities for the URL Shortener CLI.
 *
 * Provides consistent, colorized terminal output using chalk,
 * table formatting with cli-table3, and boxen for highlighted
 * messages.
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UrlRecord {
  id: string;
  shortCode: string;
  originalUrl: string;
  title?: string;
  clicks: number;
  status: string;
  createdAt: string;
  expiresAt?: string;
  customSlug?: string;
}

export interface AnalyticsData {
  totalClicks: number;
  uniqueVisitors: number;
  topCountries: Array<{ country: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
  topReferers: Array<{ referer: string; count: number }>;
  clicksByDay: Array<{ date: string; count: number }>;
}

export interface DomainRecord {
  id: string;
  domain: string;
  isVerified: boolean;
  sslProvisioned: boolean;
  createdAt: string;
  verifiedAt?: string;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export function success(message: string): string {
  return chalk.green(`  ${message}`);
}

export function error(message: string): string {
  return chalk.red(`  ${message}`);
}

export function warning(message: string): string {
  return chalk.yellow(`  ${message}`);
}

export function info(message: string): string {
  return chalk.blue(`  ${message}`);
}

export function dim(message: string): string {
  return chalk.dim(message);
}

export function bold(message: string): string {
  return chalk.bold(message);
}

export function link(url: string): string {
  return chalk.cyan.underline(url);
}

// ---------------------------------------------------------------------------
// Short URL display
// ---------------------------------------------------------------------------

export function formatShortUrl(baseUrl: string, shortCode: string): string {
  return chalk.cyan.underline(`${baseUrl}/${shortCode}`);
}

// ---------------------------------------------------------------------------
// URL Table
// ---------------------------------------------------------------------------

export function formatUrlTable(urls: UrlRecord[], baseUrl: string): string {
  if (urls.length === 0) {
    return info('No URLs found. Create one with: urlshort create <url>');
  }

  const table = new Table({
    head: [
      chalk.bold.white('Short URL'),
      chalk.bold.white('Original URL'),
      chalk.bold.white('Clicks'),
      chalk.bold.white('Status'),
      chalk.bold.white('Created'),
    ],
    colWidths: [28, 50, 10, 12, 14],
    wordWrap: true,
    style: {
      head: [],
      border: ['grey'],
    },
  });

  for (const url of urls) {
    const slug = url.customSlug ?? url.shortCode;
    const shortUrl = `${baseUrl}/${slug}`;
    const truncatedOriginal =
      url.originalUrl.length > 47
        ? `${url.originalUrl.substring(0, 44)}...`
        : url.originalUrl;

    const statusColor =
      url.status === 'active'
        ? chalk.green
        : url.status === 'expired'
          ? chalk.yellow
          : chalk.red;

    table.push([
      chalk.cyan(shortUrl),
      truncatedOriginal,
      chalk.white(String(url.clicks)),
      statusColor(url.status),
      new Date(url.createdAt).toLocaleDateString(),
    ]);
  }

  return table.toString();
}

// ---------------------------------------------------------------------------
// Analytics display
// ---------------------------------------------------------------------------

export function formatAnalytics(data: AnalyticsData, shortCode: string, baseUrl: string): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(
    boxen(
      chalk.bold.white(`Analytics for ${chalk.cyan(`${baseUrl}/${shortCode}`)}`),
      {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: 'round',
        borderColor: 'cyan',
      },
    ),
  );
  lines.push('');

  // Summary
  lines.push(chalk.bold('  Summary'));
  lines.push(`    Total Clicks:     ${chalk.green(String(data.totalClicks))}`);
  lines.push(`    Unique Visitors:  ${chalk.green(String(data.uniqueVisitors))}`);
  lines.push('');

  // Top Countries
  if (data.topCountries.length > 0) {
    lines.push(chalk.bold('  Top Countries'));
    for (const entry of data.topCountries.slice(0, 5)) {
      const bar = chalk.cyan('\u2588'.repeat(Math.max(1, Math.round((entry.count / data.totalClicks) * 30))));
      lines.push(`    ${entry.country.padEnd(6)} ${bar} ${entry.count}`);
    }
    lines.push('');
  }

  // Top Browsers
  if (data.topBrowsers.length > 0) {
    lines.push(chalk.bold('  Top Browsers'));
    for (const entry of data.topBrowsers.slice(0, 5)) {
      const bar = chalk.blue('\u2588'.repeat(Math.max(1, Math.round((entry.count / data.totalClicks) * 30))));
      lines.push(`    ${entry.browser.padEnd(15)} ${bar} ${entry.count}`);
    }
    lines.push('');
  }

  // Top Devices
  if (data.topDevices.length > 0) {
    lines.push(chalk.bold('  Top Devices'));
    for (const entry of data.topDevices.slice(0, 5)) {
      const bar = chalk.magenta('\u2588'.repeat(Math.max(1, Math.round((entry.count / data.totalClicks) * 30))));
      lines.push(`    ${entry.device.padEnd(12)} ${bar} ${entry.count}`);
    }
    lines.push('');
  }

  // Clicks by Day (last 7 entries)
  if (data.clicksByDay.length > 0) {
    lines.push(chalk.bold('  Clicks (Last 7 Days)'));
    const recentDays = data.clicksByDay.slice(-7);
    const maxCount = Math.max(...recentDays.map((d) => d.count), 1);
    for (const day of recentDays) {
      const bar = chalk.green('\u2588'.repeat(Math.max(1, Math.round((day.count / maxCount) * 30))));
      lines.push(`    ${day.date}  ${bar} ${day.count}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Domains table
// ---------------------------------------------------------------------------

export function formatDomainsTable(domains: DomainRecord[]): string {
  if (domains.length === 0) {
    return info('No custom domains configured. Add one with: urlshort domains add <domain>');
  }

  const table = new Table({
    head: [
      chalk.bold.white('Domain'),
      chalk.bold.white('Verified'),
      chalk.bold.white('SSL'),
      chalk.bold.white('Created'),
    ],
    style: {
      head: [],
      border: ['grey'],
    },
  });

  for (const domain of domains) {
    table.push([
      chalk.white(domain.domain),
      domain.isVerified ? chalk.green('Yes') : chalk.yellow('No'),
      domain.sslProvisioned ? chalk.green('Yes') : chalk.yellow('No'),
      new Date(domain.createdAt).toLocaleDateString(),
    ]);
  }

  return table.toString();
}

// ---------------------------------------------------------------------------
// Config display
// ---------------------------------------------------------------------------

export function formatConfigDisplay(configData: Record<string, unknown>): string {
  const table = new Table({
    head: [chalk.bold.white('Key'), chalk.bold.white('Value')],
    style: {
      head: [],
      border: ['grey'],
    },
  });

  for (const [key, value] of Object.entries(configData)) {
    const displayValue = isSensitive(key)
      ? maskValue(String(value ?? ''))
      : String(value ?? '');

    table.push([chalk.cyan(key), displayValue]);
  }

  return table.toString();
}

function isSensitive(key: string): boolean {
  const sensitiveKeys = ['authToken', 'apiKey', 'refreshToken'];
  return sensitiveKeys.includes(key);
}

function maskValue(value: string): string {
  if (!value || value.length === 0) {
    return chalk.dim('(not set)');
  }
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  return `${value.substring(0, 4)}${'*'.repeat(value.length - 8)}${value.substring(value.length - 4)}`;
}

// ---------------------------------------------------------------------------
// Highlighted box messages
// ---------------------------------------------------------------------------

export function successBox(title: string, body: string): string {
  return boxen(`${chalk.green.bold(title)}\n\n${body}`, {
    padding: 1,
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: 'green',
  });
}

export function errorBox(title: string, body: string): string {
  return boxen(`${chalk.red.bold(title)}\n\n${body}`, {
    padding: 1,
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: 'red',
  });
}

export function infoBox(title: string, body: string): string {
  return boxen(`${chalk.blue.bold(title)}\n\n${body}`, {
    padding: 1,
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: 'blue',
  });
}
