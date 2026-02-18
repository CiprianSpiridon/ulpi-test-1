const urlService = require('../services/urlService');
const { initializeDatabase, getDatabase } = require('../database/db');

describe('URL Service', () => {
  beforeAll(async () => {
    // Initialize test database
    initializeDatabase();

    // Wait a bit for database to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('createShortUrl', () => {
    test('should create a short URL', async () => {
      const testUrl = 'https://www.example.com/service-test';

      const result = await urlService.createShortUrl(testUrl);

      expect(result).toHaveProperty('original_url', testUrl);
      expect(result).toHaveProperty('short_code');
      expect(result).toHaveProperty('short_url');
      expect(result).toHaveProperty('exists', false);
      expect(typeof result.short_code).toBe('string');
      expect(result.short_code.length).toBeGreaterThanOrEqual(4);
    });

    test('should return existing URL if already exists', async () => {
      const testUrl = 'https://www.example.com/service-test';

      const result = await urlService.createShortUrl(testUrl);

      expect(result).toHaveProperty('exists', true);
    });

    test('should create URL with custom code', async () => {
      const testUrl = 'https://www.example.com/custom-service-test';
      const customCode = 'service123';

      const result = await urlService.createShortUrl(testUrl, customCode);

      expect(result).toHaveProperty('short_code', customCode);
      expect(result).toHaveProperty('exists', false);
    });

    test('should reject unsafe URLs', async () => {
      const unsafeUrl = 'http://localhost:3000/test';

      await expect(urlService.createShortUrl(unsafeUrl))
        .rejects.toThrow();
    });

    test('should reject duplicate custom codes', async () => {
      const testUrl = 'https://www.example.com/another-service-test';
      const customCode = 'service123';

      await expect(urlService.createShortUrl(testUrl, customCode))
        .rejects.toThrow();
    });
  });

  describe('findByShortCode', () => {
    test('should find URL by short code', async () => {
      // First create a URL
      const testUrl = 'https://www.example.com/find-test';
      const created = await urlService.createShortUrl(testUrl);

      const found = await urlService.findByShortCode(created.short_code);

      expect(found).toBeTruthy();
      expect(found.original_url).toBe(testUrl);
      expect(found.short_code).toBe(created.short_code);
    });

    test('should return null for non-existent short code', async () => {
      const found = await urlService.findByShortCode('notfound3');

      expect(found).toBeNull();
    });
  });

  describe('getUrlStats', () => {
    test('should return URL statistics', async () => {
      // First create a URL
      const testUrl = 'https://www.example.com/stats-test';
      const created = await urlService.createShortUrl(testUrl);

      const stats = await urlService.getUrlStats(created.short_code);

      expect(stats).toBeTruthy();
      expect(stats).toHaveProperty('original_url', testUrl);
      expect(stats).toHaveProperty('short_code', created.short_code);
      expect(stats).toHaveProperty('click_count', 0);
      expect(stats).toHaveProperty('created_at');
    });

    test('should return null for non-existent short code', async () => {
      const stats = await urlService.getUrlStats('notfound4');

      expect(stats).toBeNull();
    });
  });

  describe('incrementClickCount', () => {
    test('should increment click count', async () => {
      // First create a URL
      const testUrl = 'https://www.example.com/click-test';
      const created = await urlService.createShortUrl(testUrl);

      // Increment click count
      await urlService.incrementClickCount(created.short_code);

      // Check stats
      const stats = await urlService.getUrlStats(created.short_code);
      expect(stats.click_count).toBe(1);

      // Increment again
      await urlService.incrementClickCount(created.short_code);

      // Check stats again
      const updatedStats = await urlService.getUrlStats(created.short_code);
      expect(updatedStats.click_count).toBe(2);
    });
  });

  describe('getAllUrls', () => {
    test('should return paginated URLs', async () => {
      const urls = await urlService.getAllUrls(5, 0);

      expect(Array.isArray(urls)).toBe(true);
      expect(urls.length).toBeLessThanOrEqual(5);

      if (urls.length > 0) {
        expect(urls[0]).toHaveProperty('original_url');
        expect(urls[0]).toHaveProperty('short_code');
        expect(urls[0]).toHaveProperty('short_url');
      }
    });

    test('should return total count', async () => {
      const count = await urlService.getTotalCount();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});