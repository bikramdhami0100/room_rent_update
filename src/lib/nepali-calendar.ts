import NDC from "@remotemerge/nepali-date-converter"

const NEPALI_MONTHS = [
  "Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
]

const NEPALI_MONTHS_NP = [
  "बैशाख", "जेठ", "असार", "श्रावण", "भाद्र", "आश्विन",
  "कार्तिक", "मंसिर", "पौष", "माघ", "फाल्गुन", "चैत्र",
]

export interface BsDate {
  year: number
  month: number
  date: number
  day: string
}

export function adToBs(year: number, month: number, day: number): BsDate | null {
  try {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const conv = new NDC(dateStr)
    return conv.toBs() as BsDate
  } catch {
    return null
  }
}

export function bsToAd(year: number, month: number, day: number): { year: number; month: number; date: number } | null {
  try {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const conv = new NDC(dateStr)
    return conv.toAd() as { year: number; month: number; date: number }
  } catch {
    return null
  }
}

export function getNepaliMonthName(month: number, nepali = false): string {
  if (month < 1 || month > 12) return ""
  return nepali ? NEPALI_MONTHS_NP[month - 1] : NEPALI_MONTHS[month - 1]
}

export function formatBsDate(year: number, month: number, day: number, nepali = false): string {
  const mName = getNepaliMonthName(month, nepali)
  return `${mName} ${day}, ${year}`
}

export function dateToBs(date: Date): BsDate | null {
  return adToBs(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function getCurrentBsDate(): BsDate | null {
  return dateToBs(new Date())
}

export { NEPALI_MONTHS, NEPALI_MONTHS_NP }
