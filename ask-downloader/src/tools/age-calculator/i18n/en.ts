// Every word of the Age Calculator (tool + its page), English. The other
// 10 languages live next to this file, typed as `Strings`, so TypeScript
// fails if one misses a key. They load only with the tool page.
// Placeholders: {n} number, {min} / {max} years.
export const en = {
  title: 'Age Calculator',
  subtitle: 'Find your exact age in years, months and days, and count down to your next birthday. Free, no sign-up.',
  privacy: 'Everything is calculated on your device. Your dates are never sent anywhere or saved.',

  birthLabel: 'Date of birth',
  targetLabel: 'Age on this date',
  targetHint: 'Today is filled in. Change it to see your age on any other date.',
  today: 'Today',
  calculate: 'Calculate age',
  clear: 'Clear',

  errRequired: 'Please enter your date of birth.',
  errInvalid: 'Please enter a valid date.',
  errRange: 'Please choose dates between the years {min} and {max}.',
  errFutureBirth: 'The date of birth cannot be in the future.',
  errTargetBefore: 'The "Age on this date" must be on or after the date of birth.',

  resultTitle: 'Your age',
  years: 'Years',
  months: 'Months',
  days: 'Days',
  bornOn: 'Day you were born',
  totalsTitle: 'Your age in total',
  totalMonths: 'Months',
  totalWeeks: 'Weeks',
  totalDays: 'Days',
  totalHours: 'Hours (approx.)',

  nextTitle: 'Next birthday',
  nextDate: 'Date',
  turns: 'Age on that day',
  daysLeft: 'Days to go',
  happyBirthday: 'Happy birthday! You turn {n} today.',
  leapNote: 'Born on 29 February? In years without that date, your birthday is counted on 28 February.',

  moreTools: 'More free tools',

  howTitle: 'How to calculate your age',
  step1Title: 'Enter your date of birth',
  step1Desc: 'Pick the day, month and year you were born. On a phone, your device opens its own date picker.',
  step2Title: 'Choose a date (optional)',
  step2Desc: 'Today is used by default. Change it to see how old you were, or will be, on any other date.',
  step3Title: 'See your age',
  step3Desc: 'Your age appears in years, months and days, with totals and a countdown to your next birthday.',
  faqTitle: 'Frequently asked questions',
  faq1Q: 'How is my age calculated?',
  faq1A: 'The calculator counts the whole years and months from your date of birth to the chosen date, then the days left over. It follows the real calendar, including leap years and months of different lengths.',
  faq2Q: 'I was born on 29 February. When is my birthday?',
  faq2A: 'In leap years it is on 29 February. In other years this calculator counts it on 28 February, as most age calculators do. Some countries use 1 March for legal purposes.',
  faq3Q: 'Can I find my age on a past or future date?',
  faq3A: 'Yes. Change the "Age on this date" field to any date after your date of birth, for example the date of an exam, a job application or a retirement plan.',
  faq4Q: 'How are months of different lengths handled?',
  faq4A: 'A month is counted from a day to the same day of the next month. When that day does not exist, such as 31 February, the last day of the month is used instead.',
  faq5Q: 'Is my date of birth saved?',
  faq5A: 'No. The age is calculated in your browser. Your dates are never sent to our server, saved or logged.',
};

export type Strings = typeof en;

/** Replaces {key} placeholders, like the site's fill() helper. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
