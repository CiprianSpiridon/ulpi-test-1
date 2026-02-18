/**
 * Tests for the global error handler.
 */

import { jest } from '@jest/globals';
import chalk from 'chalk';
import { CLIError, ValidationError, AuthenticationError } from '../utils/errors.js';

// Disable colors for consistent assertions
chalk.level = 0;

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
  // Do not actually exit
}) as never);

// Capture stderr
let stderrOutput: string[] = [];
const mockStderr = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
  stderrOutput.push(args.map(String).join(' '));
});

import { handleError } from '../utils/error-handler.js';

beforeEach(() => {
  stderrOutput = [];
  mockExit.mockClear();
  mockStderr.mockClear();
});

afterAll(() => {
  mockExit.mockRestore();
  mockStderr.mockRestore();
});

describe('handleError', () => {
  it('should exit with CLIError exit code', () => {
    handleError(new CLIError('test error', 42));
    expect(mockExit).toHaveBeenCalledWith(42);
  });

  it('should print the error message', () => {
    handleError(new CLIError('test error', 1));
    const output = stderrOutput.join('\n');
    expect(output).toContain('test error');
  });

  it('should print suggestions for CLIError', () => {
    handleError(new CLIError('test', 1, ['try this']));
    const output = stderrOutput.join('\n');
    expect(output).toContain('try this');
  });

  it('should print validation errors for ValidationError', () => {
    handleError(new ValidationError('invalid', ['field A failed', 'field B failed']));
    const output = stderrOutput.join('\n');
    expect(output).toContain('field A failed');
    expect(output).toContain('field B failed');
    expect(mockExit).toHaveBeenCalledWith(2);
  });

  it('should handle AuthenticationError', () => {
    handleError(new AuthenticationError());
    const output = stderrOutput.join('\n');
    expect(output).toContain('Authentication required');
    expect(mockExit).toHaveBeenCalledWith(77);
  });

  it('should handle generic Error with exit code 1', () => {
    handleError(new Error('generic error'));
    const output = stderrOutput.join('\n');
    expect(output).toContain('generic error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle non-Error objects with exit code 1', () => {
    handleError('string error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
