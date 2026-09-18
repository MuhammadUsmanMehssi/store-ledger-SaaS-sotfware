import { NextFunction, Request, Response } from 'express';
import type { PlatformRole, StoreRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  isAnyModuleEnabled,
  type TenantModule,
} from '../constants/modules';
import {
  canPerform,
  resolveEffectivePermissions,
  type CrudAction,
  type PermissionModule,
} from '../constants/permissions';
import { verifyAccessToken } from '../utils/jwt';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = header.slice(7).trim();
  if (!token) {
    return next(new UnauthorizedError('Missing access token'));
  }

  const payload = verifyAccessToken(token);
  req.auth = {
    userId: payload.userId,
    tenantId: payload.tenantId,
    email: payload.email,
    platformRole: payload.platformRole,
    storeRole: payload.storeRole,
  };

  return next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.userId) {
    return next(new UnauthorizedError('Authentication required'));
  }
  return next();
}

export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.userId) {
    return next(new UnauthorizedError('Authentication required'));
  }
  if (!req.auth.tenantId) {
    return next(new ForbiddenError('Store/tenant context required. Complete onboarding first.'));
  }
  return next();
}

export function requireStoreRole(...roles: StoreRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth?.userId) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!req.auth.tenantId) {
      return next(new ForbiddenError('Store/tenant context required'));
    }
    if (!req.auth.storeRole || !roles.includes(req.auth.storeRole)) {
      return next(new ForbiddenError('Insufficient permissions for this action'));
    }
    return next();
  };
}

/** Require at least one of the given tenant modules to be enabled. */
export function requireTenantModule(...modules: TenantModule[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.tenantId) {
        return next(new ForbiddenError('Store/tenant context required'));
      }
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.auth.tenantId },
        select: { enabledModules: true, isActive: true },
      });
      if (!tenant || !tenant.isActive) {
        return next(new ForbiddenError('Store is inactive'));
      }
      if (!isAnyModuleEnabled(tenant.enabledModules, modules)) {
        return next(new ForbiddenError('This module is not enabled for your store'));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}


/** Require user CRUD permission for a module (OWNER always allowed). */
export function requireCrudPermission(module: PermissionModule, action: CrudAction) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.userId) {
        return next(new UnauthorizedError('Authentication required'));
      }
      if (req.auth.storeRole === 'OWNER') return next();

      const user = await prisma.user.findUnique({
        where: { id: req.auth.userId },
        select: { storeRole: true, permissions: true, isActive: true },
      });
      if (!user || !user.isActive) {
        return next(new ForbiddenError('Account is inactive'));
      }
      const effective = resolveEffectivePermissions(user.storeRole, user.permissions);
      if (!canPerform(effective, module, action)) {
        return next(new ForbiddenError(`Missing permission: ${module}:${action}`));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requirePlatformRole(...roles: PlatformRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth?.userId) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!req.auth.platformRole || !roles.includes(req.auth.platformRole)) {
      return next(new ForbiddenError('Platform admin access required'));
    }
    return next();
  };
}

/** Convenience: authenticate + requireAuth */
export const authRequired = [authenticate, requireAuth];

/** Convenience: authenticate + require tenant */
export const tenantRequired = [authenticate, requireTenant];

/** Convenience: authenticate + platform admin */
export const platformAdminRequired = [
  authenticate,
  requireAuth,
  requirePlatformRole('PLATFORM_ADMIN'),
];
