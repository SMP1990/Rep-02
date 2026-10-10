// Every word of the Password Generator (tool + its page), English. The other
// 10 languages live next to this file, typed as `Strings`, so TypeScript
// fails if one misses a key. They load only with the tool page.
// Placeholders: {n} number, {t} time.
export const en = {
  title: 'Password Generator',
  subtitle: 'Create strong, random passwords in one click. Free, no sign-up, and never stored.',
  privacy: 'Passwords are made on your device. They are never sent anywhere or saved.',

  yourPassword: 'Your new password',
  copy: 'Copy password',
  copied: 'Copied!',
  regenerate: 'Generate a new password',
  noTypes: 'Choose at least one character type.',

  length: 'Password length',
  characters: 'Characters to use',
  upper: 'Uppercase (A-Z)',
  lower: 'Lowercase (a-z)',
  numbers: 'Numbers (0-9)',
  symbols: 'Symbols (!@#$)',
  moreOptions: 'More options',
  excludeSimilar: 'Avoid look-alike characters (i, l, 1, L, o, 0, O)',
  strict: 'Use every chosen type at least once',
  exclude: 'Characters to leave out',
  excludeHint: 'For example: {}[]"',

  strength: 'Strength',
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
  veryStrong: 'Very strong',
  bits: '{n}-bit entropy',
  crackTime: 'Time to crack: {t}',
  instantly: 'instantly',
  seconds: '{n} seconds',
  minutes: '{n} minutes',
  hours: '{n} hours',
  days: '{n} days',
  years: '{n} years',
  centuries: 'centuries',

  bulkTitle: 'Need several passwords?',
  bulkButton: 'Generate {n} passwords',
  copyAll: 'Copy all',
  copyNumber: 'Copy password {n}',

  howTitle: 'How to create a strong password',
  step1Title: 'Choose the length and characters',
  step1Desc: 'Pick how long the password should be and which characters to use. 16 or more characters with all four types is a good start.',
  step2Title: 'Get your password',
  step2Desc: 'A new random password appears right away, and again every time you change a setting or tap "Generate a new password".',
  step3Title: 'Copy and save it',
  step3Desc: 'Tap "Copy password", paste it where you need it, and keep it in a password manager.',
  faqTitle: 'Frequently asked questions',
  faq1Q: 'Is this password generator safe?',
  faq1A: 'Yes. Passwords are made in your browser with its built-in secure random number generator (Web Crypto). They are never sent to our server, saved, or logged.',
  faq2Q: 'How long should my password be?',
  faq2A: 'Use at least 12 characters, better 16 or more. For email, banking and other important accounts, 20 or more is a good choice.',
  faq3Q: 'What makes a password strong?',
  faq3A: 'Length and randomness. A long password mixing uppercase and lowercase letters, numbers and symbols is very hard to guess. Use a different password for every account.',
  faq4Q: 'Why avoid look-alike characters?',
  faq4A: 'Characters like l, 1 and I or O and 0 are easy to mix up. Leaving them out helps when you have to read or type the password by hand.',
  faq5Q: 'How should I keep my passwords?',
  faq5A: 'Save them in a password manager instead of a note or a file, and turn on two-step verification wherever you can.',
};

export type Strings = typeof en;

/** Replaces {key} placeholders, like the site's fill() helper. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
