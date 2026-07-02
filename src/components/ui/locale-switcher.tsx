"use client"

import { useCallback } from "react"
import { Languages } from "lucide-react"
import { Button } from "./button"
import type { Locale } from "@/lib/i18n"

export function LocaleSwitcher({ locale, onChange }: { locale: Locale; onChange: (l: Locale) => void }) {
  const toggle = useCallback(() => {
    const next = locale === "en" ? "np" : "en"
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`
    onChange(next)
    window.location.reload()
  }, [locale, onChange])

  return (
    <Button variant="ghost" size="sm" onClick={toggle}>
      <Languages className="mr-1 h-4 w-4" />
      {locale === "en" ? "नेपाली" : "English"}
    </Button>
  )
}
