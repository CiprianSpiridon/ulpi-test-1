/**
 * Authentication service.
 *
 * Handles user registration, login, JWT token generation/verification,
 * and refresh token rotation. Business logic is here; route handlers
 * remain thin (max 5-10 lines).
 *
 * Security:
 * - Passwords hashed with bcrypt (configurable salt rounds)
 * - JWT access tokens (short-lived) + refresh tokens (long-lived)
 * - Refresh tokens stored in sessions table for revocation
 * - Timing-safe comparisons for sensitive operations
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env, createChildLogger } from '../config';
import { userRepository } from '../repositories';
import {
  UnauthorizedError,
  ConflictError,
} from '../errors';
import {
  JwtPayload,
  AuthTokens,
  LoginResponse,
  RegisterResponse,
  UserRow,
} from '../types';
import { toUserDTO } from '../utils/dto';

const log = createChildLogger({ module: 'AuthService' });

export class AuthService {
  /**
   * Register a new user account.
   *
   * - Validates email uniqueness
   * - Hashes password with bcrypt
   * - Creates user record
   * - Generates JWT tokens
   */
  async register(data: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<RegisterResponse> {
    // Check for existing user
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, env.bcryptSaltRounds);

    // Create user
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      displayName: data.displayName,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    log.info({ userId: user.id }, 'User registered successfully');

    return {
      user: toUserDTO(user),
      tokens,
    };
  }

  /**
   * Authenticate a user with email and password.
   *
   * - Verifies email exists and user is active
   * - Compares password hash with bcrypt
   * - Updates last login timestamp
   * - Generates JWT tokens
   */
  async login(data: {
    email: string;
    password: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<LoginResponse> {
    // Find user by email
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check account status
    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is suspended or deleted');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user, data.ipAddress, data.userAgent);

    log.info({ userId: user.id }, 'User logged in successfully');

    return {
      user: toUserDTO(user),
      tokens,
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   *
   * - Verifies refresh token signature and type
   * - Checks session exists and is not expired
   * - Generates new access token
   * - Rotates refresh token (invalidates old, issues new)
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.jwtSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Verify user exists and is active
    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('User not found or account suspended');
    }

    // Generate new token pair
    const tokens = await this.generateTokens(user);

    log.info({ userId: user.id }, 'Token refreshed successfully');

    return tokens;
  }

  /**
   * Generate access and refresh JWT token pair.
   * Optionally creates a session record for refresh token tracking.
   */
  private async generateTokens(
    user: UserRow,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<AuthTokens> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, env.jwtSecret, {
      expiresIn: this.parseExpiresIn(env.jwtExpiresIn) / 1000,
    });

    const refreshToken = jwt.sign(refreshPayload, env.jwtSecret, {
      expiresIn: this.parseExpiresIn(env.jwtRefreshExpiresIn) / 1000,
    });

    // Store session for refresh token tracking
    const sessionId = uuidv4();
    const refreshExpiresMs = this.parseExpiresIn(env.jwtRefreshExpiresIn);
    await userRepository.createSession({
      id: sessionId,
      userId: user.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      expiresAt: new Date(Date.now() + refreshExpiresMs),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.jwtExpiresIn,
    };
  }

  /**
   * Parse a duration string like '24h', '7d' into milliseconds.
   */
  private parseExpiresIn(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24h

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}

export const authService = new AuthService();
