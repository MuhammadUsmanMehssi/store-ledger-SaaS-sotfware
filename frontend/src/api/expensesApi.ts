import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { Expense, ExpenseCategory, ListParams, PaymentMethod } from '@/types'

export const expensesApi = {
  list: (params?: ListParams & { categoryId?: string; from?: string; to?: string }) =>
    apiGet<Expense[]>('/expenses', params),
  get: (id: string) => apiGet<Expense>(`/expenses/${id}`),
  create: (body: {
    categoryId?: string
    amount: number
    expenseDate?: string
    paymentMethod?: PaymentMethod
    description?: string
  }) => apiPost<Expense>('/expenses', body),
  update: (id: string, body: Partial<Expense>) =>
    apiPatch<Expense>(`/expenses/${id}`, body),
  remove: (id: string) => apiDelete<null>(`/expenses/${id}`),
  categories: (params?: { all?: boolean }) =>
    apiGet<ExpenseCategory[]>('/expenses/categories', params),
  createCategory: (body: { name: string }) =>
    apiPost<ExpenseCategory>('/expenses/categories', body),
  updateCategory: (id: string, body: { name?: string; isActive?: boolean }) =>
    apiPatch<ExpenseCategory>(`/expenses/categories/${id}`, body),
  removeCategory: (id: string) => apiDelete<ExpenseCategory>(`/expenses/categories/${id}`),
}
