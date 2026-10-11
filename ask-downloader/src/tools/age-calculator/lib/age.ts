// Age arithmetic in the browser. Pure functions, no dependencies.
//
// Dates are plain calendar days (year, month 1-12, day), counted in UTC so a
// time zone or daylight-saving change can never shift a result by a day.
//
// The age is the number of whole months from the birth date to the target
// date, plus the days left over. Adding months keeps the birth day of the
// month, or the last day of the month when that day does not exist (31 Jan
// + 1 month = 28/29 Feb). So someone born on 29 February has their birthday
// on 28 February in years without that date, like most age calculators.

export interface Ymd {
  y: number;
  m: number;
  d: number;
}

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;
const DAY_MS = 86_400_000;

export const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Days in a month (m = 1-12). */
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Days since 1970-01-01, for differences and comparisons. */
export const dayNumber = (a: Ymd) => Date.UTC(a.y, a.m - 1, a.d) / DAY_MS;

export const compare = (a: Ymd, b: Ymd) => dayNumber(a) - dayNumber(b);

/** "YYYY-MM-DD" (the value of <input type="date">) to a date, or null. */
export function parseDate(value: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const a = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  if (a.m < 1 || a.m > 12 || a.d < 1 || a.d > daysInMonth(a.y, a.m)) return null;
  return a;
}

export const formatDate = (a: Ymd) =>
  `${String(a.y).padStart(4, '0')}-${String(a.m).padStart(2, '0')}-${String(a.d).padStart(2, '0')}`;

/** Today on the visitor's own calendar (not UTC). */
export function today(now = new Date()): Ymd {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

/** The date `n` months after `a`, kept on the last day of a shorter month. */
export function addMonths(a: Ymd, n: number): Ymd {
  const index = a.y * 12 + (a.m - 1) + n;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return { y, m, d: Math.min(a.d, daysInMonth(y, m)) };
}

export interface Span {
  years: number;
  months: number;
  days: number;
  /** All whole months (years * 12 + months). */
  totalMonths: number;
  /** Calendar days between the two dates. */
  totalDays: number;
}

/** Whole years, months and days from `from` to `to` (to >= from). */
export function between(from: Ymd, to: Ymd): Span {
  let totalMonths = (to.y - from.y) * 12 + (to.m - from.m);
  if (compare(addMonths(from, totalMonths), to) > 0) totalMonths -= 1;
  const days = dayNumber(to) - dayNumber(addMonths(from, totalMonths));
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days,
    totalMonths,
    totalDays: dayNumber(to) - dayNumber(from),
  };
}

/** The first birthday on or after `on`. */
export function nextBirthday(birth: Ymd, on: Ymd): Ymd {
  const inYear = (y: number) => ({ y, m: birth.m, d: Math.min(birth.d, daysInMonth(y, birth.m)) });
  const thisYear = inYear(on.y);
  return compare(thisYear, on) >= 0 ? thisYear : inYear(on.y + 1);
}

export type AgeError = 'required' | 'invalid' | 'range' | 'futureBirth' | 'targetBefore';

export interface AgeResult {
  age: Span;
  /** 0 = Sunday ... 6 = Saturday. */
  birthWeekday: number;
  next: {
    date: Ymd;
    /** Time left until it (0 days when the birthday is on the target date). */
    left: Span;
    /** The age the person turns on that birthday. */
    turns: number;
    isToday: boolean;
  };
}

const inRange = (a: Ymd) => a.y >= MIN_YEAR && a.y <= MAX_YEAR;

/**
 * Everything the tool shows, from the two input values. An empty target means
 * today. Returns an error code instead when the input can't be used.
 */
export function calculate(birthValue: string, targetValue: string, now: Ymd): AgeResult | { error: AgeError } {
  if (!String(birthValue || '').trim()) return { error: 'required' };
  const birth = parseDate(birthValue);
  const target = String(targetValue || '').trim() ? parseDate(targetValue) : now;
  if (!birth || !target) return { error: 'invalid' };
  if (!inRange(birth) || !inRange(target)) return { error: 'range' };
  if (compare(birth, target) > 0) {
    // With the target left at today, the birth date itself is the problem.
    return { error: compare(target, now) === 0 ? 'futureBirth' : 'targetBefore' };
  }

  const age = between(birth, target);
  let date = nextBirthday(birth, target);
  // Born on the target date itself: the first birthday is a year later.
  if (date.y === birth.y) date = nextBirthday(birth, { y: birth.y + 1, m: 1, d: 1 });
  const isToday = compare(date, target) === 0;
  return {
    age,
    birthWeekday: new Date(dayNumber(birth) * DAY_MS).getUTCDay(),
    next: {
      date,
      left: between(target, date),
      turns: date.y - birth.y,
      isToday,
    },
  };
}
