// Debt rules shared by the Debts tab, the dashboard, and the debt sheets.
import type { Debt } from '@/types'
import { daysSince } from './format'

const DAY = 86400000

/** Debts with no due date fall back to "older than a week". */
export const DEFAULT_TERMS_DAYS = 7

export function balanceOf(d: Debt): number {
  return d.amount - d.amount_paid
}

export function isPartial(d: Debt): boolean {
  return d.amount_paid > 0 && d.amount_paid < d.amount
}

/** Days until the due date — negative once it has passed. */
export function daysUntilDue(d: Debt): number | null {
  if (!d.due_date) return null
  // `due_date` is a plain date column; compare it against local midnight so
  // "due today" stays today until the day actually ends.
  const due = new Date(d.due_date + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / DAY)
}

export function isOverdue(d: Debt): boolean {
  if (d.paid) return false
  const left = daysUntilDue(d)
  if (left != null) return left < 0
  return daysSince(d.created_at) > DEFAULT_TERMS_DAYS
}

export function statusOf(d: Debt): { label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' } {
  if (d.paid) return { label: 'Paid', tone: 'good' }
  if (isPartial(d)) return { label: 'Partial', tone: 'warn' }
  if (isOverdue(d)) return { label: 'Overdue', tone: 'bad' }
  return { label: 'Pending', tone: 'neutral' }
}

/** "due today", "due in 3 days", "4 days late", or null when no date was set. */
export function dueLabel(d: Debt): string | null {
  const left = daysUntilDue(d)
  if (left == null) return null
  if (left === 0) return 'due today'
  if (left === 1) return 'due tomorrow'
  if (left > 1) return `due in ${left} days`
  if (left === -1) return '1 day late'
  return `${-left} days late`
}

/** ISO date (YYYY-MM-DD) `days` from today, for the `due_date` column. */
export function dueDateFromDays(days: number): string {
  const d = new Date(); d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Nigerian numbers: "0801…" → "234801…". */
export function toWaNumber(phone: string): string {
  const raw = (phone || '').replace(/\D/g, '')
  return raw.startsWith('0') ? '234' + raw.slice(1) : raw
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${toWaNumber(phone)}?text=${encodeURIComponent(message)}`
}
