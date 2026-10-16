import { en } from './en.ts';
export type { ExtraDict } from './en.ts';
/** English is always here. The other ten languages are added by
 * loadLanguage() (src/translations/loadLanguage.ts) the first time they are
 * used, so a visitor only downloads the language they actually read. */
export const EXTRA_TRANSLATIONS: Record<string, typeof en> = { en };
