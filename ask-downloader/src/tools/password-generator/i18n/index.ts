// The Password Generator's words in the reader's language (English fallback).
// Imported only by the tool page, so they never load with the rest of the site.
import { en, type Strings } from './en';
import { ur } from './ur';
import { ar } from './ar';
import { hi } from './hi';
import { es } from './es';
import { pt } from './pt';
import { fr } from './fr';
import { de } from './de';
import { id } from './id';
import { ru } from './ru';
import { ja } from './ja';

const ALL: Record<string, Strings> = { en, ur, ar, hi, es, pt, fr, de, id, ru, ja };

export function toolStrings(lang: string): Strings {
  return ALL[lang] || en;
}
