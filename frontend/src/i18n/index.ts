import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'
import ur from './locales/ur'
import ar from './locales/ar'

export const namespaces = [
  'common',
  'nav',
  'auth',
  'onboarding',
  'dashboard',
  'pos',
  'products',
  'catalog',
  'inventory',
  'purchases',
  'sales',
  'customers',
  'suppliers',
  'expenses',
  'cash',
  'reports',
  'settings',
  'admin',
  'receipt',
] as const

export type AppNamespace = (typeof namespaces)[number]

export const supportedLngs = ['en', 'ur', 'ar'] as const
export type AppLanguage = (typeof supportedLngs)[number]

const RTL_LANGS = new Set<string>(['ur', 'ar'])

/** Set document language and text direction (rtl for Urdu/Arabic). */
export function applyDocumentDirection(lng: string) {
  const normalized = (lng || 'en').split('-')[0]
  const dir = RTL_LANGS.has(normalized) ? 'rtl' : 'ltr'
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized
    document.documentElement.dir = dir
  }
}

function toNamespaceResources(locale: Record<string, unknown>) {
  return {
    common: locale.common,
    nav: locale.nav,
    auth: locale.auth,
    onboarding: locale.onboarding,
    dashboard: locale.dashboard,
    pos: locale.pos,
    products: locale.products,
    catalog: locale.catalog,
    inventory: locale.inventory,
    purchases: locale.purchases,
    sales: locale.sales,
    customers: locale.customers,
    suppliers: locale.suppliers,
    expenses: locale.expenses,
    cash: locale.cash,
    reports: locale.reports,
    settings: locale.settings,
    admin: locale.admin,
    receipt: locale.receipt,
  }
}

const resources = {
  en: toNamespaceResources(en as unknown as Record<string, unknown>),
  ur: toNamespaceResources(ur as unknown as Record<string, unknown>),
  ar: toNamespaceResources(ar as unknown as Record<string, unknown>),
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: resources as never,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [...namespaces],
    supportedLngs: [...supportedLngs],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'gs_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
      prefix: '{',
      suffix: '}',
    },
  })

applyDocumentDirection(i18n.language)
i18n.on('languageChanged', applyDocumentDirection)

export default i18n
