/**
 * Each tool's built-in FAQ (English), for the admin editor and so that an
 * unchanged built-in question keeps its human translation. A new tool adds
 * one line here (and one in src/config/toolPages.ts).
 * Pure data: also read by the server (server/pageTranslations.ts).
 */
import { en as backgroundRemover } from './background-remover/i18n/en';
import { en as passwordGenerator } from './password-generator/i18n/en';

export interface FaqPair {
  question: string;
  answer: string;
}

/** faq1Q/faq1A, faq2Q/faq2A, ... of a tool's word list. */
export function faqsOf(words: object): FaqPair[] {
  const w = words as Record<string, unknown>;
  const out: FaqPair[] = [];
  for (let n = 1; typeof w[`faq${n}Q`] === 'string'; n++) {
    out.push({ question: w[`faq${n}Q`] as string, answer: String(w[`faq${n}A`] ?? '') });
  }
  return out;
}

const ENGLISH: Record<string, object> = {
  'background-remover': backgroundRemover,
  'password-generator': passwordGenerator,
};

export const defaultToolFaqs = (toolId: string): FaqPair[] => faqsOf(ENGLISH[toolId] || {});
