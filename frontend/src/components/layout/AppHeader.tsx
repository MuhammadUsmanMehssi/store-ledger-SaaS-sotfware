import { LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'

export function AppHeader({
  onMenuClick,
  collapsed,
  onToggleCollapse,
}: {
  onMenuClick: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const { t } = useTranslation('common')
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/90 px-3 backdrop-blur md:px-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label={t('openMenu')}>
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleCollapse}
          aria-label={t('toggleSidebar')}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher className="hidden sm:inline-flex" />
        {user?.storeRole ? <Badge tone="info">{user.storeRole}</Badge> : null}
        <span className="hidden text-sm text-fg-muted md:inline">{user?.fullName}</span>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t('toggleTheme')}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label={t('logout')}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
