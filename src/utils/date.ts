const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function monthKeyOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function dayOfMonth(dateISO: string): number {
  return Number(dateISO.slice(8, 10));
}

export function formatDateLabel(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export function dayHeading(dateISO: string): string {
  const prefix = dateISO === todayISO() ? 'TODAY · ' : '';
  return `${prefix}${formatDateLabel(dateISO).toUpperCase()}`;
}

export function monthLabel(monthKey: string = currentMonthKey()): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES[m - 1].toUpperCase()} ${y}`;
}

function parseISODate(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday-start ISO week containing the given date. */
export function startOfWeekISO(dateISO: string): string {
  const date = parseISODate(dateISO);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return toISODate(date);
}

export function endOfWeekISO(dateISO: string): string {
  const date = parseISODate(startOfWeekISO(dateISO));
  date.setDate(date.getDate() + 6);
  return toISODate(date);
}
