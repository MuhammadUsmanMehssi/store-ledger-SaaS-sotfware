import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoadingState } from '@/components/ui/LoadingState'
import { hasPermission, type NavPermission } from '@/constants/roles'
import { normalizeEnabledModules } from '@/constants/modules'
import { useAuth } from '@/hooks/useAuth'
import { isPlatformAdmin } from '@/utils/platform'

export function ProtectedRoute({
  permission,
}: {
  permission?: NavPermission | NavPermission[]
}) {
  const { t } = useTranslation('common')
  const { isAuthenticated, isLoading, user, tenant } = useAuth()
  const location = useLocation()
  const modules = normalizeEnabledModules(tenant?.enabledModules)

  if (isLoading) return <LoadingState className="min-h-screen" label={t('loadingSession')} />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (isPlatformAdmin(user)) {
    return <Navigate to="/admin/tenants" replace />
  }

  if (tenant && tenant.onboardingComplete === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  if (permission) {
    const needed = Array.isArray(permission) ? permission : [permission]
    const allowed = needed.some((p) => hasPermission(user?.storeRole, p, modules))
    if (!allowed) {
      const fallback = hasPermission(user?.storeRole, 'dashboard', modules)
        ? '/dashboard'
        : hasPermission(user?.storeRole, 'pos', modules)
          ? '/pos'
          : '/settings/store'
      return <Navigate to={fallback} replace />
    }
  }

  return <Outlet />
}

export function GuestRoute() {
  const { t } = useTranslation('common')
  const { isAuthenticated, isLoading, tenant, user } = useAuth()

  if (isLoading) return <LoadingState className="min-h-screen" label={t('loading')} />

  if (isAuthenticated) {
    if (isPlatformAdmin(user)) {
      return <Navigate to="/admin/tenants" replace />
    }
    if (tenant && tenant.onboardingComplete === false) {
      return <Navigate to="/onboarding" replace />
    }
    const modules = normalizeEnabledModules(tenant?.enabledModules)
    const home = hasPermission(user?.storeRole, 'dashboard', modules) ? '/dashboard' : '/pos'
    return <Navigate to={home} replace />
  }

  return <Outlet />
}

export function OnboardingRoute() {
  const { t } = useTranslation('common')
  const { isAuthenticated, isLoading, tenant, user } = useAuth()

  if (isLoading) return <LoadingState className="min-h-screen" label={t('loading')} />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isPlatformAdmin(user)) return <Navigate to="/admin/tenants" replace />
  if (tenant?.onboardingComplete) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

export function PlatformAdminRoute() {
  const { t } = useTranslation('common')
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingState className="min-h-screen" label={t('loadingSession')} />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isPlatformAdmin(user)) {
    const home = hasPermission(user?.storeRole, 'dashboard') ? '/dashboard' : '/pos'
    return <Navigate to={home} replace />
  }

  return <Outlet />
}
