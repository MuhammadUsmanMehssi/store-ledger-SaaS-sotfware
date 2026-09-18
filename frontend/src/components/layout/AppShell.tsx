import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Drawer } from '@/components/ui/Drawer'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'

export function AppShell() {
  const { t } = useTranslation('nav')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const location = useLocation()
  const reduce = useReducedMotion()
  const isPos = location.pathname.startsWith('/pos')

  return (
    <div className={cn(isPos ? 'flex h-[100dvh] flex-col overflow-hidden' : 'min-h-screen')}>
      {isDesktop ? (
        <aside
          className={cn(
            'fixed inset-y-0 start-0 z-40 border-e border-border transition-[width]',
            collapsed ? 'w-[4.5rem]' : 'w-64',
          )}
        >
          <AppSidebar collapsed={collapsed} />
        </aside>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} title={t('menu')}>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <div
        className={cn(
          isDesktop ? (collapsed ? 'lg:ps-[4.5rem]' : 'lg:ps-64') : '',
          isPos && 'flex min-h-0 flex-1 flex-col overflow-hidden',
        )}
      >
        {!isPos ? (
          <AppHeader
            onMenuClick={() => setMobileOpen(true)}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        ) : (
          <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3 lg:hidden">
            <button type="button" className="text-sm font-semibold text-primary-700" onClick={() => setMobileOpen(true)}>
              {t('menu')}
            </button>
            <LanguageSwitcher />
          </div>
        )}
        <main
          className={cn(
            isPos ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-0' : 'px-3 py-4 md:px-6 md:py-6',
          )}
        >
          {isPos ? (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </div>
          ) : (
            <motion.div
              key={location.pathname}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.18 }}
            >
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
