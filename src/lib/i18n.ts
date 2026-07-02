import en from "@/locales/en.json"
import np from "@/locales/np.json"

export type Locale = "en" | "np"

const messages: Record<Locale, Record<string, unknown>> = { en, np }

export function getMessages(locale: Locale) {
  return messages[locale] || messages.en
}

export function useTranslations(locale: Locale) {
  const msgs = getMessages(locale)

  function t(key: string): string {
    const parts = key.split(".")
    let value: unknown = msgs
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[part]
      } else {
        return key
      }
    }
    return typeof value === "string" ? value : key
  }

  return { t, locale }
}

export function getCookieLocale(cookies?: string): Locale {
  if (!cookies) return "en"
  const match = cookies.match(/NEXT_LOCALE=([a-z]+)/)
  if (match && (match[1] === "en" || match[1] === "np")) return match[1] as Locale
  return "en"
}
