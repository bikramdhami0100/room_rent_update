"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import type { Locale } from "@/lib/i18n"

interface LocaleContextType {
  locale: Locale
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
})

export function useLocale() {
  return useContext(LocaleContext)
}

function getInitialLocale(): Locale {
  if (typeof document === "undefined") return "en"
  const match = document.cookie.match(/NEXT_LOCALE=([a-z]+)/)
  if (match && (match[1] === "en" || match[1] === "np")) return match[1] as Locale
  return "en"
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    setLocaleState(getInitialLocale())
  }, [])

  function setLocale(l: Locale) {
    document.cookie = `NEXT_LOCALE=${l};path=/;max-age=31536000`
    setLocaleState(l)
    window.location.reload()
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}
