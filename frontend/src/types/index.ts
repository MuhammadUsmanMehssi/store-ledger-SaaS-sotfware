export type StoreRole = 'OWNER' | 'MANAGER' | 'CASHIER'
export type PlatformRole = 'PLATFORM_ADMIN' | 'USER'

export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE' | 'CREDIT' | 'MIXED'
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type SaleStatus =
  | 'HELD'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'CANCELLED'
  | 'PARTIALLY_RETURNED'
  | 'RETURNED'
export type PurchaseStatus =
  | 'DRAFT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PARTIALLY_RETURNED'
  | 'RETURNED'
export type StockMovementType =
  | 'OPENING'
  | 'PURCHASE'
  | 'SALE'
  | 'PURCHASE_RETURN'
  | 'SALE_RETURN'
  | 'ADJUSTMENT'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  pagination?: PaginationMeta
}

export interface ListParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: string | number | boolean | undefined | null
}

export interface Tenant {
  id: string
  name: string
  businessName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  logoUrl?: string | null
  currency: string
  currencySymbol: string
  taxEnabled: boolean
  taxRate: number | string
  invoicePrefix: string
  purchasePrefix: string
  receiptFooter?: string | null
  lowStockThreshold: number
  allowNegativeStock: boolean
  enabledModules?: Partial<Record<string, boolean>>
  onboardingComplete: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  fullName: string
  phone?: string | null
  platformRole: PlatformRole
  storeRole?: StoreRole | null
  /** Custom overrides (null = role defaults) */
  permissions?: UserPermissionMap | null
  /** Resolved permissions for UI gating */
  effectivePermissions?: UserPermissionMap | null
  isActive: boolean
  tenantId?: string | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
  tenant?: Tenant | null
}

export type CrudAction = 'view' | 'create' | 'update' | 'delete'
export type PermissionModule =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'sales'
  | 'expenses'
  | 'cash'
  | 'reports'
  | 'users'
  | 'settings'
export type ModuleCrud = Record<CrudAction, boolean>
export type UserPermissionMap = Record<PermissionModule, ModuleCrud>

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthPayload extends AuthTokens {
  user: User
  tenant?: Tenant | null
}

export interface AdminTenantOwner {
  id: string
  email: string
  fullName: string
  phone?: string | null
  isActive: boolean
}

export interface AdminTenant {
  id: string
  name: string
  businessName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  logoUrl?: string | null
  currency: string
  currencySymbol: string
  isActive: boolean
  onboardingComplete: boolean
  enabledModules?: Tenant['enabledModules']
  createdAt: string
  updatedAt: string
  owner: AdminTenantOwner | null
  userCount: number
  productCount: number
}

export interface AdminStats {
  tenantCount: number
  activeTenants: number
  userCount: number
  productCount: number
}

export interface Category {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { products: number }
}

export interface Brand {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  _count?: { products: number }
}

export interface Unit {
  id: string
  name: string
  abbreviation: string
  isActive: boolean
  conversionFactor: number | string
}

export interface Product {
  id: string
  name: string
  sku?: string | null
  barcode?: string | null
  categoryId?: string | null
  brandId?: string | null
  brand?: string | null
  brandRef?: { id: string; name: string } | null
  flavor?: string | null
  size?: string | null
  unitId?: string | null
  purchasePrice: number | string
  salePrice: number | string
  avgCost: number | string
  minimumStock: number | string
  currentStock: number | string
  description?: string | null
  imageUrl?: string | null
  variantGroupId?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  category?: Category | null
  unit?: Unit | null
}

export interface StockMovement {
  id: string
  productId: string
  type: StockMovementType
  quantity: number | string
  unitCost: number | string
  balanceAfter: number | string
  reason?: string | null
  notes?: string | null
  createdAt: string
  product?: Product
}

export interface Customer {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  openingBalance: number | string
  currentBalance: number | string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  openingBalance: number | string
  currentBalance: number | string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AccountTransaction {
  id: string
  partyType: 'CUSTOMER' | 'SUPPLIER'
  partyId: string
  type: string
  amount: number | string
  balanceAfter: number | string
  paymentMethod?: PaymentMethod | null
  referenceType?: string | null
  referenceId?: string | null
  notes?: string | null
  createdAt: string
  sale?: {
    id: string
    invoiceNumber: string
    saleDate: string
    grandTotal: number | string
    paidAmount: number | string
    remainingAmount: number | string
    paymentMethod: PaymentMethod
    items: Array<{
      id: string
      productId: string
      quantity: number | string
      unitPrice: number | string
      discount: number | string
      lineTotal: number | string
      product?: {
        id: string
        name: string
        flavor?: string | null
        size?: string | null
        sku?: string | null
        barcode?: string | null
      } | null
    }>
  } | null
  saleReturn?: {
    id: string
    returnNumber: string
    returnDate: string
    grandTotal: number | string
    items: Array<{
      id: string
      productId: string
      quantity: number | string
      unitPrice: number | string
      lineTotal: number | string
      product?: {
        id: string
        name: string
        flavor?: string | null
        size?: string | null
        sku?: string | null
        barcode?: string | null
      } | null
    }>
  } | null
  purchase?: { id: string; invoiceNumber: string } | null
  purchaseReturn?: {
    id: string
    returnNumber: string
    grandTotal: number | string
    purchase?: { invoiceNumber: string } | null
  } | null
}

export interface PurchaseItem {
  id?: string
  productId: string
  quantity: number | string
  unitPrice: number | string
  discount?: number | string
  taxAmount?: number | string
  lineTotal: number | string
  returnedQty?: number | string
  netQty?: number | string
  netLineTotal?: number | string
  product?: Product
}

export interface Purchase {
  id: string
  supplierId?: string | null
  invoiceNumber: string
  purchaseDate: string
  status: PurchaseStatus
  subtotal: number | string
  discountAmount: number | string
  taxAmount: number | string
  grandTotal: number | string
  paidAmount: number | string
  remainingAmount: number | string
  returnedAmount?: number | string
  netTotal?: number | string
  recoverable?: number | string
  paymentMethod?: PaymentMethod | null
  paymentStatus: PaymentStatus
  notes?: string | null
  createdAt: string
  supplier?: Supplier | null
  items?: PurchaseItem[]
}

export interface PurchaseReturnItem {
  productId: string
  quantity: number | string
  unitPrice: number | string
  lineTotal: number | string
  product?: Product
}

export interface PurchaseReturn {
  id: string
  purchaseId: string
  supplierId?: string | null
  returnNumber: string
  returnDate: string
  reason?: string | null
  subtotal: number | string
  grandTotal: number | string
  createdAt: string
  purchase?: Purchase
  supplier?: Supplier | null
  items?: PurchaseReturnItem[]
}

export interface SaleItem {
  id?: string
  productId: string
  quantity: number | string
  unitPrice: number | string
  unitCost?: number | string
  discount?: number | string
  taxAmount?: number | string
  lineTotal: number | string
  returnedQty?: number | string
  netQty?: number | string
  netLineTotal?: number | string
  product?: Product
}

export interface Sale {
  id: string
  customerId?: string | null
  invoiceNumber: string
  saleDate: string
  status: SaleStatus
  subtotal: number | string
  discountAmount: number | string
  taxAmount: number | string
  grandTotal: number | string
  paidAmount: number | string
  remainingAmount: number | string
  returnedAmount?: number | string
  netTotal?: number | string
  recoverable?: number | string
  changeAmount: number | string
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  totalCost?: number | string
  profitAmount?: number | string
  notes?: string | null
  createdAt: string
  customer?: Customer | null
  items?: SaleItem[]
}

export interface HeldSaleItem {
  productId: string
  quantity: number | string
  unitPrice: number | string
  discount?: number | string
  product?: Product
}

export interface HeldSale {
  id: string
  customerId?: string | null
  referenceName?: string | null
  discountAmount: number | string
  notes?: string | null
  createdAt: string
  customer?: Customer | null
  items: HeldSaleItem[]
}

export interface SaleReturnItem {
  productId: string
  quantity: number | string
  unitPrice: number | string
  lineTotal: number | string
  product?: Product
}

export interface SaleReturn {
  id: string
  saleId: string
  customerId?: string | null
  returnNumber: string
  returnDate: string
  reason?: string | null
  subtotal: number | string
  grandTotal: number | string
  refundMethod: PaymentMethod
  createdAt: string
  sale?: Sale
  customer?: Customer | null
  items?: SaleReturnItem[]
}

export interface ExpenseCategory {
  id: string
  name: string
  isActive: boolean
}

export interface Expense {
  id: string
  categoryId?: string | null
  amount: number | string
  expenseDate: string
  paymentMethod: PaymentMethod
  description?: string | null
  isVoided: boolean
  createdAt: string
  category?: ExpenseCategory | null
}

export interface CashSession {
  id: string
  sessionDate: string
  openingCash: number | string
  cashIn: number | string
  cashOut: number | string
  expectedCash: number | string
  actualCash?: number | string | null
  difference?: number | string | null
  isClosed: boolean
  closedAt?: string | null
  notes?: string | null
  canCancel?: boolean
  transactions?: CashTransaction[]
}

export interface CashTransaction {
  id: string
  type: string
  amount: number | string
  direction: string
  notes?: string | null
  createdAt: string
}

export interface DashboardStats {
  range: { from: string; to: string; preset: string }
  sales: {
    count: number
    total: number
    cogs: number
    profit: number
    returns: number
    netSales: number
  }
  purchases: { count: number; total: number }
  expenses: { count: number; total: number }
  inventory: {
    productCount: number
    lowStockCount: number
    stockValue: number
    outOfStockCount?: number
  }
  parties: { customers: number; suppliers: number }
  netProfit: number
  cashInHand?: number
  chart?: Array<{ date: string; sales: number; profit: number; purchases: number; expenses: number }>
  topProducts?: Array<{ productId: string; name: string; qty: number; revenue: number }>
  recentSales?: Array<{
    id: string
    invoiceNumber: string
    grandTotal: number
    profitAmount: number
    saleDate: string
    paymentMethod: string
    customerName: string
  }>
  lowStockProducts?: Array<{
    id: string
    name: string
    sku?: string | null
    currentStock: number
    minimumStock: number
  }>
}

export interface DateRangeParams {
  from?: string
  to?: string
  preset?: 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'year' | 'custom'
}

export interface ReportResult {
  range?: { from: string; to: string }
  summary?: Record<string, number | string>
  items?: Array<Record<string, unknown>>
  rows?: Array<Record<string, unknown>>
  pagination?: PaginationMeta
}

