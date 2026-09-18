import type { Prisma } from '@prisma/client';

/**
 * Flat permission keys (parents + sub-modules).
 * Parents are for UI bulk toggle; leaf keys gate nav/API.
 */
export const TENANT_MODULES = [
  'dashboard',
  'pos',
  'sales',
  'sales_history',
  'sales_returns',
  'purchases',
  'purchases_list',
  'purchase_returns',
  'inventory',
  'products',
  'categories',
  'brands',
  'units',
  'stock',
  'adjustments',
  'customers',
  'suppliers',
  'expenses',
  'cash',
  'reports',
  'report_sales',
  'report_purchases',
  'report_inventory',
  'report_expenses',
  'report_profit_loss',
  'settings',
  'settings_store',
  'settings_users',
] as const;

export type TenantModule = (typeof TENANT_MODULES)[number];

export type EnabledModules = Record<TenantModule, boolean>;

export type ModuleTreeNode = {
  key: TenantModule;
  children?: TenantModule[];
};

/** UI grouping for admin permission matrix. */
export const TENANT_MODULE_TREE: ModuleTreeNode[] = [
  { key: 'dashboard' },
  { key: 'pos' },
  {
    key: 'inventory',
    children: ['products', 'categories', 'brands', 'units', 'stock', 'adjustments'],
  },
  {
    key: 'purchases',
    children: ['purchases_list', 'purchase_returns'],
  },
  {
    key: 'sales',
    children: ['sales_history', 'sales_returns'],
  },
  { key: 'customers' },
  { key: 'suppliers' },
  { key: 'expenses' },
  { key: 'cash' },
  {
    key: 'reports',
    children: [
      'report_sales',
      'report_purchases',
      'report_inventory',
      'report_expenses',
      'report_profit_loss',
    ],
  },
  {
    key: 'settings',
    children: ['settings_store', 'settings_users'],
  },
];

const PARENT_TO_CHILDREN: Partial<Record<TenantModule, TenantModule[]>> = Object.fromEntries(
  TENANT_MODULE_TREE.filter((n) => n.children?.length).map((n) => [n.key, n.children!]),
);

const CHILD_TO_PARENT: Partial<Record<TenantModule, TenantModule>> = {};
for (const [parent, children] of Object.entries(PARENT_TO_CHILDREN) as Array<
  [TenantModule, TenantModule[]]
>) {
  for (const child of children) CHILD_TO_PARENT[child] = parent;
}

export const DEFAULT_ENABLED_MODULES: EnabledModules = Object.fromEntries(
  TENANT_MODULES.map((m) => [m, true]),
) as EnabledModules;

function readBool(src: Record<string, unknown>, key: string): boolean | undefined {
  return typeof src[key] === 'boolean' ? (src[key] as boolean) : undefined;
}

/**
 * Normalize stored JSON.
 * - Missing keys default to true (backward compatible).
 * - If only a parent is set (old data), expand to all children.
 * - Parent becomes true if any child is true.
 */
export function normalizeEnabledModules(raw: unknown): EnabledModules {
  const src =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const out = { ...DEFAULT_ENABLED_MODULES };

  for (const key of TENANT_MODULES) {
    const v = readBool(src, key);
    if (v !== undefined) out[key] = v;
  }

  // Expand legacy parent-only flags onto children when children are absent
  for (const [parent, children] of Object.entries(PARENT_TO_CHILDREN) as Array<
    [TenantModule, TenantModule[]]
  >) {
    const parentVal = readBool(src, parent);
    if (parentVal === undefined) continue;
    const anyChildPresent = children.some((c) => readBool(src, c) !== undefined);
    if (!anyChildPresent) {
      for (const child of children) out[child] = parentVal;
    }
  }

  // Sync parent from children (any child on → parent on)
  for (const [parent, children] of Object.entries(PARENT_TO_CHILDREN) as Array<
    [TenantModule, TenantModule[]]
  >) {
    out[parent] = children.some((c) => out[c]);
  }

  return out;
}

export function isModuleEnabled(raw: unknown, module: TenantModule): boolean {
  const normalized = normalizeEnabledModules(raw);
  if (normalized[module]) return true;
  // Parent enabled alone (edge) — already expanded in normalize
  const parent = CHILD_TO_PARENT[module];
  if (parent && normalized[parent] && readBool(
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {},
    module,
  ) === undefined) {
    return normalized[parent];
  }
  return false;
}

export function isAnyModuleEnabled(raw: unknown, modules: TenantModule[]): boolean {
  return modules.some((m) => isModuleEnabled(raw, m));
}

/** Set parent and all children to the same value. */
export function setParentModule(
  current: EnabledModules,
  parent: TenantModule,
  value: boolean,
): EnabledModules {
  const next = { ...current, [parent]: value };
  const children = PARENT_TO_CHILDREN[parent];
  if (children) {
    for (const child of children) next[child] = value;
  }
  return next;
}

/** Toggle a leaf; update parent to match any-child-on. */
export function setChildModule(
  current: EnabledModules,
  child: TenantModule,
  value: boolean,
): EnabledModules {
  const next = { ...current, [child]: value };
  const parent = CHILD_TO_PARENT[child];
  if (parent) {
    const children = PARENT_TO_CHILDREN[parent] ?? [];
    next[parent] = children.some((c) => (c === child ? value : next[c]));
  }
  return next;
}

export function toPrismaJson(modules: EnabledModules): Prisma.InputJsonValue {
  return modules as unknown as Prisma.InputJsonValue;
}
