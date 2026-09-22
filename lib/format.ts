// Shared formatting helpers — one place for how Soko writes money and dates.

export function naira(n: number | null | undefined): string {
  if (n == null) return '—'
  return '₦' + Math.round(n).toLocaleString()
}

export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

/** "10:42" for today, "15 Sep" for anything older — the ledger margin format. */
export function whenLabel(dateStr: string): string {
  const d = new Date(dateStr)
  if (isSameDay(d, new Date())) {
    return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

export function plural(n: number, word: string, pluralWord = word + 's'): string {
  return `${n} ${n === 1 ? word : pluralWord}`
}

export function initialOf(name: string | undefined | null): string {
  const t = (name || '').trim()
  return t ? t[0].toUpperCase() : '?'
}
