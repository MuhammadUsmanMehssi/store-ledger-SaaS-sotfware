import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { PlatformRole, StoreRole } from '@prisma/client';
import { env } from '../config/env';
import { UnauthorizedError } from './errors';

export interface TokenPayload {
  userId: string;
  tenantId: string | null;
  email: string;
  platformRole: PlatformRole;
  storeRole: StoreRole | null;
}

export interface AccessTokenPayload extends TokenPayload {
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

function asExpiresIn(value: string): SignOptions['expiresIn'] {
  return value as SignOptions['expiresIn'];
}

export function signAccessToken(payload: TokenPayload): string {
  const body: AccessTokenPayload = { ...payload, type: 'access' };
  return jwt.sign(body, env.JWT_ACCESS_SECRET, {
    expiresIn: asExpiresIn(env.JWT_ACCESS_EXPIRES_IN),
  });
}

export function signRefreshToken(userId: string): string {
  const body: RefreshTokenPayload = { userId, type: 'refresh' };
  return jwt.sign(body, env.JWT_REFRESH_SECRET, {
    expiresIn: asExpiresIn(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload & AccessTokenPayload;
    if (decoded.type !== 'access' || !decoded.userId) {
      throw new UnauthorizedError('Invalid access token');
    }
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload & RefreshTokenPayload;
    if (decoded.type !== 'refresh' || !decoded.userId) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    return decoded;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export function getRefreshTokenExpiryDate(): Date {
  return parseExpiryToDate(env.JWT_REFRESH_EXPIRES_IN);
}

export function parseExpiryToDate(expiresIn: string): Date {
  const match = /^(\d+)([smhd])$/i.exec(expiresIn.trim());
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + amount * (multipliers[unit] ?? multipliers.d));
}
