// The Grade Calculator's maths, with no React: score, percentage, letter
// grade and the full grading chart. Grade % = (correct / total) × 100.

export type Scale = 'standard' | 'ten';
export type Mode = 'questions' | 'points';

/** Highest total a test can have (questions or points). */
export const MAX_TOTAL = 500;

/** Lowest percentage for each letter, best first. Below the last one is F. */
const SCALES: Record<Scale, [number, string][]> = {
  standard: [
    [97, 'A+'], [93, 'A'], [90, 'A-'],
    [87, 'B+'], [83, 'B'], [80, 'B-'],
    [77, 'C+'], [73, 'C'], [70, 'C-'],
    [67, 'D+'], [63, 'D'], [60, 'D-'],
  ],
  ten: [[90, 'A'], [80, 'B'], [70, 'C'], [60, 'D']],
};

/** The letter for a percentage. The exact value is compared, so 89.5% is
 * still a B+ even if it is shown rounded as 90%. */
export function letterGrade(percent: number, scale: Scale): string {
  // 0.29 × 100 is 28.999999999999996 in floating point; trim that noise.
  const p = Math.round(percent * 1e6) / 1e6;
  for (const [min, letter] of SCALES[scale]) if (p >= min) return letter;
  return 'F';
}

/** The letter ranges of a scale, for the reference table: [letter, from, to]. */
export function scaleRanges(scale: Scale): [string, number, number][] {
  const rows = SCALES[scale];
  return [
    ...rows.map(([min, letter], i): [string, number, number] => [letter, min, i === 0 ? 100 : rows[i - 1][0] - 1]),
    ['F', 0, rows[rows.length - 1][0] - 1],
  ];
}

export interface Result {
  wrong: number;
  score: number;
  percent: number;
  letter: string;
}

export function grade(total: number, wrong: number, scale: Scale): Result {
  const score = total - wrong;
  const percent = total > 0 ? (score / total) * 100 : 0;
  return { wrong, score, percent, letter: letterGrade(percent, scale) };
}

/** Every possible result for this test: 0 wrong, then one step more, up to all wrong. */
export function chart(total: number, step: number, scale: Scale): Result[] {
  const rows: Result[] = [];
  const count = Math.round(total / step);
  for (let i = 0; i <= count; i++) rows.push(grade(total, i * step, scale));
  return rows;
}

/** Keeps a typed number usable: a whole total between 1 and MAX_TOTAL. */
export function cleanTotal(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_TOTAL, Math.max(1, Math.round(value)));
}

/** Wrong answers between 0 and the total, in whole or half steps. */
export function cleanWrong(value: number, total: number, step: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(total, Math.round(value / step) * step);
}

/** Letter → colour group for the result box and the chart. */
export function band(letter: string): 'a' | 'b' | 'c' | 'd' | 'f' {
  return (letter[0].toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'f');
}
