/**
 * Authentication commands: login, logout, whoami.
 *
 * Handles JWT-based authentication with the backend API.
 * Credentials are stored in the user's config directory and
 * used automatically for subsequent requests.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

import { apiPost, apiGet } from '../utils/api-client.js';
import {
  setConfigValues,
  clearConfigValue,
  isAuthenticated,
} from '../utils/config.js';
import { AuthenticationError } from '../utils/errors.js';
import { handleError } from '../utils/error-handler.js';
import { validateEmail, validatePassword } from '../utils/validators.js';
import { successBox, info, bold } from '../utils/formatters.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

interface UserProfileResponse {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string;
  urlCount?: number;
}

interface RegisterResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
}

// ---------------------------------------------------------------------------
// Login command
// ---------------------------------------------------------------------------

async function loginAction(options: { email?: string; password?: string }): Promise<void> {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'Email address:',
        validate: validateEmail,
        when: !options.email,
        filter: (input: string) => input.trim().toLowerCase(),
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*',
        validate: validatePassword,
        when: !options.password,
      },
    ]);

    const email = options.email ?? answers['email'] as string;
    const password = options.password ?? answers['password'] as string;

    const spinner = ora('Authenticating...').start();

    const { data } = await apiPost<LoginResponse>(
      '/api/auth/login',
      { email, password },
      { noAuth: true },
    );

    setConfigValues({
      authToken: data.token,
      refreshToken: data.refreshToken,
      userEmail: data.user.email,
      userId: data.user.id,
    });

    spinner.succeed('Authenticated successfully');

    console.log(
      successBox(
        'Login Successful',
        [
          `${bold('Email:')}  ${chalk.white(data.user.email)}`,
          `${bold('Name:')}   ${chalk.white(data.user.displayName)}`,
          `${bold('Role:')}   ${chalk.white(data.user.role)}`,
        ].join('\n'),
      ),
    );

    logger.debug({ userId: data.user.id }, 'User logged in');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Logout command
// ---------------------------------------------------------------------------

async function logoutAction(): Promise<void> {
  try {
    if (!isAuthenticated()) {
      console.log(info('You are not currently logged in.'));
      return;
    }

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Are you sure you want to log out?',
        default: true,
      },
    ]) as { confirmed: boolean };

    if (!confirmed) {
      console.log(info('Logout cancelled.'));
      return;
    }

    clearConfigValue('authToken');
    clearConfigValue('refreshToken');
    clearConfigValue('userEmail');
    clearConfigValue('userId');

    console.log(chalk.green('  Logged out successfully.'));
    logger.debug('User logged out');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Whoami command
// ---------------------------------------------------------------------------

async function whoamiAction(options: { json?: boolean }): Promise<void> {
  try {
    if (!isAuthenticated()) {
      throw new AuthenticationError('You are not logged in.');
    }

    const spinner = ora('Fetching profile...').start();

    const { data } = await apiGet<UserProfileResponse>('/api/auth/me');

    spinner.stop();

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log('');
    console.log(bold('  User Profile'));
    console.log(`  ${chalk.dim('Email:')}        ${chalk.white(data.email)}`);
    console.log(`  ${chalk.dim('Name:')}         ${chalk.white(data.displayName ?? '(not set)')}`);
    console.log(`  ${chalk.dim('Role:')}         ${chalk.white(data.role)}`);
    console.log(`  ${chalk.dim('Status:')}       ${chalk.white(data.status)}`);
    console.log(`  ${chalk.dim('Member since:')} ${chalk.white(new Date(data.createdAt).toLocaleDateString())}`);
    if (data.urlCount !== undefined) {
      console.log(`  ${chalk.dim('URLs created:')} ${chalk.white(String(data.urlCount))}`);
    }
    console.log('');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Register command
// ---------------------------------------------------------------------------

async function registerAction(options: {
  email?: string;
  password?: string;
  name?: string;
}): Promise<void> {
  try {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'Email address:',
        validate: validateEmail,
        when: !options.email,
        filter: (input: string) => input.trim().toLowerCase(),
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password (min 8 characters):',
        mask: '*',
        validate: validatePassword,
        when: !options.password,
      },
      {
        type: 'input',
        name: 'name',
        message: 'Display name (optional):',
        when: !options.name,
      },
    ]);

    const email = options.email ?? answers['email'] as string;
    const password = options.password ?? answers['password'] as string;
    const displayName = options.name ?? answers['name'] as string | undefined;

    const spinner = ora('Creating account...').start();

    const body: Record<string, unknown> = { email, password };
    if (displayName) {
      body['displayName'] = displayName;
    }

    const { data } = await apiPost<RegisterResponse>(
      '/api/auth/register',
      body,
      { noAuth: true },
    );

    setConfigValues({
      authToken: data.token,
      refreshToken: data.refreshToken,
      userEmail: data.user.email,
      userId: data.user.id,
    });

    spinner.succeed('Account created successfully');

    console.log(
      successBox(
        'Registration Complete',
        [
          `${bold('Email:')}  ${chalk.white(data.user.email)}`,
          `${bold('Name:')}   ${chalk.white(data.user.displayName)}`,
          '',
          chalk.dim('You are now logged in and ready to shorten URLs.'),
        ].join('\n'),
      ),
    );

    logger.debug({ userId: data.user.id }, 'User registered');
  } catch (err: unknown) {
    handleError(err);
  }
}

// ---------------------------------------------------------------------------
// Register sub-commands on a parent Command
// ---------------------------------------------------------------------------

export function registerAuthCommands(program: Command): void {
  // Login
  program
    .command('login')
    .description('Authenticate with email and password')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .action(loginAction);

  // Logout
  program
    .command('logout')
    .description('Clear stored credentials')
    .action(logoutAction);

  // Whoami
  program
    .command('whoami')
    .description('Display current user profile')
    .option('--json', 'Output as JSON')
    .action(whoamiAction);

  // Register
  program
    .command('register')
    .description('Create a new account')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .option('-n, --name <name>', 'Display name')
    .action(registerAction);
}
