// Every word of the Word Counter (tool + its page), English. The other
// 10 languages live next to this file, typed as `Strings`, so TypeScript
// fails if one misses a key. They load only with the tool page.
// Placeholders: {n} number, {m} minutes, {s} seconds.
export const en = {
  title: 'Word Counter',
  subtitle: 'Count words, characters, sentences and paragraphs as you type, and see the reading time. Free, no sign-up.',
  privacy: 'Your text stays on your device. It is never sent anywhere or saved.',

  inputLabel: 'Your text',
  placeholder: 'Type or paste your text here…',
  paste: 'Paste',
  copy: 'Copy text',
  copied: 'Copied!',
  clear: 'Clear',
  cleared: 'Text cleared.',
  undo: 'Undo',
  pasted: 'Text pasted.',
  pasteHint: 'Your browser did not allow the Paste button. Click in the box and press Ctrl+V (on a phone: long-press, then Paste).',

  statsTitle: 'Text statistics',
  words: 'Words',
  characters: 'Characters',
  charactersNoSpaces: 'Characters (no spaces)',
  sentences: 'Sentences',
  paragraphs: 'Paragraphs',
  readingTime: 'Reading time',
  speakingTime: 'Speaking time',
  seconds: '{n} sec',
  minutes: '{m} min',
  minutesSeconds: '{m} min {s} sec',

  howTitle: 'How to count the words in your text',
  step1Title: 'Add your text',
  step1Desc: 'Type in the box, paste with the Paste button, or press Ctrl+V. Long documents work too.',
  step2Title: 'Watch the numbers',
  step2Desc: 'Words, characters, sentences, paragraphs and reading time update while you type.',
  step3Title: 'Copy or start again',
  step3Desc: 'Copy the text when you are done, or clear the box. Cleared by mistake? Tap Undo.',
  faqTitle: 'Frequently asked questions',
  faq1Q: 'How are words counted?',
  faq1A: 'Every group of letters or numbers between spaces counts as one word, so extra spaces, empty lines and punctuation on its own never add words. Japanese and Chinese text, which has no spaces, is split into words by your browser.',
  faq2Q: 'How is the reading time calculated?',
  faq2A: 'Reading time assumes an average silent reading speed of 238 words per minute. Speaking time uses 183 words per minute, a typical pace for a talk or a video voice-over.',
  faq3Q: 'What counts as a sentence and a paragraph?',
  faq3A: 'A sentence ends with . ! or ? (and ۔ ؟ । 。 in other languages); the last sentence counts even without an ending mark. Every line that contains text is one paragraph.',
  faq4Q: 'Do characters include spaces?',
  faq4A: 'Both are shown: "Characters" includes spaces and line breaks, "Characters (no spaces)" leaves them out. An emoji or a letter with its accent marks counts as one character.',
  faq5Q: 'Is my text saved or sent anywhere?',
  faq5A: 'No. Everything is counted in your browser. Your text is never sent to our server, saved or logged.',

  moreTools: 'More free tools',
};

export type Strings = typeof en;

/** Replaces {key} placeholders, like the site's fill() helper. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
