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
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

export const CRUD_ACTIONS = ['view', 'create', 'update', 'delete'] as const
export type CrudAction = (typeof CRUD_ACTIONS)[number]

export type ModuleCrud = Record<CrudAction, boolean>
export type UserPermissionMap = Record<PermissionModule, ModuleCrud>

function allCrud(value: boolean): ModuleCrud {
  return { view: value, create: value, update: value, delete: value }
}

function viewOnly(): ModuleCrud {
  return { view: true, create: false, update: false, delete: false }
}

function viewCreateUpdate(): ModuleCrud {
  return { view: true, create: true, update: true, delete: false }
}

function full(): ModuleCrud {
  return allCrud(true)
}

function none(): ModuleCrud {
  return allCrud(false)
}

export function roleDefaultPermissions(
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | null | undefined,
): UserPermissionMap {
  if (role === 'OWNER') {
    return Object.fromEntries(PERMISSION_MODULES.map((m) => [m, full()])) as UserPermissionMap
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
    }
  }

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
  }
}

export function normalizePermissionMap(
  raw: unknown,
  fallbackRole?: 'OWNER' | 'MANAGER' | 'CASHIER' | null,
): UserPermissionMap {
  const base = roleDefaultPermissions(fallbackRole ?? 'CASHIER')
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base
  const src = raw as Record<string, unknown>
  const out = { ...base }
  for (const mod of PERMISSION_MODULES) {
    const entry = src[mod]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const e = entry as Record<string, unknown>
    out[mod] = {
      view: typeof e.view === 'boolean' ? e.view : base[mod].view,
      create: typeof e.create === 'boolean' ? e.create : base[mod].create,
      update: typeof e.update === 'boolean' ? e.update : base[mod].update,
      delete: typeof e.delete === 'boolean' ? e.delete : base[mod].delete,
    }
  }
  return out
}

export function canPerform(
  map: UserPermissionMap | null | undefined,
  module: PermissionModule,
  action: CrudAction,
): boolean {
  if (!map) return false
  return Boolean(map[module]?.[action])
}
