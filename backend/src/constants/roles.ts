import type { StoreRole } from '@prisma/client';

export type Permission =
  | 'dashboard:read'
  | 'products:read'
  | 'products:write'
  | 'categories:read'
  | 'categories:write'
  | 'units:read'
  | 'units:write'
  | 'inventory:read'
  | 'inventory:adjust'
  | 'customers:read'
  | 'customers:write'
  | 'customers:payment'
  | 'suppliers:read'
  | 'suppliers:write'
  | 'suppliers:payment'
  | 'purchases:read'
  | 'purchases:write'
  | 'purchase_returns:read'
  | 'purchase_returns:write'
  | 'sales:read'
  | 'sales:write'
  | 'sale_returns:read'
  | 'sale_returns:write'
  | 'expenses:read'
  | 'expenses:write'
  | 'cash:read'
  | 'cash:write'
  | 'reports:read'
  | 'users:read'
  | 'users:write'
  | 'settings:read'
  | 'settings:write';

const ALL_PERMISSIONS: Permission[] = [
  'dashboard:read',
  'products:read',
  'products:write',
  'categories:read',
  'categories:write',
  'units:read',
  'units:write',
  'inventory:read',
  'inventory:adjust',
  'customers:read',
  'customers:write',
  'customers:payment',
  'suppliers:read',
  'suppliers:write',
  'suppliers:payment',
  'purchases:read',
  'purchases:write',
  'purchase_returns:read',
  'purchase_returns:write',
  'sales:read',
  'sales:write',
  'sale_returns:read',
  'sale_returns:write',
  'expenses:read',
  'expenses:write',
  'cash:read',
  'cash:write',
  'reports:read',
  'users:read',
  'users:write',
  'settings:read',
  'settings:write',
];

export const ROLE_PERMISSIONS: Record<StoreRole, Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  MANAGER: ALL_PERMISSIONS.filter((p) => p !== 'users:write'),
  CASHIER: [
    'dashboard:read',
    'products:read',
    'categories:read',
    'units:read',
    'inventory:read',
    'customers:read',
    'customers:write',
    'customers:payment',
    'sales:read',
    'sales:write',
    'sale_returns:read',
    'sale_returns:write',
    'cash:read',
    'expenses:read',
  ],
};

export function hasPermission(role: StoreRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
