import { createContext, useContext, useState, useCallback } from 'react'
import { createT, SUPPORTED_LANGUAGES } from '../i18n/translations'

const LS_KEY = 'smartmandi_lang'
const DEFAULT_LANG = 'hi'

const LanguageContext = createContext(null)

/**
 * LanguageProvider — wraps the app and provides language state.
 *
 * Language precedence:
 *   1. localStorage (persisted user choice)
 *   2. DEFAULT_LANG ('hi')
 *
 * Integration with user profile preferredLanguage is handled by
 * the profile pages — they call setLanguage when the user explicitly
 * saves their profile preference. We do NOT auto-sync on every render.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored
    } catch { /* ignore */ }
    return DEFAULT_LANG
  })

  const setLanguage = useCallback((code) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === code)) return
    setLanguageState(code)
    try { localStorage.setItem(LS_KEY, code) } catch { /* ignore */ }
  }, [])

  // Recompute t() whenever language changes
  const t = useCallback(createT(language), [language])

  // Expose a BCP-47 locale code for Web Speech APIs
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, locale, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}

export default LanguageContext
