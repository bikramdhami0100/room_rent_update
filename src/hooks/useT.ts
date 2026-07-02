import { useTranslations } from "@/lib/i18n"
import { useLocale } from "@/components/ui/locale-provider"

export function useT() {
  const { locale } = useLocale()
  return useTranslations(locale)
}
