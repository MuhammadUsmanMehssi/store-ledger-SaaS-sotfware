import { Outlet, Link } from 'react-router-dom'
import { Store } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { KiryanaAuthScene } from '@/components/auth/KiryanaAuthScene'

export function AuthLayout() {
  const { t } = useTranslation('nav')
  const reduce = useReducedMotion()

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-primary-50">
      <KiryanaAuthScene />

      <div className="relative z-10 flex min-h-dvh w-full flex-col lg:flex-row">
        {/* Brand + scene column */}
        <section className="relative flex w-full flex-col px-4 pb-2 pt-4 sm:px-6 sm:pt-6 lg:w-[56%] lg:px-10 lg:pb-8 lg:pt-8 xl:w-[58%] xl:px-14">
          <header className="relative z-30 flex shrink-0 items-center justify-between gap-3">
            <Link to="/login" className="inline-flex min-w-0 items-center gap-2 sm:gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-700 text-white shadow-soft sm:h-11 sm:w-11">
                <Store className="h-5 w-5" />
              </span>
              <span className="truncate font-display text-xl font-extrabold tracking-tight text-fg sm:text-2xl">
                {t('brandName')}
              </span>
            </Link>
            <div className="relative z-30 rounded-2xl bg-white/75 p-0.5 shadow-soft backdrop-blur-md lg:hidden">
              <LanguageSwitcher />
            </div>
          </header>

          <div className="relative z-20 mt-4 max-w-xl sm:mt-6 lg:mt-10">
            <motion.h1
              className="font-display text-[1.35rem] font-bold leading-snug tracking-tight text-fg xs:text-2xl sm:text-3xl lg:text-[2.15rem] lg:leading-tight xl:text-4xl"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              {t('brandTagline')}
            </motion.h1>
            <motion.p
              className="mt-2 max-w-md text-xs leading-relaxed text-fg-muted sm:mt-3 sm:text-sm"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
            >
              {t('authFooter')}
            </motion.p>
          </div>

          {/* Keeps shop readable on desktop without crushing the form */}
          <div className="pointer-events-none mt-auto hidden min-h-[220px] flex-1 lg:block" aria-hidden />
        </section>

        {/* Form column — always scrollable / fully visible */}
        <section className="relative z-20 flex w-full flex-1 flex-col justify-end px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-8 lg:w-[44%] lg:justify-center lg:bg-white/65 lg:px-10 lg:py-10 lg:backdrop-blur-md xl:w-[42%] xl:px-14">
          <div className="mb-5 hidden shrink-0 justify-end lg:flex">
            <div className="rounded-2xl bg-white/80 p-0.5 shadow-soft backdrop-blur-md">
              <LanguageSwitcher />
            </div>
          </div>

          <motion.div
            className="mx-auto w-full max-w-md rounded-t-[1.75rem] rounded-b-3xl border border-white/80 bg-white/95 p-5 shadow-soft backdrop-blur-sm sm:rounded-3xl sm:p-7 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Outlet />
          </motion.div>
        </section>
      </div>
    </div>
  )
}
