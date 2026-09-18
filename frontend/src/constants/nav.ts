import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Boxes,
  ClipboardList,
  FileBarChart2,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import type { NavPermission } from './roles'

export type NavItem = {
  /** i18n key under `nav` namespace */
  labelKey: string
  to?: string
  icon: LucideIcon
  permission?: NavPermission
  children?: Array<{
    labelKey: string
    to: string
    permission?: NavPermission
  }>
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'dashboard', to: '/dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { labelKey: 'pos', to: '/pos', icon: ShoppingBag, permission: 'pos' },
  {
    labelKey: 'inventory',
    icon: Boxes,
    children: [
      { labelKey: 'products', to: '/products', permission: 'products' },
      { labelKey: 'categories', to: '/categories', permission: 'categories' },
      { labelKey: 'brands', to: '/brands', permission: 'brands' },
      { labelKey: 'units', to: '/units', permission: 'units' },
      { labelKey: 'stock', to: '/inventory', permission: 'inventory' },
      { labelKey: 'adjustments', to: '/inventory/adjustments', permission: 'adjustments' },
    ],
  },
  {
    labelKey: 'purchases',
    icon: ClipboardList,
    children: [
      { labelKey: 'purchases', to: '/purchases', permission: 'purchases' },
      { labelKey: 'purchaseReturns', to: '/purchase-returns', permission: 'purchase_returns' },
    ],
  },
  {
    labelKey: 'sales',
    icon: Receipt,
    children: [
      { labelKey: 'salesHistory', to: '/sales', permission: 'sales' },
      { labelKey: 'salesReturns', to: '/sales-returns', permission: 'sales_returns' },
    ],
  },
  {
    labelKey: 'reports',
    icon: FileBarChart2,
    children: [
      { labelKey: 'reportSales', to: '/reports/sales', permission: 'report_sales' },
      { labelKey: 'reportPurchases', to: '/reports/purchases', permission: 'report_purchases' },
      { labelKey: 'reportInventory', to: '/reports/inventory', permission: 'report_inventory' },
      { labelKey: 'reportExpenses', to: '/reports/expenses', permission: 'report_expenses' },
      { labelKey: 'reportProfitLoss', to: '/reports/profit-loss', permission: 'report_profit_loss' },
    ],
  },
  { labelKey: 'suppliers', to: '/suppliers', icon: Truck, permission: 'suppliers' },
  { labelKey: 'expenses', to: '/expenses', icon: Wallet, permission: 'expenses' },
  { labelKey: 'cash', to: '/cash', icon: Banknote, permission: 'cash' },
  { labelKey: 'customers', to: '/customers', icon: Users, permission: 'customers' },
  {
    labelKey: 'settings',
    icon: Settings,
    children: [
      { labelKey: 'store', to: '/settings/store', permission: 'settings_store' },
      { labelKey: 'users', to: '/settings/users', permission: 'settings_users' },
    ],
  },
]

export const BRAND = {
  nameKey: 'brandName',
  taglineKey: 'brandTagline',
  icon: Store,
  tagsIcon: Tags,
  packageIcon: Package,
}
