import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Store } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from '@/constants/nav'
import { hasPermission, type NavPermission } from '@/constants/roles'
import { normalizeEnabledModules } from '@/constants/modules'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'
import { mediaUrl } from '@/utils/mediaUrl'

function NavGroup({
  collapsed,
  item,
  can,
  onNavigate,
  t,
}: {
  collapsed?: boolean
  item: (typeof NAV_ITEMS)[number]
  can: (p?: NavPermission) => boolean
  onNavigate?: () => void
  t: (key: string) => string
}) {
  const location = useLocation()
  const children = item.children?.filter((c) => can(c.permission)) ?? []
  const activeChild = children.some((c) => location.pathname.startsWith(c.to))
  const [open, setOpen] = useState(activeChild)
  const reduce = useReducedMotion()
  const label = t(item.labelKey)

  if (!children.length && !item.to) return null
  if (item.permission && !can(item.permission) && !children.length) return null

  if (item.to) {
    if (item.permission && !can(item.permission)) return null
    return (
      <NavLink
        to={item.to}
        onClick={() => onNavigate?.()}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
            isActive
              ? 'bg-primary-700 text-white shadow-sm'
              : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
            collapsed && 'justify-center px-2',
          )
        }
        title={label}
      >
        <item.icon className="h-4.5 w-4.5 shrink-0" />
        {!collapsed ? <span>{label}</span> : null}
      </NavLink>
    )
  }

  if (!children.length) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-3 hover:text-fg',
          activeChild && 'text-fg',
          collapsed && 'justify-center px-2',
        )}
        title={label}
      >
        <item.icon className="h-4.5 w-4.5 shrink-0" />
        {!collapsed ? (
          <>
            <span className="flex-1 text-start">{label}</span>
            <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
          </>
        ) : null}
      </button>
      {!collapsed && open ? (
        <motion.div
          initial={reduce ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="ms-3 space-y-0.5 border-s border-border ps-3"
        >
          {children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={() => onNavigate?.()}
              className={({ isActive }) =>
                cn(
                  'block rounded-lg px-2.5 py-1.5 text-sm transition',
                  isActive
                    ? 'bg-primary-700/10 font-semibold text-primary-800 dark:text-primary-300'
                    : 'text-fg-muted hover:text-fg',
                )
              }
            >
              {t(child.labelKey)}
            </NavLink>
          ))}
        </motion.div>
      ) : null}
    </div>
  )
}

export function AppSidebar({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const { t } = useTranslation('nav')
  const { user, tenant } = useAuth()
  const logo = mediaUrl(tenant?.logoUrl)
  const modules = useMemo(
    () => normalizeEnabledModules(tenant?.enabledModules),
    [tenant?.enabledModules],
  )
  const can = useMemo(
    () => (permission?: NavPermission) =>
      permission ? hasPermission(user?.storeRole, permission, modules) : true,
    [user?.storeRole, modules],
  )

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className={cn('flex items-center gap-2.5 border-b border-border px-4 py-4', collapsed && 'justify-center px-2')}>
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-primary-700 text-white">
          {logo ? (
            <img src={logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <Store className="h-4.5 w-4.5" />
          )}
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-fg">{t('brandName')}</p>
            <p className="truncate text-xs text-fg-subtle">{tenant?.name || t('yourStore')}</p>
          </div>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavGroup
            key={item.labelKey + (item.to || '')}
            item={item}
            collapsed={collapsed}
            can={can}
            onNavigate={onNavigate}
            t={t}
          />
        ))}
      </nav>
    </div>
  )
}
