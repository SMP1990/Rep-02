// Text statistics in the browser. Pure functions, no dependencies.
//
// Words: every whitespace-separated piece that contains a letter or a digit,
// so extra spaces, empty lines and lone punctuation ("—", ",") never count.
// Scripts written without spaces (Japanese, Chinese, Thai, ...) are split
// with the browser's Intl.Segmenter — only when such text is present, because
// it is ~10x slower than the plain rule on long English or Urdu text.

export interface Counts {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingSeconds: number;
  speakingSeconds: number;
}

/** Average adult silent reading and speaking speeds, words per minute. */
export const READING_WPM = 238;
export const SPEAKING_WPM = 183;

const HAS_WORD = /[\p{L}\p{N}]/u;
// Kana, CJK ideographs, Thai, Lao, Khmer, Myanmar: no spaces between words.
const NO_SPACE_SCRIPT = /[぀-ヿ㐀-䶿一-鿿豈-﫿฀-໿က-႟ក-៿]/;
const NO_SPACE_SCRIPT_ALL = new RegExp(NO_SPACE_SCRIPT.source, 'g');
// A sentence ends at . ! ? … (followed by a space, a closing quote/bracket or
// the end, so 3.5 and example.com don't split) or at ۔ ؟ । ॥ 。 ！ ？.
const SENTENCE_END = /[.!?…]+(?=[\s"'”’)\]]|$)|[؟۔।॥。！？]+/u;

const segmenters: Partial<Record<'word' | 'grapheme', Intl.Segmenter | null>> = {};
function segmenter(kind: 'word' | 'grapheme'): Intl.Segmenter | null {
  if (!(kind in segmenters)) {
    try {
      segmenters[kind] = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('ja', { granularity: kind }) : null;
    } catch {
      segmenters[kind] = null;
    }
  }
  return segmenters[kind]!;
}

function plainWords(text: string): number {
  let n = 0;
  for (const piece of text.split(/\s+/)) if (piece && HAS_WORD.test(piece)) n++;
  return n;
}

export function countWords(text: string): number {
  if (!NO_SPACE_SCRIPT.test(text)) return plainWords(text);
  const seg = segmenter('word');
  if (seg) {
    let n = 0;
    for (const s of seg.segment(text)) if (s.isWordLike) n++;
    return n;
  }
  // Old browser: each such character counts as a word, the rest as usual.
  const chars = (text.match(NO_SPACE_SCRIPT_ALL) || []).length;
  return chars + plainWords(text.replace(NO_SPACE_SCRIPT_ALL, ' '));
}

// Text where "one character" needs the full Unicode rules: emoji and other
// astral characters, joiners, variation selectors, keycaps, Indic and
// Southeast Asian scripts (conjuncts), Hangul jamo.
const COMPLEX = /[\ud800-\udfff‍︀-️⃣ऀ-෿฀-໿က-႟ᄀ-ᇿក-៿]/;
// A mark joins the character before it, except at the very start and after a
// line break (Unicode grapheme rules); there it is a character of its own.
const MARK = /(?<=[^\r\n])\p{M}/gu;
// A space with a mark right after it is drawn as one (non-space) character;
// line breaks never take marks.
const SPACE = /[\r\n]|\s(?!\p{M})/gu;
const isSpace = (s: string) => s === '\r\n' || (s.length === 1 && /\s/.test(s));

/**
 * Characters as a reader sees them (an emoji, or a letter with its accent
 * marks, is 1), with and without spaces/line breaks. One pass over the text.
 */
export function countCharacters(text: string): { all: number; noSpaces: number } {
  const crlf = (text.match(/\r\n/g) || []).length; // one line break, two code units
  const spaces = (text.match(SPACE) || []).length - crlf;
  if (!COMPLEX.test(text)) {
    // Plain letters plus combining marks: each mark joins the letter before it.
    const all = text.length - (text.match(MARK) || []).length - crlf;
    return { all, noSpaces: all - spaces };
  }
  const seg = segmenter('grapheme');
  if (!seg) {
    const all = Array.from(text).length - crlf;
    return { all, noSpaces: all - spaces };
  }
  let all = 0;
  let blank = 0;
  for (const { segment } of seg.segment(text)) {
    all++;
    if (isSpace(segment)) blank++;
  }
  return { all, noSpaces: all - blank };
}

export function countSentences(text: string): number {
  let n = 0;
  for (const part of text.split(SENTENCE_END)) if (HAS_WORD.test(part)) n++;
  return n;
}

/** Every line that contains a letter or a digit. */
export function countParagraphs(text: string): number {
  let n = 0;
  for (const line of text.split(/\r\n|\r|\n/)) if (HAS_WORD.test(line)) n++;
  return n;
}

export function countAll(text: string): Counts {
  const words = countWords(text);
  const chars = countCharacters(text);
  return {
    words,
    characters: chars.all,
    charactersNoSpaces: chars.noSpaces,
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    readingSeconds: Math.round((words / READING_WPM) * 60),
    speakingSeconds: Math.round((words / SPEAKING_WPM) * 60),
  };
}
