import { StoreRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { toNumber } from '../utils/money';
import type { CreateStoreInput, UpdateSettingsInput } from '../validators/tenant.validators';
import { seedTenantDefaults } from './tenantDefaults';
import { signAccessToken, signRefreshToken, getRefreshTokenExpiryDate } from '../utils/jwt';
import { createHash } from 'crypto';
import {
  DEFAULT_ENABLED_MODULES,
  normalizeEnabledModules,
  toPrismaJson,
} from '../constants/modules';

function serializeTenant(tenant: {
  id: string;
  name: string;
  businessName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
  currency: string;
  currencySymbol: string;
  taxEnabled: boolean;
  taxRate: unknown;
  invoicePrefix: string;
  purchasePrefix: string;
  receiptFooter: string | null;
  lowStockThreshold: number;
  allowNegativeStock: boolean;
  enabledModules?: unknown;
  isActive: boolean;
  onboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...tenant,
    taxRate: toNumber(tenant.taxRate as string),
    enabledModules: normalizeEnabledModules(tenant.enabledModules),
  };
}

export async function createStore(userId: string, input: CreateStoreInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  if (user.tenantId) {
    throw new ConflictError('User already belongs to a store');
  }

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.name,
        businessName: input.businessName ?? input.name,
        phone: input.phone ?? user.phone,
        email: input.email ?? user.email,
        address: input.address,
        currency: input.currency ?? 'PKR',
        currencySymbol: input.currencySymbol ?? 'Rs',
        onboardingComplete: true,
        enabledModules: toPrismaJson(DEFAULT_ENABLED_MODULES),
      },
    });

    await seedTenantDefaults(tx, tenant.id);

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        tenantId: tenant.id,
        storeRole: StoreRole.OWNER,
      },
    });

    return { tenant, user: updatedUser };
  });

  const accessToken = signAccessToken({
    userId: result.user.id,
    tenantId: result.user.tenantId,
    email: result.user.email,
    platformRole: result.user.platformRole,
    storeRole: result.user.storeRole,
  });
  const refreshToken = signRefreshToken(result.user.id);
  await prisma.refreshToken.create({
    data: {
      userId: result.user.id,
      tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: getRefreshTokenExpiryDate(),
    },
  });

  return {
    tenant: serializeTenant(result.tenant),
    accessToken,
    refreshToken,
  };
}

export async function getSettings(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new NotFoundError('Store not found');
  }
  return serializeTenant(tenant);
}

export async function updateSettings(tenantId: string, input: UpdateSettingsInput) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new NotFoundError('Store not found');
  }

  if (input.invoicePrefix || input.purchasePrefix) {
    await prisma.$transaction(async (tx) => {
      if (input.invoicePrefix) {
        await tx.documentSequence.updateMany({
          where: { tenantId, docType: 'INVOICE' },
          data: { prefix: input.invoicePrefix },
        });
      }
      if (input.purchasePrefix) {
        await tx.documentSequence.updateMany({
          where: { tenantId, docType: 'PURCHASE' },
          data: { prefix: input.purchasePrefix },
        });
      }
    });
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: input.name,
      businessName: input.businessName === undefined ? undefined : input.businessName,
      phone: input.phone === undefined ? undefined : input.phone,
      email: input.email === undefined ? undefined : input.email,
      address: input.address === undefined ? undefined : input.address,
      logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
      currency: input.currency,
      currencySymbol: input.currencySymbol,
      taxEnabled: input.taxEnabled,
      taxRate: input.taxRate,
      invoicePrefix: input.invoicePrefix,
      purchasePrefix: input.purchasePrefix,
      receiptFooter: input.receiptFooter === undefined ? undefined : input.receiptFooter,
      lowStockThreshold: input.lowStockThreshold,
      allowNegativeStock: input.allowNegativeStock,
    },
  });

  return serializeTenant(updated);
}

export async function uploadLogo(tenantId: string, filename: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new NotFoundError('Store not found');
  }
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { logoUrl: `/uploads/tenants/${filename}` },
  });
  return serializeTenant(updated);
}

export function assertTenant(tenantId: string | null | undefined): asserts tenantId is string {
  if (!tenantId) {
    throw new BadRequestError('Tenant context is required');
  }
}
