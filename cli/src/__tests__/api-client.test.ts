/**
 * Tests for the API client module.
 */

import { jest } from '@jest/globals';
import {
  clearAllConfig,
  setConfigValue,
  setConfigValues,
} from '../utils/config.js';
import { ApiError, AuthenticationError, NetworkError } from '../utils/errors.js';

// We need to mock global fetch
const mockFetch = jest.fn<typeof global.fetch>();
global.fetch = mockFetch;

import {
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
} from '../utils/api-client.js';

beforeEach(() => {
  clearAllConfig();
  setConfigValue('apiUrl', 'http://localhost:3000');
  mockFetch.mockReset();
});

afterAll(() => {
  clearAllConfig();
});

function mockJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

describe('apiRequest', () => {
  it('should make a GET request to the correct URL', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ ok: true }));

    const result = await apiRequest('/api/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toBe('http://localhost:3000/api/test');
    expect(result.data).toEqual({ ok: true });
    expect(result.status).toBe(200);
  });

  it('should include auth header when token is set', async () => {
    setConfigValue('authToken', 'jwt-token-123');
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiRequest('/api/test');

    const [, options] = mockFetch.mock.calls[0]!;
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer jwt-token-123');
  });

  it('should prefer apiKey over authToken', async () => {
    setConfigValues({ authToken: 'jwt-token', apiKey: 'api-key-123' });
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiRequest('/api/test');

    const [, options] = mockFetch.mock.calls[0]!;
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer api-key-123');
  });

  it('should skip auth header when noAuth is true', async () => {
    setConfigValue('authToken', 'jwt-token-123');
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiRequest('/api/test', { noAuth: true });

    const [, options] = mockFetch.mock.calls[0]!;
    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should send JSON body for POST requests', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiRequest('/api/test', {
      method: 'POST',
      body: { key: 'value' },
    });

    const [, options] = mockFetch.mock.calls[0]!;
    expect((options as RequestInit).method).toBe('POST');
    expect((options as RequestInit).body).toBe('{"key":"value"}');
  });

  it('should throw AuthenticationError for 401 response', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ error: 'unauthorized' }, 401));

    await expect(apiRequest('/api/test')).rejects.toThrow(AuthenticationError);
  });

  it('should throw ApiError for other error responses', async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ message: 'Not Found' }, 404),
    );

    await expect(apiRequest('/api/test')).rejects.toThrow(ApiError);
  });

  it('should throw NetworkError when fetch fails with ECONNREFUSED', async () => {
    const fetchError = new Error('Connection refused');
    (fetchError as NodeJS.ErrnoException).code = 'ECONNREFUSED';
    mockFetch.mockRejectedValueOnce(fetchError);

    await expect(apiRequest('/api/test')).rejects.toThrow(NetworkError);
  });
});

describe('convenience methods', () => {
  it('apiGet should use GET method', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiGet('/api/test');

    const [, options] = mockFetch.mock.calls[0]!;
    expect((options as RequestInit).method).toBe('GET');
  });

  it('apiPost should use POST method', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiPost('/api/test', { key: 'value' });

    const [, options] = mockFetch.mock.calls[0]!;
    expect((options as RequestInit).method).toBe('POST');
    expect((options as RequestInit).body).toBe('{"key":"value"}');
  });

  it('apiPut should use PUT method', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiPut('/api/test', { key: 'value' });

    const [, options] = mockFetch.mock.calls[0]!;
    expect((options as RequestInit).method).toBe('PUT');
  });

  it('apiPatch should use PATCH method', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiPatch('/api/test', { key: 'value' });

    const [, options] = mockFetch.mock.calls[0]!;
    expect((options as RequestInit).method).toBe('PATCH');
  });

  it('apiDelete should use DELETE method', async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({}));

    await apiDelete('/api/test');

    const [, options] = mockFetch.mock.calls[0]!;
    expect((options as RequestInit).method).toBe('DELETE');
  });
});
