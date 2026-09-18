import type { StoreRole } from '@/types'
import { NAV_TO_MODULE, isModuleEnabled, type EnabledModules } from './modules'

export const STORE_ROLES: StoreRole[] = ['OWNER', 'MANAGER', 'CASHIER']

export type NavPermission =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'sales_returns'
  | 'purchases'
  | 'purchase_returns'
  | 'products'
  | 'categories'
  | 'brands'
  | 'units'
  | 'inventory'
  | 'adjustments'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'cash'
  | 'report_sales'
  | 'report_purchases'
  | 'report_inventory'
  | 'report_expenses'
  | 'report_profit_loss'
  | 'settings_store'
  | 'settings_users'

export const ROLE_PERMISSIONS: Record<StoreRole, NavPermission[]> = {
  OWNER: [
    'dashboard',
    'pos',
    'sales',
    'sales_returns',
    'purchases',
    'purchase_returns',
    'products',
    'categories',
    'brands',
    'units',
    'inventory',
    'adjustments',
    'customers',
    'suppliers',
    'expenses',
    'cash',
    'report_sales',
    'report_purchases',
    'report_inventory',
    'report_expenses',
    'report_profit_loss',
    'settings_store',
    'settings_users',
  ],
  MANAGER: [
    'dashboard',
    'pos',
    'sales',
    'sales_returns',
    'purchases',
    'purchase_returns',
    'products',
    'categories',
    'brands',
    'units',
    'inventory',
    'adjustments',
    'customers',
    'suppliers',
    'expenses',
    'cash',
    'report_sales',
    'report_purchases',
    'report_inventory',
    'report_expenses',
    'report_profit_loss',
    'settings_store',
  ],
  CASHIER: ['pos', 'sales', 'sales_returns', 'customers'],
}

export function hasPermission(
  role: StoreRole | null | undefined,
  permission: NavPermission,
  enabledModules?: EnabledModules | null,
): boolean {
  if (!role) return false
  if (!ROLE_PERMISSIONS[role]?.includes(permission)) return false
  const module = NAV_TO_MODULE[permission]
  return isModuleEnabled(enabledModules, module)
}
