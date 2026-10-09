import { BlogPost } from '../../types/admin.ts';

export type LocalizedPostData = Partial<BlogPost>;
export type LanguagePostMap = Record<string, LocalizedPostData>;
export type CategoryTranslationMap = Record<string, string>;
