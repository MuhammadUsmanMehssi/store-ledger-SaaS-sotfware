import { Prisma, StoreRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { hashPassword } from '../utils/password';
import type { CreateUserInput, UpdateUserInput } from '../validators/user.validators';
import {
  normalizePermissionMap,
  resolveEffectivePermissions,
  roleDefaultPermissions,
  toPrismaPermissionsJson,
  type UserPermissionMap,
} from '../constants/permissions';

function sanitize(user: {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  storeRole: StoreRole | null;
  permissions?: unknown;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}) {
  const custom = user.permissions ?? null;
  const effective = resolveEffectivePermissions(user.storeRole, custom);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    storeRole: user.storeRole,
    permissions: custom != null ? normalizePermissionMap(custom, user.storeRole) : null,
    effectivePermissions: effective,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function listUsers(tenantId: string) {
  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: [{ storeRole: 'asc' }, { fullName: 'asc' }],
  });
  return users.map(sanitize);
}

export async function createUser(tenantId: string, actorRole: StoreRole | null, input: CreateUserInput) {
  if (actorRole !== 'OWNER') {
    throw new ForbiddenError('Only store owners can create users');
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new ConflictError('Email already in use');

  const passwordHash = await hashPassword(input.password);
  const permissionsMap: UserPermissionMap | null = input.permissions
    ? normalizePermissionMap(input.permissions, input.storeRole)
    : null;

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: input.email.toLowerCase(),
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      storeRole: input.storeRole,
      ...(permissionsMap ? { permissions: toPrismaPermissionsJson(permissionsMap) } : {}),
    },
  });

  return sanitize(user);
}

export async function updateUser(
  tenantId: string,
  actorRole: StoreRole | null,
  actorUserId: string,
  id: string,
  input: UpdateUserInput,
) {
  if (actorRole !== 'OWNER' && (input.permissions !== undefined || input.storeRole)) {
    throw new ForbiddenError('Only owners can change roles or permissions');
  }

  const user = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!user) throw new NotFoundError('User not found');

  if (user.storeRole === 'OWNER' && actorUserId !== user.id) {
    throw new ForbiddenError('Cannot modify another owner account');
  }

  if (input.storeRole && actorRole !== 'OWNER') {
    throw new ForbiddenError('Only owners can change roles');
  }

  if (input.isActive === false && user.storeRole === 'OWNER') {
    throw new BadRequestError('Cannot deactivate the store owner');
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;

  const data: Prisma.UserUpdateInput = {
    fullName: input.fullName,
    phone: input.phone === undefined ? undefined : input.phone,
    storeRole: input.storeRole,
    isActive: input.isActive,
    ...(passwordHash ? { passwordHash } : {}),
  };

  if (input.permissions === null) {
    data.permissions = Prisma.DbNull;
  } else if (input.permissions !== undefined) {
    data.permissions = toPrismaPermissionsJson(
      normalizePermissionMap(input.permissions, input.storeRole ?? user.storeRole),
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
  });

  return sanitize(updated);
}

export function getRoleDefaults(role: StoreRole) {
  return roleDefaultPermissions(role);
}
