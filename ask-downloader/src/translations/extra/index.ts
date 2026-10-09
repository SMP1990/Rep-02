import { en } from './en.ts'; import { ur } from './ur.ts'; import { ar } from './ar.ts'; import { hi } from './hi.ts';
import { es } from './es.ts'; import { pt } from './pt.ts'; import { fr } from './fr.ts'; import { de } from './de.ts';
import { id } from './id.ts'; import { ru } from './ru.ts'; import { ja } from './ja.ts';
export type { ExtraDict } from './en.ts';
export const EXTRA_TRANSLATIONS: Record<string, typeof en> = { en, ur, ar, hi, es, pt, fr, de, id, ru, ja };
