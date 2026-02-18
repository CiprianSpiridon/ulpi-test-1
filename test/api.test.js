const request = require('supertest');
const app = require('../server');

describe('URL Shortener API', () => {
  let testShortCode = '';

  // Test health endpoint
  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  // Test URL shortening
  describe('POST /api/shorten', () => {
    test('should create a short URL', async () => {
      const testUrl = 'https://www.example.com/test-page';

      const response = await request(app)
        .post('/api/shorten')
        .send({ url: testUrl })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('original_url', testUrl);
      expect(response.body.data).toHaveProperty('short_code');
      expect(response.body.data).toHaveProperty('short_url');
      expect(response.body.data).toHaveProperty('full_short_url');

      // Store for later tests
      testShortCode = response.body.data.short_code;
    });

    test('should return existing URL if already shortened', async () => {
      const testUrl = 'https://www.example.com/test-page';

      const response = await request(app)
        .post('/api/shorten')
        .send({ url: testUrl })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('exists', true);
      expect(response.body.data.short_code).toBe(testShortCode);
    });

    test('should create URL with custom code', async () => {
      const testUrl = 'https://www.example.com/custom-test';
      const customCode = 'custom123';

      const response = await request(app)
        .post('/api/shorten')
        .send({ url: testUrl, customCode })
        .expect(201);

      expect(response.body.data).toHaveProperty('short_code', customCode);
    });

    test('should reject invalid URLs', async () => {
      const response = await request(app)
        .post('/api/shorten')
        .send({ url: 'not-a-valid-url' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject duplicate custom codes', async () => {
      const response = await request(app)
        .post('/api/shorten')
        .send({
          url: 'https://www.example.com/another-test',
          customCode: 'custom123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject invalid custom codes', async () => {
      const response = await request(app)
        .post('/api/shorten')
        .send({
          url: 'https://www.example.com/test',
          customCode: 'ab' // too short
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  // Test URL redirection
  describe('GET /:shortCode', () => {
    test('should redirect to original URL', async () => {
      const response = await request(app)
        .get(`/${testShortCode}`)
        .expect(302);

      expect(response.headers.location).toBe('https://www.example.com/test-page');
    });

    test('should return 404 for non-existent short code', async () => {
      const response = await request(app)
        .get('/notfound2')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  // Test URL statistics
  describe('GET /api/stats/:shortCode', () => {
    test('should return URL statistics', async () => {
      const response = await request(app)
        .get(`/api/stats/${testShortCode}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('original_url');
      expect(response.body.data).toHaveProperty('short_code', testShortCode);
      expect(response.body.data).toHaveProperty('click_count');
      expect(response.body.data).toHaveProperty('created_at');
    });

    test('should return 404 for non-existent short code', async () => {
      const response = await request(app)
        .get('/api/stats/notfound1')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  // Test URLs list endpoint
  describe('GET /api/urls', () => {
    test('should return paginated URLs list', async () => {
      const response = await request(app)
        .get('/api/urls')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('current_page');
      expect(response.body.pagination).toHaveProperty('total_count');
    });

    test('should accept pagination parameters', async () => {
      const response = await request(app)
        .get('/api/urls?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination).toHaveProperty('current_page', 1);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });
});