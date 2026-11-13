// Pure month-navigation state for the Ledger screen (no DB / UI dependencies).
// Months are 'YYYY-MM' strings, same format as budgetStatus / getMonthlySummary.

const parse = m => m.split('-').map(Number)
const fmt = (y, mo) => `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}`

// Shift by `delta` months; rolls over the year (Jan <-> Dec) correctly.
export function shiftMonth(month, delta) {
  const [y, mo] = parse(month)
  const idx = y * 12 + (mo - 1) + delta
  return fmt(Math.floor(idx / 12), (idx % 12) + 1)
}

export const prevMonth = month => shiftMonth(month, -1)
// Never goes past `current` (the real current month).
export const nextMonth = (month, current) => (month < current ? shiftMonth(month, 1) : month)
export const canGoNext = (month, current) => month < current

// Month-year label in the app locale (id-ID), e.g. '2026-11' -> 'November 2026'.
export function formatMonthLabel(month, locale = 'id-ID') {
  const [y, mo] = parse(month)
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, mo - 1, 1)))
}

// Insights screen: create ONE nav at screen level and share it with both tabs
// (Stats/Budget), so the selected month survives tab switches.
// `current` is the real current month ('YYYY-MM'); next is blocked once selected reaches it.
export function createMonthNav(current, selected = current) {
  let month = selected > current ? current : selected
  return {
    get month() { return month },
    get canGoNext() { return month < current },
    prev() { month = shiftMonth(month, -1); return month },
    next() { if (month < current) month = shiftMonth(month, 1); return month },
  }
}
