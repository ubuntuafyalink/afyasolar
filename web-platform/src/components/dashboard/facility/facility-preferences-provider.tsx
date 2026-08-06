"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  DEFAULT_LOCALE,
  translate,
  type Locale,
} from "@/lib/i18n/dictionaries"

/**
 * Facility-scoped UI preferences: language (EN/SW) and accessibility (high
 * contrast, larger text). This is an ADDITIVE layer existing sections that
 * don't call these hooks are unaffected, and the hooks return safe defaults if
 * a component renders outside the provider, so nothing can crash.
 *
 * Preferences persist to localStorage so a facility user's choice survives
 * reloads and offline use. Accessibility flags are applied as classes on
 * <html> and consumed by globals.css.
 */

const LOCALE_KEY = "afya.facility.locale"
const HC_KEY = "afya.facility.highContrast"
const LT_KEY = "afya.facility.largeText"
const DF_KEY = "afya.facility.dyslexiaFont"
const CB_KEY = "afya.facility.colorBlindSafe"

const HC_CLASS = "a11y-high-contrast"
const LT_CLASS = "a11y-large-text"
const DF_CLASS = "a11y-dyslexia-friendly"
const CB_CLASS = "a11y-colorblind"

export interface FacilityPreferences {
  locale: Locale
  setLocale: (l: Locale) => void
  highContrast: boolean
  setHighContrast: (v: boolean) => void
  largeText: boolean
  setLargeText: (v: boolean) => void
  dyslexiaFont: boolean
  setDyslexiaFont: (v: boolean) => void
  colorBlindSafe: boolean
  setColorBlindSafe: (v: boolean) => void
  reset: () => void
  /** Translate a dotted key with optional `{var}` interpolation. */
  t: (key: string, vars?: Record<string, string | number>) => string
}

const defaultValue: FacilityPreferences = {
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  highContrast: false,
  setHighContrast: () => {},
  largeText: false,
  setLargeText: () => {},
  dyslexiaFont: false,
  setDyslexiaFont: () => {},
  colorBlindSafe: false,
  setColorBlindSafe: () => {},
  reset: () => {},
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
}

const FacilityPreferencesContext = createContext<FacilityPreferences>(defaultValue)

function readBool(key: string): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(key) === "1"
}

function applyDocClass(cls: string, on: boolean) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle(cls, on)
}

export function FacilityPreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [highContrast, setHighContrastState] = useState(false)
  const [largeText, setLargeTextState] = useState(false)
  const [dyslexiaFont, setDyslexiaFontState] = useState(false)
  const [colorBlindSafe, setColorBlindSafeState] = useState(false)

  // Hydrate from localStorage after mount. State starts at the SSR defaults so
  // the first client render matches the server (no hydration mismatch); this
  // one-time sync then applies the user's saved choice. The cascading-render
  // warning is expected and acceptable for this read-once hydration.
  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_KEY)
    const hc = readBool(HC_KEY)
    const lt = readBool(LT_KEY)
    const df = readBool(DF_KEY)
    const cb = readBool(CB_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage hydration
    if (storedLocale === "en" || storedLocale === "sw") setLocaleState(storedLocale)
    setHighContrastState(hc)
    setLargeTextState(lt)
    setDyslexiaFontState(df)
    setColorBlindSafeState(cb)
    applyDocClass(HC_CLASS, hc)
    applyDocClass(LT_CLASS, lt)
    applyDocClass(DF_CLASS, df)
    applyDocClass(CB_CLASS, cb)
    if (storedLocale === "en" || storedLocale === "sw") document.documentElement.lang = storedLocale
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_KEY, l)
      document.documentElement.lang = l
    }
  }, [])

  const setHighContrast = useCallback((v: boolean) => {
    setHighContrastState(v)
    if (typeof window !== "undefined") window.localStorage.setItem(HC_KEY, v ? "1" : "0")
    applyDocClass(HC_CLASS, v)
  }, [])

  const setLargeText = useCallback((v: boolean) => {
    setLargeTextState(v)
    if (typeof window !== "undefined") window.localStorage.setItem(LT_KEY, v ? "1" : "0")
    applyDocClass(LT_CLASS, v)
  }, [])

  const setDyslexiaFont = useCallback((v: boolean) => {
    setDyslexiaFontState(v)
    if (typeof window !== "undefined") window.localStorage.setItem(DF_KEY, v ? "1" : "0")
    applyDocClass(DF_CLASS, v)
  }, [])

  const setColorBlindSafe = useCallback((v: boolean) => {
    setColorBlindSafeState(v)
    if (typeof window !== "undefined") window.localStorage.setItem(CB_KEY, v ? "1" : "0")
    applyDocClass(CB_CLASS, v)
  }, [])

  const reset = useCallback(() => {
    setLocale(DEFAULT_LOCALE)
    setHighContrast(false)
    setLargeText(false)
    setDyslexiaFont(false)
    setColorBlindSafe(false)
  }, [setLocale, setHighContrast, setLargeText, setDyslexiaFont, setColorBlindSafe])

  const value = useMemo<FacilityPreferences>(
    () => ({
      locale,
      setLocale,
      highContrast,
      setHighContrast,
      largeText,
      setLargeText,
      dyslexiaFont,
      setDyslexiaFont,
      colorBlindSafe,
      setColorBlindSafe,
      reset,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [
      locale,
      highContrast,
      largeText,
      dyslexiaFont,
      colorBlindSafe,
      setLocale,
      setHighContrast,
      setLargeText,
      setDyslexiaFont,
      setColorBlindSafe,
      reset,
    ],
  )

  return (
    <FacilityPreferencesContext.Provider value={value}>
      {children}
    </FacilityPreferencesContext.Provider>
  )
}

/** Access (and mutate) facility UI preferences. Safe outside the provider. */
export function useFacilityPreferences(): FacilityPreferences {
  return useContext(FacilityPreferencesContext)
}

/** Convenience hook: just the translator bound to the current locale. */
export function useT() {
  return useContext(FacilityPreferencesContext).t
}
