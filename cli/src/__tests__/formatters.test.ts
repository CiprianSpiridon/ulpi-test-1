/**
 * Tests for output formatting utilities.
 */

import chalk from 'chalk';

import {
  success,
  error,
  warning,
  info,
  dim,
  bold,
  link,
  formatShortUrl,
  formatUrlTable,
  formatAnalytics,
  formatDomainsTable,
  formatConfigDisplay,
  successBox,
  errorBox,
  infoBox,
  type UrlRecord,
  type AnalyticsData,
  type DomainRecord,
} from '../utils/formatters.js';

// Disable chalk colors for consistent test output
beforeAll(() => {
  chalk.level = 0;
});

describe('text helpers', () => {
  it('success should include the message', () => {
    expect(success('done')).toContain('done');
  });

  it('error should include the message', () => {
    expect(error('failed')).toContain('failed');
  });

  it('warning should include the message', () => {
    expect(warning('careful')).toContain('careful');
  });

  it('info should include the message', () => {
    expect(info('note')).toContain('note');
  });

  it('dim should include the message', () => {
    expect(dim('faded')).toContain('faded');
  });

  it('bold should include the message', () => {
    expect(bold('strong')).toContain('strong');
  });

  it('link should include the URL', () => {
    expect(link('https://example.com')).toContain('https://example.com');
  });
});

describe('formatShortUrl', () => {
  it('should combine base URL and short code', () => {
    const result = formatShortUrl('http://localhost:3000', 'abc123');
    expect(result).toContain('http://localhost:3000/abc123');
  });
});

describe('formatUrlTable', () => {
  it('should return info message for empty array', () => {
    const result = formatUrlTable([], 'http://localhost:3000');
    expect(result).toContain('No URLs found');
  });

  it('should format URLs in a table', () => {
    const urls: UrlRecord[] = [
      {
        id: '1',
        shortCode: 'abc123',
        originalUrl: 'https://example.com/page',
        clicks: 42,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    const result = formatUrlTable(urls, 'http://localhost:3000');
    // Short URL column may word-wrap, so check for partial content
    expect(result).toContain('localhost:3000');
    expect(result).toContain('example.com/page');
    expect(result).toContain('42');
    expect(result).toContain('active');
  });

  it('should truncate long URLs', () => {
    const urls: UrlRecord[] = [
      {
        id: '1',
        shortCode: 'abc123',
        originalUrl: 'https://example.com/' + 'a'.repeat(100),
        clicks: 0,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    const result = formatUrlTable(urls, 'http://localhost:3000');
    expect(result).toContain('...');
  });

  it('should use customSlug when available', () => {
    const urls: UrlRecord[] = [
      {
        id: '1',
        shortCode: 'abc123',
        customSlug: 'my-link',
        originalUrl: 'https://example.com',
        clicks: 0,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    const result = formatUrlTable(urls, 'http://localhost:3000');
    // Table may truncate -- verify the slug is partially present
    expect(result).toContain('my-');
  });
});

describe('formatAnalytics', () => {
  it('should include summary data', () => {
    const data: AnalyticsData = {
      totalClicks: 100,
      uniqueVisitors: 80,
      topCountries: [{ country: 'US', count: 60 }],
      topBrowsers: [{ browser: 'Chrome', count: 50 }],
      topDevices: [{ device: 'desktop', count: 70 }],
      topReferers: [{ referer: 'google.com', count: 40 }],
      clicksByDay: [{ date: '2024-01-01', count: 10 }],
    };

    const result = formatAnalytics(data, 'abc123', 'http://localhost:3000');
    expect(result).toContain('100');
    expect(result).toContain('80');
    expect(result).toContain('abc123');
    expect(result).toContain('US');
    expect(result).toContain('Chrome');
    expect(result).toContain('desktop');
  });

  it('should handle empty analytics', () => {
    const data: AnalyticsData = {
      totalClicks: 0,
      uniqueVisitors: 0,
      topCountries: [],
      topBrowsers: [],
      topDevices: [],
      topReferers: [],
      clicksByDay: [],
    };

    const result = formatAnalytics(data, 'abc123', 'http://localhost:3000');
    expect(result).toContain('0');
    expect(result).toContain('abc123');
  });
});

describe('formatDomainsTable', () => {
  it('should return info message for empty array', () => {
    const result = formatDomainsTable([]);
    expect(result).toContain('No custom domains');
  });

  it('should format domains in a table', () => {
    const domains: DomainRecord[] = [
      {
        id: '1',
        domain: 'links.example.com',
        isVerified: true,
        sslProvisioned: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        domain: 'short.test.com',
        isVerified: false,
        sslProvisioned: false,
        createdAt: '2024-02-01T00:00:00Z',
      },
    ];

    const result = formatDomainsTable(domains);
    expect(result).toContain('links.example.com');
    expect(result).toContain('short.test.com');
    expect(result).toContain('Yes');
    expect(result).toContain('No');
  });
});

describe('formatConfigDisplay', () => {
  it('should display config key-value pairs', () => {
    const data = {
      apiUrl: 'http://localhost:3000',
      outputFormat: 'text',
    };

    const result = formatConfigDisplay(data);
    expect(result).toContain('apiUrl');
    expect(result).toContain('http://localhost:3000');
    expect(result).toContain('outputFormat');
    expect(result).toContain('text');
  });

  it('should mask sensitive values', () => {
    const data = {
      authToken: 'my-very-secret-token-12345',
      apiKey: '',
    };

    const result = formatConfigDisplay(data);
    // The full token should NOT appear
    expect(result).not.toContain('my-very-secret-token-12345');
    // (not set) should appear for empty apiKey
    expect(result).toContain('not set');
  });
});

describe('box formatters', () => {
  it('successBox should contain title and body', () => {
    const result = successBox('Title', 'Body content');
    expect(result).toContain('Title');
    expect(result).toContain('Body content');
  });

  it('errorBox should contain title and body', () => {
    const result = errorBox('Error Title', 'Error body');
    expect(result).toContain('Error Title');
    expect(result).toContain('Error body');
  });

  it('infoBox should contain title and body', () => {
    const result = infoBox('Info Title', 'Info body');
    expect(result).toContain('Info Title');
    expect(result).toContain('Info body');
  });
});
