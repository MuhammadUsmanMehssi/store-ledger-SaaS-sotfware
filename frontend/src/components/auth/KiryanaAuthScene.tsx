import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Decorative 2D kiryana / general-store scene for auth screens.
 * Pure SVG + CSS — lightweight, responsive, respects reduced motion.
 */
export function KiryanaAuthScene({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion()

  const drift = (duration: number, y = 10) =>
    reduce
      ? undefined
      : {
          y: [0, -y, 0],
          transition: { duration, repeat: Infinity, ease: 'easeInOut' as const },
        }

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="auth-sky absolute inset-0" />
      <div className="auth-grain absolute inset-0 opacity-[0.28]" />

      <svg
        className="absolute inset-x-0 bottom-[12%] h-[36%] w-full text-primary-800/20 lg:bottom-[8%] lg:h-[42%]"
        viewBox="0 0 1200 280"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0 180 C120 120 220 200 340 150 C460 100 520 170 640 140 C780 100 860 180 980 130 C1080 95 1140 150 1200 120 L1200 280 L0 280 Z"
        />
        <path
          fill="rgb(15 118 110 / 0.12)"
          d="M0 210 C160 160 280 230 420 190 C560 150 640 220 780 185 C920 150 1020 210 1200 170 L1200 280 L0 280 Z"
        />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-primary-900/25 via-primary-700/10 to-transparent" />

      <motion.div
        className="absolute start-[6%] top-[10%] h-10 w-28 rounded-full bg-white/50 blur-[1px] sm:h-12 sm:w-36"
        animate={reduce ? undefined : { x: [0, 40, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute end-[12%] top-[16%] h-8 w-24 rounded-full bg-white/40 blur-[1px] sm:h-10 sm:w-32"
        animate={reduce ? undefined : { x: [0, -36, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Realistic sun — viewport top-right; clear of language on mobile */}
      <motion.div
        className="absolute right-2 top-14 z-[1] sm:right-4 sm:top-16 lg:right-[46%] lg:top-6 xl:right-[44%]"
        animate={reduce ? undefined : { opacity: [0.92, 1, 0.92] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="relative h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 xl:h-24 xl:w-24">
          <div className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgb(255_220_120_/_0.35)_0%,rgb(251_191_36_/_0.12)_42%,transparent_70%)] blur-sm sm:-inset-8" />
          <div className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgb(255_236_170_/_0.45)_0%,rgb(251_191_36_/_0.18)_50%,transparent_72%)] sm:-inset-4" />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff7d6_0%,#ffe08a_28%,#fbbf24_58%,#f59e0b_78%,rgb(245_158_11_/_0)_100%)] opacity-90 blur-[0.5px]" />
          <div className="absolute inset-[12%] overflow-hidden rounded-full shadow-[0_0_40px_rgb(251_191_36_/_0.55),0_0_80px_rgb(245_158_11_/_0.25)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_28%,#fffbeb_0%,#fde68a_22%,#fbbf24_55%,#f59e0b_82%,#d97706_100%)]" />
            <div className="absolute inset-0 opacity-40 mix-blend-soft-light bg-[radial-gradient(circle_at_70%_65%,rgb(217_119_6_/_0.55)_0%,transparent_45%),radial-gradient(circle_at_40%_75%,rgb(251_191_36_/_0.4)_0%,transparent_40%)]" />
            <div className="absolute left-[18%] top-[14%] h-[28%] w-[34%] rounded-full bg-[radial-gradient(circle,rgb(255_255_255_/_0.85)_0%,rgb(255_255_255_/_0)_70%)]" />
          </div>
        </div>
      </motion.div>

      {/* Shop — compact on mobile (behind form), anchored left on desktop */}
      <div className="absolute inset-x-0 bottom-[22%] flex justify-center opacity-70 sm:bottom-[20%] sm:opacity-80 lg:inset-x-auto lg:bottom-6 lg:left-0 lg:w-[56%] lg:justify-start lg:opacity-100 lg:ps-6 xl:w-[58%] xl:ps-10">
        <svg
          viewBox="0 0 420 320"
          className="h-[min(28vh,160px)] w-auto max-w-[70vw] drop-shadow-[0_20px_40px_rgb(15_23_42_/_0.12)] sm:h-[min(32vh,200px)] sm:max-w-[320px] lg:h-[min(48vh,360px)] lg:max-w-[min(90%,420px)] xl:h-[min(52vh,400px)]"
        >
          <rect x="70" y="110" width="240" height="160" rx="6" fill="#0f766e" />
          <rect x="78" y="118" width="224" height="144" rx="4" fill="#115e59" />

          <motion.g
            animate={reduce ? undefined : { rotate: [-0.6, 0.6, -0.6] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: '190px 110px' }}
          >
            <path d="M55 110 L345 110 L330 148 L70 148 Z" fill="#f59e0b" />
            <path d="M55 110 L345 110 L338 122 L62 122 Z" fill="#fbbf24" />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path
                key={i}
                d={`M${70 + i * 38} 122 L${88 + i * 38} 148 L${70 + i * 38} 148 Z`}
                fill={i % 2 === 0 ? '#0f766e' : '#f59e0b'}
                opacity="0.9"
              />
            ))}
          </motion.g>

          <rect x="120" y="78" width="140" height="36" rx="4" fill="#134e4a" />
          <rect x="126" y="84" width="128" height="24" rx="2" fill="#f8fafc" />
          <text
            x="190"
            y="101"
            textAnchor="middle"
            fill="#0f766e"
            fontSize="13"
            fontWeight="700"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            STORE
          </text>

          <rect x="155" y="175" width="70" height="95" rx="3" fill="#042f2e" />
          <rect x="162" y="182" width="56" height="40" rx="2" fill="#5eead4" opacity="0.35" />
          <circle cx="215" cy="230" r="3.5" fill="#fbbf24" />

          <rect x="95" y="175" width="48" height="48" rx="3" fill="#042f2e" />
          <rect x="100" y="180" width="38" height="38" rx="2" fill="#99f6e4" opacity="0.45" />
          <line x1="119" y1="180" x2="119" y2="218" stroke="#0f766e" strokeWidth="2" />
          <line x1="100" y1="199" x2="138" y2="199" stroke="#0f766e" strokeWidth="2" />

          <rect x="237" y="175" width="48" height="48" rx="3" fill="#042f2e" />
          <rect x="242" y="180" width="38" height="38" rx="2" fill="#99f6e4" opacity="0.45" />
          <line x1="261" y1="180" x2="261" y2="218" stroke="#0f766e" strokeWidth="2" />
          <line x1="242" y1="199" x2="280" y2="199" stroke="#0f766e" strokeWidth="2" />

          <rect x="104" y="208" width="12" height="6" rx="1" fill="#f59e0b" opacity="0.8" />
          <rect x="120" y="208" width="12" height="6" rx="1" fill="#14b8a6" opacity="0.8" />
          <rect x="246" y="208" width="12" height="6" rx="1" fill="#dc2626" opacity="0.7" />
          <rect x="262" y="208" width="12" height="6" rx="1" fill="#fbbf24" opacity="0.8" />

          <rect x="88" y="248" width="36" height="22" rx="2" fill="#d97706" />
          <rect x="92" y="242" width="28" height="10" rx="2" fill="#f59e0b" />
          <circle cx="100" cy="246" r="4" fill="#ef4444" />
          <circle cx="110" cy="245" r="4.5" fill="#f97316" />
          <circle cx="118" cy="247" r="3.5" fill="#eab308" />

          <ellipse cx="280" cy="258" rx="22" ry="14" fill="#e7e5e4" />
          <path d="M258 258 Q280 220 302 258 Z" fill="#d6d3d1" />
          <path d="M268 240 Q280 232 292 240" stroke="#a8a29e" strokeWidth="2" fill="none" />
          <text x="280" y="255" textAnchor="middle" fill="#78716c" fontSize="8" fontWeight="700">
            آٹا
          </text>

          <motion.g animate={drift(3.2, 4)}>
            <ellipse cx="360" cy="250" rx="28" ry="12" fill="rgb(15 23 42 / 0.12)" />
            <rect x="342" y="200" width="36" height="48" rx="14" fill="#0d9488" />
            <circle cx="360" cy="186" r="16" fill="#fcd9b0" />
            <path d="M344 182 Q360 168 376 182" fill="#1c1917" />
            <circle cx="354" cy="186" r="2" fill="#1c1917" />
            <circle cx="366" cy="186" r="2" fill="#1c1917" />
            <path d="M354 194 Q360 198 366 194" stroke="#b45309" strokeWidth="1.5" fill="none" />
            <motion.g
              animate={reduce ? undefined : { rotate: [0, 22, 0, 18, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '378px 210px' }}
            >
              <rect x="372" y="205" width="34" height="10" rx="5" fill="#fcd9b0" />
              <circle cx="408" cy="210" r="7" fill="#fcd9b0" />
            </motion.g>
            <rect x="348" y="244" width="10" height="22" rx="4" fill="#134e4a" />
            <rect x="362" y="244" width="10" height="22" rx="4" fill="#134e4a" />
          </motion.g>

          <motion.g animate={drift(4, 3)}>
            <ellipse cx="140" cy="268" rx="14" ry="8" fill="#78716c" />
            <circle cx="152" cy="262" r="7" fill="#78716c" />
            <polygon points="148,256 150,248 154,256" fill="#78716c" />
            <polygon points="154,256 158,248 160,256" fill="#78716c" />
            <motion.path
              d="M126 268 Q118 258 124 252"
              stroke="#78716c"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              animate={
                reduce
                  ? undefined
                  : {
                      d: [
                        'M126 268 Q118 258 124 252',
                        'M126 268 Q120 250 128 248',
                        'M126 268 Q118 258 124 252',
                      ],
                    }
              }
              transition={{ duration: 2.8, repeat: Infinity }}
            />
          </motion.g>
        </svg>
      </div>

      <FloatingItem className="start-[6%] top-[28%] hidden md:block lg:top-[22%]" delay={0} duration={5.5}>
        <TomatoIcon />
      </FloatingItem>
      <FloatingItem className="start-[38%] top-[20%] hidden lg:block" delay={0.4} duration={6.2}>
        <SpiceJarIcon />
      </FloatingItem>
      <FloatingItem className="start-[12%] top-[48%] hidden lg:block" delay={0.8} duration={5.8}>
        <BottleIcon />
      </FloatingItem>
      <FloatingItem className="start-[42%] bottom-[26%] hidden xl:block" delay={1.1} duration={6.5}>
        <GrainSackIcon />
      </FloatingItem>

      {!reduce && (
        <>
          <div className="auth-beam absolute -start-10 top-0 h-full w-40 rotate-12 bg-gradient-to-b from-white/25 to-transparent" />
          <div className="auth-beam-slow absolute end-[20%] top-0 h-full w-28 -rotate-6 bg-gradient-to-b from-accent-400/15 to-transparent" />
        </>
      )}
    </div>
  )
}

function FloatingItem({
  children,
  className,
  delay,
  duration,
}: {
  children: ReactNode
  className?: string
  delay: number
  duration: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={`absolute ${className ?? ''}`}
      animate={reduce ? undefined : { y: [0, -14, 0], rotate: [-4, 4, -4] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}

function BadgeShell({ children, bg }: { children: ReactNode; bg: string }) {
  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-soft ring-1 ring-white/70 backdrop-blur-sm sm:h-12 sm:w-12"
      style={{ background: bg }}
    >
      {children}
    </div>
  )
}

function TomatoIcon() {
  return (
    <BadgeShell bg="color-mix(in srgb, #dc2626 16%, white)">
      <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
        <circle cx="16" cy="18" r="9" fill="#ef4444" />
        <circle cx="13" cy="15" r="2.5" fill="#fca5a5" opacity="0.7" />
        <path d="M16 8 C14 12 12 12 10 11 C13 12 15 10 16 8 C17 10 19 12 22 11 C20 12 18 12 16 8 Z" fill="#16a34a" />
      </svg>
    </BadgeShell>
  )
}

function SpiceJarIcon() {
  return (
    <BadgeShell bg="color-mix(in srgb, #d97706 16%, white)">
      <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
        <rect x="10" y="8" width="12" height="4" rx="1" fill="#a8a29e" />
        <path d="M11 12 H21 L20 26 H12 Z" fill="#f59e0b" />
        <path d="M12 16 H20" stroke="#fde68a" strokeWidth="1.5" />
        <circle cx="16" cy="21" r="2" fill="#b45309" opacity="0.5" />
      </svg>
    </BadgeShell>
  )
}

function BottleIcon() {
  return (
    <BadgeShell bg="color-mix(in srgb, #0f766e 14%, white)">
      <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
        <rect x="13" y="4" width="6" height="5" rx="1" fill="#134e4a" />
        <path d="M12 9 H20 L22 26 H10 Z" fill="#14b8a6" />
        <rect x="12" y="14" width="8" height="8" rx="1" fill="#ccfbf1" opacity="0.5" />
      </svg>
    </BadgeShell>
  )
}

function GrainSackIcon() {
  return (
    <BadgeShell bg="color-mix(in srgb, #ca8a04 14%, white)">
      <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
        <ellipse cx="16" cy="24" rx="9" ry="5" fill="#d6d3d1" />
        <path d="M7 24 Q16 8 25 24 Z" fill="#e7e5e4" />
        <path d="M11 16 Q16 12 21 16" stroke="#a8a29e" strokeWidth="1.5" fill="none" />
        <circle cx="13" cy="20" r="1.2" fill="#ca8a04" />
        <circle cx="17" cy="22" r="1" fill="#ca8a04" />
        <circle cx="19" cy="19" r="1.1" fill="#ca8a04" />
      </svg>
    </BadgeShell>
  )
}
