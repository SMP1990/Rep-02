// The Sounds pages' words in the reader's language (English fallback).
// Imported only by the Sounds pages, so they never load with the rest of the site.
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

export type { Strings };

const ALL: Record<string, Strings> = { en, ur, ar, hi, es, pt, fr, de, id, ru, ja };

export const soundStrings = (lang: string): Strings => ALL[lang] || en;
/** Replaces {name} placeholders: fill('Hi {a}', { a: 'x' }) -> 'Hi x'. */
export const fill = (s: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), s);
export const fillN =(s: string, n: string | number) => s.split('{n}').join(String(n));
