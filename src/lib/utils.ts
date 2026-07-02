import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(price)
}

export function calculateCommission(rent: number): number {
  return Math.round(rent * 0.005)
}

const LANDLORD_SHARE_PERCENT = 25

export function calculateLandlordShare(studentCommission: number): number {
  return Math.round(studentCommission * LANDLORD_SHARE_PERCENT / 100)
}

export function getDeadlineDate(days: number = 3): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

export function isOverdue(deadline: Date): boolean {
  return new Date() > deadline
}

export function getDaysRemaining(deadline: Date): number {
  const diff = deadline.getTime() - new Date().getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
