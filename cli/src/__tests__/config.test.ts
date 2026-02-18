/**
 * Tests for configuration management.
 */

import {
  getConfig,
  getConfigValue,
  setConfigValue,
  setConfigValues,
  clearConfigValue,
  clearAllConfig,
  getConfigPath,
  isAuthenticated,
} from '../utils/config.js';

// Clean slate before each test
beforeEach(() => {
  clearAllConfig();
  // Clear env vars that might override config
  delete process.env['URLSHORT_API_URL'];
  delete process.env['URLSHORT_AUTH_TOKEN'];
  delete process.env['URLSHORT_API_KEY'];
  delete process.env['URLSHORT_OUTPUT_FORMAT'];
  delete process.env['URLSHORT_DEFAULT_DOMAIN'];
});

afterAll(() => {
  clearAllConfig();
});

describe('getConfig', () => {
  it('should return default configuration', () => {
    const config = getConfig();
    expect(config.apiUrl).toBe('http://localhost:3000');
    expect(config.authToken).toBe('');
    expect(config.apiKey).toBe('');
    expect(config.refreshToken).toBe('');
    expect(config.userEmail).toBe('');
    expect(config.userId).toBe('');
    expect(config.outputFormat).toBe('text');
    expect(config.colorEnabled).toBe(true);
    expect(config.defaultDomain).toBe('');
  });
});

describe('setConfigValue / getConfigValue', () => {
  it('should set and get a single value', () => {
    setConfigValue('apiUrl', 'http://myserver.com');
    expect(getConfigValue('apiUrl')).toBe('http://myserver.com');
  });

  it('should set boolean values', () => {
    setConfigValue('colorEnabled', false);
    expect(getConfigValue('colorEnabled')).toBe(false);
  });
});

describe('setConfigValues', () => {
  it('should set multiple values at once', () => {
    setConfigValues({
      apiUrl: 'http://bulk.com',
      userEmail: 'user@example.com',
      outputFormat: 'json',
    });

    expect(getConfigValue('apiUrl')).toBe('http://bulk.com');
    expect(getConfigValue('userEmail')).toBe('user@example.com');
    expect(getConfigValue('outputFormat')).toBe('json');
  });
});

describe('clearConfigValue', () => {
  it('should reset a value to default', () => {
    setConfigValue('apiUrl', 'http://custom.com');
    clearConfigValue('apiUrl');
    expect(getConfigValue('apiUrl')).toBe('http://localhost:3000');
  });
});

describe('clearAllConfig', () => {
  it('should reset all values to defaults', () => {
    setConfigValues({
      apiUrl: 'http://custom.com',
      userEmail: 'user@example.com',
      authToken: 'some-token',
    });

    clearAllConfig();

    const config = getConfig();
    expect(config.apiUrl).toBe('http://localhost:3000');
    expect(config.userEmail).toBe('');
    expect(config.authToken).toBe('');
  });
});

describe('getConfigPath', () => {
  it('should return a non-empty string', () => {
    const configPath = getConfigPath();
    expect(typeof configPath).toBe('string');
    expect(configPath.length).toBeGreaterThan(0);
  });

  it('should contain urlshort in the path', () => {
    const configPath = getConfigPath();
    expect(configPath.toLowerCase()).toContain('urlshort');
  });
});

describe('isAuthenticated', () => {
  it('should return false when no token or API key', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('should return true when authToken is set', () => {
    setConfigValue('authToken', 'my-jwt-token');
    expect(isAuthenticated()).toBe(true);
  });

  it('should return true when apiKey is set', () => {
    setConfigValue('apiKey', 'my-api-key');
    expect(isAuthenticated()).toBe(true);
  });
});

describe('environment variable overrides', () => {
  it('should override apiUrl with URLSHORT_API_URL', () => {
    process.env['URLSHORT_API_URL'] = 'http://env-override.com';
    expect(getConfigValue('apiUrl')).toBe('http://env-override.com');
  });

  it('should override authToken with URLSHORT_AUTH_TOKEN', () => {
    process.env['URLSHORT_AUTH_TOKEN'] = 'env-token';
    expect(getConfigValue('authToken')).toBe('env-token');
  });

  it('should override apiKey with URLSHORT_API_KEY', () => {
    process.env['URLSHORT_API_KEY'] = 'env-api-key';
    expect(getConfigValue('apiKey')).toBe('env-api-key');
  });

  it('should prefer env var over config file value', () => {
    setConfigValue('apiUrl', 'http://file-value.com');
    process.env['URLSHORT_API_URL'] = 'http://env-value.com';
    expect(getConfigValue('apiUrl')).toBe('http://env-value.com');
  });

  it('should ignore empty env var and fall back to config', () => {
    setConfigValue('apiUrl', 'http://file-value.com');
    process.env['URLSHORT_API_URL'] = '';
    expect(getConfigValue('apiUrl')).toBe('http://file-value.com');
  });
});
