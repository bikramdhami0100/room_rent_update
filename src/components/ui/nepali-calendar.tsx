"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { adToBs, bsToAd, getNepaliMonthName, formatBsDate } from "@/lib/nepali-calendar"

interface NepaliCalendarProps {
  value?: Date
  onChange?: (adDate: Date, bsString: string) => void
  minDate?: Date
  maxDate?: Date
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function NepaliCalendar({ value, onChange, minDate, maxDate }: NepaliCalendarProps) {
  const [viewBsYear, setViewBsYear] = useState<number>(2080)
  const [viewBsMonth, setViewBsMonth] = useState<number>(1)

  const today = useMemo(
    () => adToBs(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
    []
  )

  const selectedBs = useMemo(() => {
    if (!value) return today || { year: 2080, month: 1, date: 1, day: "" }
    return adToBs(value.getFullYear(), value.getMonth() + 1, value.getDate()) || today || { year: 2080, month: 1, date: 1, day: "" }
  }, [value, today])

  function handlePrevMonth() {
    if (viewBsMonth === 1) { setViewBsYear(y => y - 1); setViewBsMonth(12) }
    else setViewBsMonth(m => m - 1)
  }

  function handleNextMonth() {
    if (viewBsMonth === 12) { setViewBsYear(y => y + 1); setViewBsMonth(1) }
    else setViewBsMonth(m => m + 1)
  }

  function handleDateClick(day: number) {
    const ad = bsToAd(viewBsYear, viewBsMonth, day)
    if (!ad) return
    const d = new Date(ad.year, ad.month - 1, ad.date)
    if (minDate && d < minDate) return
    if (maxDate && d > maxDate) return
    const bsStr = `${viewBsYear} ${getNepaliMonthName(viewBsMonth)} ${day}`
    onChange?.(d, bsStr)
  }

  const days = useMemo(() => {
    const result: (number | null)[] = []
    const firstAd = bsToAd(viewBsYear, viewBsMonth, 1)
    if (!firstAd) return result
    const firstDay = new Date(firstAd.year, firstAd.month - 1, firstAd.date).getDay()

    for (let i = 0; i < firstDay; i++) result.push(null)

    let bsDay = 1
    while (true) {
      const ad = bsToAd(viewBsYear, viewBsMonth, bsDay)
      if (!ad) break
      result.push(bsDay)
      bsDay++
    }
    return result
  }, [viewBsYear, viewBsMonth])

  return (
    <div className="w-full rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-xs text-muted-foreground">
          <Calendar className="mr-1 inline h-3.5 w-3.5" />
          Bikram Sambat
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePrevMonth} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-semibold">
            {getNepaliMonthName(viewBsMonth)} {viewBsYear}
          </span>
          <button type="button" onClick={handleNextMonth} className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-0.5">
          {DAYS.map(d => (
            <div key={d} className="py-1.5 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {days.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} />
            const sel = selectedBs.year === viewBsYear && selectedBs.month === viewBsMonth && selectedBs.date === day
            const isToday = today?.year === viewBsYear && today?.month === viewBsMonth && today?.date === day
            return (
              <button
                key={`d-${day}`}
                type="button"
                onClick={() => handleDateClick(day)}
                className={`relative rounded-lg py-1.5 text-center text-sm transition-colors hover:bg-secondary ${
                  sel ? "bg-primary text-primary-foreground hover:bg-primary" : ""
                } ${isToday && !sel ? "ring-1 ring-primary" : ""}`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {value && (
        <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
          Selected: {formatBsDate(selectedBs.year, selectedBs.month, selectedBs.date)} BS
          <span className="ml-1">({value.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} AD)</span>
        </div>
      )}
    </div>
  )
}

export function NepaliDateDisplay({ date }: { date: Date }) {
  const bs = useMemo(() => adToBs(date.getFullYear(), date.getMonth() + 1, date.getDate()), [date])
  if (!bs) return <span>{date.toLocaleDateString()}</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-medium">{formatBsDate(bs.year, bs.month, bs.date)} BS</span>
      <span className="text-xs text-muted-foreground">
        ({date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} AD)
      </span>
    </span>
  )
}
