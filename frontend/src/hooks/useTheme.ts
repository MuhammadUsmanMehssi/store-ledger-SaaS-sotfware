import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const KEY = 'gs_theme'

function getInitial(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    /* ignore */
  }
  return 'light'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  )

  return { theme, setTheme, toggleTheme }
}
