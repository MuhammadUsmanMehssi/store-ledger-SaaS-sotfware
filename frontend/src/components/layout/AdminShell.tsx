import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Building2, LogOut, Menu, Moon, Shield, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'

export function AdminShell() {
  const { t } = useTranslation(['admin', 'common', 'nav'])
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [mobileOpen, setMobileOpen] = useState(false)

  const adminNav = [{ to: '/admin/tenants', label: t('admin:navTenants'), icon: Building2 }]

  const sidebar = (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-700 text-white">
          <Shield className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-fg">{t('admin:brand')}</p>
          <p className="truncate text-xs text-fg-subtle">{t('admin:platformControl')}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {adminNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
              )
            }
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="min-h-screen">
      {isDesktop ? (
        <aside className="fixed inset-y-0 start-0 z-40 w-64 border-e border-border">{sidebar}</aside>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} title={t('admin:adminMenu')}>
          {sidebar}
        </Drawer>
      )}

      <div className={cn(isDesktop && 'lg:ps-64')}>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/90 px-3 backdrop-blur md:px-5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t('common:openMenu')}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Badge tone="info">{t('admin:platformAdminBadge')}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <span className="hidden text-sm text-fg-muted md:inline">{user?.fullName}</span>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('common:toggleTheme')}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label={t('common:logout')}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="px-3 py-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
