/**
 * Groups Media Library files as Year -> Month -> Date ("2026 -> October -> 03"),
 * newest first, by the date each file was uploaded (in the admin's own time zone).
 */
export interface DayGroup<T> { key: string; label: string; items: T[] }
export interface MonthGroup<T> { key: string; label: string; count: number; days: DayGroup<T>[] }
export interface YearGroup<T> { year: string; count: number; months: MonthGroup<T>[] }

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-03" in local time; '' if the date can't be read. */
export function localDay(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Newest first, or oldest first with `ascending`. */
export function groupByDate<T extends { uploadedAt: string }>(items: T[], ascending = false): YearGroup<T>[] {
  const years = new Map<string, Map<string, Map<string, T[]>>>();
  for (const it of items) {
    const day = localDay(it.uploadedAt) || '0000-00-00';
    const [y, m] = day.split('-');
    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y)!;
    const mk = `${y}-${m}`;
    if (!months.has(mk)) months.set(mk, new Map());
    const days = months.get(mk)!;
    days.set(day, [...(days.get(day) || []), it]);
  }
  const order = (a: string, b: string) => (ascending ? a.localeCompare(b) : b.localeCompare(a));
  return [...years.keys()].sort(order).map((year) => {
    const months = [...years.get(year)!.entries()].sort((a, b) => order(a[0], b[0])).map(([mk, days]) => {
      const dayGroups = [...days.entries()].sort((a, b) => order(a[0], b[0])).map(([key, list]) => {
        const d = new Date(`${key}T12:00:00`);
        const label = isNaN(d.getTime()) ? 'Unknown date' : `${pad(d.getDate())} · ${d.toLocaleDateString('en', { weekday: 'long' })}`;
        return { key, label, items: list };
      });
      const md = new Date(`${mk}-01T12:00:00`);
      return {
        key: mk,
        label: isNaN(md.getTime()) ? 'Unknown month' : md.toLocaleDateString('en', { month: 'long' }),
        count: dayGroups.reduce((n, g) => n + g.items.length, 0),
        days: dayGroups,
      };
    });
    return { year: year === '0000' ? 'Unknown' : year, count: months.reduce((n, m) => n + m.count, 0), months };
  });
}
