/**
 * Tests for custom error classes.
 */

import {
  CLIError,
  AuthenticationError,
  ConfigurationError,
  ValidationError,
  NetworkError,
  FileSystemError,
  ApiError,
} from '../utils/errors.js';

describe('CLIError', () => {
  it('should create with default exit code 1', () => {
    const err = new CLIError('test error');
    expect(err.message).toBe('test error');
    expect(err.exitCode).toBe(1);
    expect(err.suggestions).toEqual([]);
    expect(err.name).toBe('CLIError');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CLIError);
  });

  it('should accept a custom exit code', () => {
    const err = new CLIError('test', 42);
    expect(err.exitCode).toBe(42);
  });

  it('should accept suggestions', () => {
    const err = new CLIError('test', 1, ['try this', 'or this']);
    expect(err.suggestions).toEqual(['try this', 'or this']);
  });

  it('should capture a stack trace', () => {
    const err = new CLIError('test');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('CLIError');
  });
});

describe('AuthenticationError', () => {
  it('should use exit code 77', () => {
    const err = new AuthenticationError();
    expect(err.exitCode).toBe(77);
    expect(err.message).toBe('Authentication required');
    expect(err.name).toBe('AuthenticationError');
    expect(err.suggestions.length).toBeGreaterThan(0);
  });

  it('should accept a custom message', () => {
    const err = new AuthenticationError('Custom auth error');
    expect(err.message).toBe('Custom auth error');
  });
});

describe('ConfigurationError', () => {
  it('should use exit code 78', () => {
    const err = new ConfigurationError('bad config');
    expect(err.exitCode).toBe(78);
    expect(err.name).toBe('ConfigurationError');
  });

  it('should include field name in suggestions when provided', () => {
    const err = new ConfigurationError('bad config', 'apiUrl');
    expect(err.suggestions.some((s) => s.includes('apiUrl'))).toBe(true);
  });
});

describe('ValidationError', () => {
  it('should use exit code 2', () => {
    const err = new ValidationError('invalid input');
    expect(err.exitCode).toBe(2);
    expect(err.errors).toEqual([]);
  });

  it('should store validation errors', () => {
    const err = new ValidationError('invalid input', ['field A is wrong', 'field B is wrong']);
    expect(err.errors).toEqual(['field A is wrong', 'field B is wrong']);
  });
});

describe('NetworkError', () => {
  it('should use exit code 69', () => {
    const err = new NetworkError('timeout');
    expect(err.exitCode).toBe(69);
    expect(err.url).toBe('');
  });

  it('should store the URL', () => {
    const err = new NetworkError('timeout', 'http://example.com');
    expect(err.url).toBe('http://example.com');
  });
});

describe('FileSystemError', () => {
  it('should store the file path', () => {
    const err = new FileSystemError('not found', '/tmp/missing.txt');
    expect(err.filePath).toBe('/tmp/missing.txt');
    expect(err.exitCode).toBe(66);
    expect(err.suggestions.some((s) => s.includes('/tmp/missing.txt'))).toBe(true);
  });
});

describe('ApiError', () => {
  it('should store status code and response body', () => {
    const body = { error: 'not found' };
    const err = new ApiError('Not Found', 404, body);
    expect(err.statusCode).toBe(404);
    expect(err.responseBody).toEqual(body);
    expect(err.exitCode).toBe(1);
  });

  it('should add specific suggestion for 401', () => {
    const err = new ApiError('Unauthorized', 401);
    expect(err.suggestions.some((s) => s.includes('login'))).toBe(true);
  });

  it('should add specific suggestion for 429', () => {
    const err = new ApiError('Rate limited', 429);
    expect(err.suggestions.some((s) => s.includes('Rate limit'))).toBe(true);
  });

  it('should add specific suggestion for 500', () => {
    const err = new ApiError('Server error', 500);
    expect(err.suggestions.some((s) => s.includes('server'))).toBe(true);
  });

  it('should add specific suggestion for 403', () => {
    const err = new ApiError('Forbidden', 403);
    expect(err.suggestions.some((s) => s.includes('permission'))).toBe(true);
  });
});
