import { createHash, randomBytes } from 'crypto';
import { StoreRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { hashPassword, comparePassword } from '../utils/password';
import {
  getRefreshTokenExpiryDate,
  parseExpiryToDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from '../utils/jwt';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validators';
import { seedTenantDefaults } from './tenantDefaults';
import { normalizeEnabledModules, DEFAULT_ENABLED_MODULES, toPrismaJson } from '../constants/modules';
import { resolveEffectivePermissions } from '../constants/permissions';
import { toNumber } from '../utils/money';

const tenantPublicSelect = {
  id: true,
  name: true,
  businessName: true,
  onboardingComplete: true,
  isActive: true,
  currency: true,
  currencySymbol: true,
  phone: true,
  email: true,
  address: true,
  logoUrl: true,
  receiptFooter: true,
  allowNegativeStock: true,
  taxEnabled: true,
  taxRate: true,
  enabledModules: true,
} as const;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(user: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  platformRole: string;
  storeRole: StoreRole | null;
  tenantId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  permissions?: unknown;
  tenant?: {
    id: string;
    name: string;
    businessName: string | null;
    onboardingComplete: boolean;
    currency?: string;
    currencySymbol?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    logoUrl?: string | null;
    receiptFooter?: string | null;
    allowNegativeStock?: boolean;
    taxEnabled?: boolean;
    taxRate?: unknown;
    enabledModules?: unknown;
  } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    platformRole: user.platformRole,
    storeRole: user.storeRole,
    tenantId: user.tenantId,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    permissions: resolveEffectivePermissions(user.storeRole, user.permissions),
    tenant: user.tenant
      ? {
          id: user.tenant.id,
          name: user.tenant.name,
          businessName: user.tenant.businessName,
          onboardingComplete: user.tenant.onboardingComplete,
          currency: user.tenant.currency ?? 'PKR',
          currencySymbol: user.tenant.currencySymbol ?? 'Rs',
          phone: user.tenant.phone ?? null,
          email: user.tenant.email ?? null,
          address: user.tenant.address ?? null,
          logoUrl: user.tenant.logoUrl ?? null,
          receiptFooter: user.tenant.receiptFooter ?? null,
          allowNegativeStock: user.tenant.allowNegativeStock ?? false,
          taxEnabled: user.tenant.taxEnabled ?? false,
          taxRate: user.tenant.taxRate != null ? toNumber(user.tenant.taxRate as string) : 0,
          enabledModules: normalizeEnabledModules(user.tenant.enabledModules),
        }
      : null,
  };
}

function toTokenPayload(user: {
  id: string;
  email: string;
  platformRole: TokenPayload['platformRole'];
  storeRole: StoreRole | null;
  tenantId: string | null;
}): TokenPayload {
  return {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    platformRole: user.platformRole,
    storeRole: user.storeRole,
  };
}

async function issueTokens(user: {
  id: string;
  email: string;
  platformRole: TokenPayload['platformRole'];
  storeRole: StoreRole | null;
  tenantId: string | null;
}) {
  const accessToken = signAccessToken(toTokenPayload(user));
  const refreshToken = signRefreshToken(user.id);
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: getRefreshTokenExpiryDate(),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    let tenantId: string | null = null;
    let storeRole: StoreRole | null = null;

    if (input.storeName) {
      const tenant = await tx.tenant.create({
        data: {
          name: input.storeName,
          businessName: input.businessName ?? input.storeName,
          email: input.email.toLowerCase(),
          phone: input.phone,
          onboardingComplete: true,
          enabledModules: toPrismaJson(DEFAULT_ENABLED_MODULES),
        },
      });
      tenantId = tenant.id;
      storeRole = StoreRole.OWNER;
      await seedTenantDefaults(tx, tenant.id, {
        invoicePrefix: 'INV',
        purchasePrefix: 'PUR',
      });
    }

    const user = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        tenantId,
        storeRole,
      },
      include: {
        tenant: { select: tenantPublicSelect },
      },
    });

    return user;
  });

  const tokens = await issueTokens(result);
  return { user: sanitizeUser(result), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: {
      tenant: { select: tenantPublicSelect },
    },
  });

  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new ForbiddenInactiveError();
  }

  if (user.tenant && !user.tenant.isActive) {
    throw new UnauthorizedError('Store account is inactive');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

class ForbiddenInactiveError extends UnauthorizedError {
  constructor() {
    super('Account is inactive');
  }
}

export async function refresh(input: RefreshInput) {
  const payload = verifyRefreshToken(input.refreshToken);
  const tokenHash = hashToken(input.refreshToken);

  const stored = await prisma.refreshToken.findFirst({
    where: {
      userId: payload.userId,
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!stored) {
    throw new UnauthorizedError('Refresh token is invalid or revoked');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      tenant: { select: tenantPublicSelect },
    },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } else {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  return { success: true };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: { select: tenantPublicSelect },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return sanitizeUser(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const valid = await comparePassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new BadRequestError('Current password is incorrect');
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

  // Always return success to avoid email enumeration
  if (!user) {
    return {
      message: 'If an account exists, a reset link has been sent',
      resetToken: env.NODE_ENV === 'development' ? null : undefined,
    };
  }

  const resetToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(resetToken);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      tokenHash,
      expiresAt: parseExpiryToDate('1h'),
    },
  });

  return {
    message: 'If an account exists, a reset link has been sent',
    ...(env.NODE_ENV === 'development' ? { resetToken } : {}),
  };
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    throw new BadRequestError('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { success: true };
}
