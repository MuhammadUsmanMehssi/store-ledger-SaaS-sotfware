import type { StoreRole } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export const PERMISSION_MODULES = [
  'dashboard',
  'pos',
  'products',
  'categories',
  'inventory',
  'customers',
  'suppliers',
  'purchases',
  'sales',
  'expenses',
  'cash',
  'reports',
  'users',
  'settings',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const CRUD_ACTIONS = ['view', 'create', 'update', 'delete'] as const;
export type CrudAction = (typeof CRUD_ACTIONS)[number];

export type ModuleCrud = Record<CrudAction, boolean>;
export type UserPermissionMap = Record<PermissionModule, ModuleCrud>;

function allCrud(value: boolean): ModuleCrud {
  return { view: value, create: value, update: value, delete: value };
}

function viewOnly(): ModuleCrud {
  return { view: true, create: false, update: false, delete: false };
}

function viewCreateUpdate(): ModuleCrud {
  return { view: true, create: true, update: true, delete: false };
}

function full(): ModuleCrud {
  return allCrud(true);
}

function none(): ModuleCrud {
  return allCrud(false);
}

/** Role baseline — OWNER full; MANAGER almost full (no users delete/manage); CASHIER limited. */
export function roleDefaultPermissions(role: StoreRole | null | undefined): UserPermissionMap {
  if (role === 'OWNER') {
    return Object.fromEntries(PERMISSION_MODULES.map((m) => [m, full()])) as UserPermissionMap;
  }

  if (role === 'MANAGER') {
    return {
      dashboard: viewOnly(),
      pos: viewCreateUpdate(),
      products: full(),
      categories: full(),
      inventory: full(),
      customers: full(),
      suppliers: full(),
      purchases: full(),
      sales: full(),
      expenses: full(),
      cash: full(),
      reports: viewOnly(),
      users: viewOnly(),
      settings: viewCreateUpdate(),
    };
  }

  // CASHIER
  return {
    dashboard: none(),
    pos: { view: true, create: true, update: true, delete: false },
    products: viewOnly(),
    categories: viewOnly(),
    inventory: viewOnly(),
    customers: viewCreateUpdate(),
    suppliers: none(),
    purchases: none(),
    sales: viewCreateUpdate(),
    expenses: viewOnly(),
    cash: viewOnly(),
    reports: none(),
    users: none(),
    settings: none(),
  };
}

export function normalizePermissionMap(
  raw: unknown,
  fallbackRole?: StoreRole | null,
): UserPermissionMap {
  const base = roleDefaultPermissions(fallbackRole ?? 'CASHIER');
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  const src = raw as Record<string, unknown>;
  const out = { ...base };

  for (const mod of PERMISSION_MODULES) {
    const entry = src[mod];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    out[mod] = {
      view: typeof e.view === 'boolean' ? e.view : base[mod].view,
      create: typeof e.create === 'boolean' ? e.create : base[mod].create,
      update: typeof e.update === 'boolean' ? e.update : base[mod].update,
      delete: typeof e.delete === 'boolean' ? e.delete : base[mod].delete,
    };
  }
  return out;
}

/**
 * Effective permissions:
 * - OWNER always full
 * - If custom permissions JSON set, use it (normalized)
 * - Else role defaults
 */
export function resolveEffectivePermissions(
  role: StoreRole | null | undefined,
  custom: unknown,
): UserPermissionMap {
  if (role === 'OWNER') return roleDefaultPermissions('OWNER');
  if (custom != null) return normalizePermissionMap(custom, role);
  return roleDefaultPermissions(role);
}

export function canPerform(
  map: UserPermissionMap,
  module: PermissionModule,
  action: CrudAction,
): boolean {
  return Boolean(map[module]?.[action]);
}

export function toPrismaPermissionsJson(map: UserPermissionMap): Prisma.InputJsonValue {
  return map as unknown as Prisma.InputJsonValue;
}

/** Map HTTP method + resource to CRUD check helpers for routes. */
export const ROUTE_MODULE: Record<string, PermissionModule> = {
  products: 'products',
  categories: 'categories',
  brands: 'products',
  units: 'products',
  inventory: 'inventory',
  customers: 'customers',
  suppliers: 'suppliers',
  purchases: 'purchases',
  'purchase-returns': 'purchases',
  sales: 'sales',
  'sale-returns': 'sales',
  expenses: 'expenses',
  cash: 'cash',
  reports: 'reports',
  users: 'users',
  settings: 'settings',
  dashboard: 'dashboard',
  pos: 'pos',
};
