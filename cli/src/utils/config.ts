/**
 * Configuration management for the URL Shortener CLI.
 *
 * Uses the `conf` package to persist settings in the user's home
 * directory (~/.config/urlshort/config.json on Linux,
 * ~/Library/Preferences/urlshort on macOS, %APPDATA%/urlshort on Windows).
 *
 * Configuration priority (highest wins):
 *   CLI flags > environment variables > config file > defaults
 */

import Conf from 'conf';

export interface CLIConfig {
  apiUrl: string;
  authToken: string;
  apiKey: string;
  refreshToken: string;
  userEmail: string;
  userId: string;
  outputFormat: 'text' | 'json';
  colorEnabled: boolean;
  defaultDomain: string;
}

const CONFIG_DEFAULTS: CLIConfig = {
  apiUrl: 'http://localhost:3000',
  authToken: '',
  apiKey: '',
  refreshToken: '',
  userEmail: '',
  userId: '',
  outputFormat: 'text',
  colorEnabled: true,
  defaultDomain: '',
};

const config = new Conf<CLIConfig>({
  projectName: 'urlshort',
  defaults: CONFIG_DEFAULTS,
  schema: {
    apiUrl: { type: 'string' },
    authToken: { type: 'string' },
    apiKey: { type: 'string' },
    refreshToken: { type: 'string' },
    userEmail: { type: 'string' },
    userId: { type: 'string' },
    outputFormat: { type: 'string', enum: ['text', 'json'] },
    colorEnabled: { type: 'boolean' },
    defaultDomain: { type: 'string' },
  },
});

/**
 * Return the full configuration object.
 */
export function getConfig(): CLIConfig {
  return {
    apiUrl: getConfigValue('apiUrl'),
    authToken: getConfigValue('authToken'),
    apiKey: getConfigValue('apiKey'),
    refreshToken: getConfigValue('refreshToken'),
    userEmail: getConfigValue('userEmail'),
    userId: getConfigValue('userId'),
    outputFormat: getConfigValue('outputFormat'),
    colorEnabled: getConfigValue('colorEnabled'),
    defaultDomain: getConfigValue('defaultDomain'),
  };
}

/**
 * Get a single config value, respecting environment variable overrides.
 */
export function getConfigValue<K extends keyof CLIConfig>(key: K): CLIConfig[K] {
  const envMap: Partial<Record<keyof CLIConfig, string>> = {
    apiUrl: 'URLSHORT_API_URL',
    authToken: 'URLSHORT_AUTH_TOKEN',
    apiKey: 'URLSHORT_API_KEY',
    outputFormat: 'URLSHORT_OUTPUT_FORMAT',
    defaultDomain: 'URLSHORT_DEFAULT_DOMAIN',
  };

  const envKey = envMap[key];
  if (envKey) {
    const envValue = process.env[envKey];
    if (envValue !== undefined && envValue !== '') {
      return envValue as CLIConfig[K];
    }
  }

  return config.get(key);
}

/**
 * Set a single config value.
 */
export function setConfigValue<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void {
  config.set(key, value);
}

/**
 * Set multiple config values at once.
 */
export function setConfigValues(values: Partial<CLIConfig>): void {
  for (const [key, value] of Object.entries(values)) {
    config.set(key as keyof CLIConfig, value as CLIConfig[keyof CLIConfig]);
  }
}

/**
 * Clear a specific config value (reset to default).
 */
export function clearConfigValue<K extends keyof CLIConfig>(key: K): void {
  config.set(key, CONFIG_DEFAULTS[key]);
}

/**
 * Clear all stored configuration (reset to defaults).
 */
export function clearAllConfig(): void {
  config.clear();
}

/**
 * Get the on-disk path of the config file.
 */
export function getConfigPath(): string {
  return config.path;
}

/**
 * Check whether the user has a stored auth token or API key.
 */
export function isAuthenticated(): boolean {
  const token = getConfigValue('authToken');
  const apiKey = getConfigValue('apiKey');
  return (token !== '' && token !== undefined) || (apiKey !== '' && apiKey !== undefined);
}

export { config };
