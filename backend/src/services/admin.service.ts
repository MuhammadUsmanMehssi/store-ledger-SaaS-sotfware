import { Prisma, StoreRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ConflictError, NotFoundError } from '../utils/errors';
import { hashPassword } from '../utils/password';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { seedTenantDefaults } from './tenantDefaults';
import {
  DEFAULT_ENABLED_MODULES,
  normalizeEnabledModules,
  toPrismaJson,
  type EnabledModules,
} from '../constants/modules';
import type { AdminCreateTenantInput, AdminUpdateTenantInput } from '../validators/admin.validators';

function serializeTenantRow(tenant: {
  id: string;
  name: string;
  businessName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl?: string | null;
  currency: string;
  currencySymbol: string;
  isActive: boolean;
  onboardingComplete: boolean;
  enabledModules?: unknown;
  createdAt: Date;
  updatedAt: Date;
  users?: Array<{
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    isActive: boolean;
  }>;
  _count?: {
    users: number;
    products: number;
  };
}) {
  const owner = tenant.users?.[0] ?? null;
  return {
    id: tenant.id,
    name: tenant.name,
    businessName: tenant.businessName,
    phone: tenant.phone,
    email: tenant.email,
    address: tenant.address,
    logoUrl: tenant.logoUrl ?? null,
    currency: tenant.currency,
    currencySymbol: tenant.currencySymbol,
    isActive: tenant.isActive,
    onboardingComplete: tenant.onboardingComplete,
    enabledModules: normalizeEnabledModules(tenant.enabledModules),
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    owner,
    userCount: tenant._count?.users ?? 0,
    productCount: tenant._count?.products ?? 0,
  };
}

export async function listTenants(query: { page?: number; limit?: number; search?: string }) {
  const { page, limit, search, skip, take } = parsePagination(query, { limit: 20 });

  const where: Prisma.TenantWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { businessName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [total, items] = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { storeRole: StoreRole.OWNER },
          take: 1,
          select: { id: true, email: true, fullName: true, phone: true, isActive: true },
        },
        _count: { select: { users: true, products: true } },
      },
    }),
  ]);

  return {
    items: items.map(serializeTenantRow),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function createTenantWithOwner(input: AdminCreateTenantInput) {
  const ownerEmail = input.ownerEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existing) {
    throw new ConflictError('Owner email is already registered');
  }

  const passwordHash = await hashPassword(input.ownerPassword);
  const enabledModules = normalizeEnabledModules({
    ...DEFAULT_ENABLED_MODULES,
    ...(input.enabledModules ?? {}),
  });

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.name,
        businessName: input.businessName ?? input.name,
        phone: input.phone,
        email: input.email?.toLowerCase(),
        address: input.address,
        currency: input.currency ?? 'PKR',
        currencySymbol: input.currencySymbol ?? 'Rs',
        onboardingComplete: true,
        isActive: true,
        enabledModules: toPrismaJson(enabledModules),
      },
    });

    await seedTenantDefaults(tx, tenant.id);

    const owner = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: ownerEmail,
        passwordHash,
        fullName: input.ownerFullName,
        phone: input.ownerPhone,
        storeRole: StoreRole.OWNER,
      },
      select: { id: true, email: true, fullName: true, phone: true, isActive: true },
    });

    return { tenant, owner };
  });

  return serializeTenantRow({
    ...result.tenant,
    users: [result.owner],
    _count: { users: 1, products: 0 },
  });
}

export async function updateTenant(id: string, input: AdminUpdateTenantInput) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  let enabledModules: EnabledModules | undefined;
  if (input.enabledModules) {
    enabledModules = normalizeEnabledModules({
      ...normalizeEnabledModules(tenant.enabledModules),
      ...input.enabledModules,
    });
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      isActive: input.isActive,
      name: input.name,
      businessName: input.businessName === undefined ? undefined : input.businessName,
      phone: input.phone === undefined ? undefined : input.phone,
      email: input.email === undefined ? undefined : input.email?.toLowerCase() ?? null,
      address: input.address === undefined ? undefined : input.address,
      ...(enabledModules ? { enabledModules: toPrismaJson(enabledModules) } : {}),
    },
    include: {
      users: {
        where: { storeRole: StoreRole.OWNER },
        take: 1,
        select: { id: true, email: true, fullName: true, phone: true, isActive: true },
      },
      _count: { select: { users: true, products: true } },
    },
  });

  return serializeTenantRow(updated);
}

export async function getTenantStats() {
  const [tenantCount, activeTenants, userCount, productCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.user.count({ where: { tenantId: { not: null } } }),
    prisma.product.count({ where: { deletedAt: null } }),
  ]);

  return {
    tenantCount,
    activeTenants,
    userCount,
    productCount,
  };
}

export async function uploadTenantLogo(id: string, filename: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  const logoUrl = `/uploads/tenants/${filename}`;
  const updated = await prisma.tenant.update({
    where: { id },
    data: { logoUrl },
    include: {
      users: {
        where: { storeRole: StoreRole.OWNER },
        take: 1,
        select: { id: true, email: true, fullName: true, phone: true, isActive: true },
      },
      _count: { select: { users: true, products: true } },
    },
  });

  return serializeTenantRow(updated);
}
