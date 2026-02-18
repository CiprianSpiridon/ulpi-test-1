/**
 * Custom error classes for the URL Shortener CLI.
 *
 * Each error type carries a specific exit code and optional suggestions
 * to help the user resolve the issue.
 */

export class CLIError extends Error {
  public readonly exitCode: number;
  public readonly suggestions: string[];

  constructor(message: string, exitCode = 1, suggestions: string[] = []) {
    super(message);
    this.name = this.constructor.name;
    this.exitCode = exitCode;
    this.suggestions = suggestions;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends CLIError {
  constructor(message = 'Authentication required') {
    super(message, 77, [
      'Run "urlshort login" to authenticate.',
      'Or set the URLSHORT_API_KEY environment variable.',
      'Check your credentials and try again.',
    ]);
  }
}

export class ConfigurationError extends CLIError {
  constructor(message: string, field?: string) {
    const suggestions = [
      'Run "urlshort config set" to update configuration.',
      'Check your configuration file at ~/.config/urlshort/config.json',
    ];
    if (field) {
      suggestions.unshift(`The configuration field "${field}" is invalid or missing.`);
    }
    super(message, 78, suggestions);
  }
}

export class ValidationError extends CLIError {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message, 2, [
      'Check the command usage with --help.',
      'Verify all required arguments are provided.',
    ]);
    this.errors = errors;
  }
}

export class NetworkError extends CLIError {
  public readonly url: string;

  constructor(message: string, url = '') {
    super(message, 69, [
      'Check your internet connection.',
      'Verify the API endpoint is correct: urlshort config show',
      'The server may be temporarily unavailable. Try again later.',
    ]);
    this.url = url;
  }
}

export class FileSystemError extends CLIError {
  public readonly filePath: string;

  constructor(message: string, filePath: string, exitCode = 66) {
    super(message, exitCode, [
      `Check that the file exists: ${filePath}`,
      'Verify you have the correct permissions.',
    ]);
    this.filePath = filePath;
  }
}

export class ApiError extends CLIError {
  public readonly statusCode: number;
  public readonly responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody?: unknown) {
    const suggestions: string[] = [];

    if (statusCode === 401) {
      suggestions.push('Your session may have expired. Run "urlshort login" to re-authenticate.');
    } else if (statusCode === 403) {
      suggestions.push('You do not have permission for this action.');
    } else if (statusCode === 404) {
      suggestions.push('The requested resource was not found. Verify the ID or short code.');
    } else if (statusCode === 429) {
      suggestions.push('Rate limit exceeded. Wait a moment and try again.');
    } else if (statusCode >= 500) {
      suggestions.push('The server encountered an error. Try again later.');
    }

    super(message, 1, suggestions);
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
