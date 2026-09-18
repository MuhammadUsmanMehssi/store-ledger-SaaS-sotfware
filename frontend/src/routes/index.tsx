import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { AppShell } from '@/components/layout/AppShell'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AdminShell } from '@/components/layout/AdminShell'
import { GuestRoute, OnboardingRoute, PlatformAdminRoute, ProtectedRoute } from './guards'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const StoreSetupPage = lazy(() => import('@/pages/onboarding/StoreSetupPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const PosPage = lazy(() => import('@/pages/pos/PosPage'))
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage'))
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage'))
const BrandsPage = lazy(() => import('@/pages/brands/BrandsPage'))
const UnitsPage = lazy(() => import('@/pages/units/UnitsPage'))
const InventoryPage = lazy(() => import('@/pages/inventory/InventoryPage'))
const AdjustmentsPage = lazy(() => import('@/pages/inventory/AdjustmentsPage'))
const PurchasesPage = lazy(() => import('@/pages/purchases/PurchasesPage'))
const PurchaseReturnsPage = lazy(() => import('@/pages/purchase-returns/PurchaseReturnsPage'))
const SalesPage = lazy(() => import('@/pages/sales/SalesPage'))
const SalesReturnsPage = lazy(() => import('@/pages/sales-returns/SalesReturnsPage'))
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage'))
const SuppliersPage = lazy(() => import('@/pages/suppliers/SuppliersPage'))
const ExpensesPage = lazy(() => import('@/pages/expenses/ExpensesPage'))
const CashPage = lazy(() => import('@/pages/cash/CashPage'))
const SalesReportPage = lazy(() => import('@/pages/reports/SalesReportPage'))
const PurchasesReportPage = lazy(() => import('@/pages/reports/PurchasesReportPage'))
const InventoryReportPage = lazy(() => import('@/pages/reports/InventoryReportPage'))
const ExpensesReportPage = lazy(() => import('@/pages/reports/ExpensesReportPage'))
const ProfitLossPage = lazy(() => import('@/pages/reports/ProfitLossPage'))
const StoreSettingsPage = lazy(() => import('@/pages/settings/StoreSettingsPage'))
const UsersPage = lazy(() => import('@/pages/settings/UsersPage'))
const AdminTenantsPage = lazy(() => import('@/pages/admin/TenantsPage'))

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState className="min-h-[50vh]" />}>{children}</Suspense>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Lazy><LoginPage /></Lazy>} />
          <Route path="/register" element={<Lazy><RegisterPage /></Lazy>} />
          <Route path="/forgot-password" element={<Lazy><ForgotPasswordPage /></Lazy>} />
          <Route path="/reset-password" element={<Lazy><ResetPasswordPage /></Lazy>} />
        </Route>
      </Route>

      <Route element={<OnboardingRoute />}>
        <Route path="/onboarding" element={<Lazy><StoreSetupPage /></Lazy>} />
      </Route>

      <Route element={<PlatformAdminRoute />}>
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<Navigate to="/admin/tenants" replace />} />
          <Route path="/admin/tenants" element={<Lazy><AdminTenantsPage /></Lazy>} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route element={<ProtectedRoute permission="dashboard" />}>
            <Route path="/dashboard" element={<Lazy><DashboardPage /></Lazy>} />
          </Route>

          <Route element={<ProtectedRoute permission="pos" />}>
            <Route path="/pos" element={<Lazy><PosPage /></Lazy>} />
          </Route>

          <Route element={<ProtectedRoute permission="sales" />}>
            <Route path="/sales" element={<Lazy><SalesPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="sales_returns" />}>
            <Route path="/sales-returns" element={<Lazy><SalesReturnsPage /></Lazy>} />
          </Route>

          <Route element={<ProtectedRoute permission="purchases" />}>
            <Route path="/purchases" element={<Lazy><PurchasesPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="purchase_returns" />}>
            <Route path="/purchase-returns" element={<Lazy><PurchaseReturnsPage /></Lazy>} />
          </Route>

          <Route element={<ProtectedRoute permission="products" />}>
            <Route path="/products" element={<Lazy><ProductsPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="categories" />}>
            <Route path="/categories" element={<Lazy><CategoriesPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="brands" />}>
            <Route path="/brands" element={<Lazy><BrandsPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="units" />}>
            <Route path="/units" element={<Lazy><UnitsPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="inventory" />}>
            <Route path="/inventory" element={<Lazy><InventoryPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="adjustments" />}>
            <Route path="/inventory/adjustments" element={<Lazy><AdjustmentsPage /></Lazy>} />
          </Route>

          <Route element={<ProtectedRoute permission="customers" />}>
            <Route path="/customers" element={<Lazy><CustomersPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="suppliers" />}>
            <Route path="/suppliers" element={<Lazy><SuppliersPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="expenses" />}>
            <Route path="/expenses" element={<Lazy><ExpensesPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="cash" />}>
            <Route path="/cash" element={<Lazy><CashPage /></Lazy>} />
          </Route>

          <Route element={<ProtectedRoute permission="report_sales" />}>
            <Route path="/reports/sales" element={<Lazy><SalesReportPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="report_purchases" />}>
            <Route path="/reports/purchases" element={<Lazy><PurchasesReportPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="report_inventory" />}>
            <Route path="/reports/inventory" element={<Lazy><InventoryReportPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="report_expenses" />}>
            <Route path="/reports/expenses" element={<Lazy><ExpensesReportPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="report_profit_loss" />}>
            <Route path="/reports/profit-loss" element={<Lazy><ProfitLossPage /></Lazy>} />
          </Route>

          <Route element={<ProtectedRoute permission="settings_store" />}>
            <Route path="/settings/store" element={<Lazy><StoreSettingsPage /></Lazy>} />
          </Route>
          <Route element={<ProtectedRoute permission="settings_users" />}>
            <Route path="/settings/users" element={<Lazy><UsersPage /></Lazy>} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
