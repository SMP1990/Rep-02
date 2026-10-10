/**
 * Every tool page, in one list shared by the server and the browser.
 *
 * Adding a tool here is all its SEO needs: the server then gives the page
 * its title, description, keywords, share image and robots tag (and a
 * sitemap entry), and Admin -> Tools SEO & FAQ lists it with all of those
 * fields plus its FAQ. The values below are the built-in defaults, used
 * until the admin changes them.
 *
 * Pure data, no imports: server.ts reads this file too.
 */
export interface ToolPage {
  id: string;
  path: string;
  /** Name shown in the admin. */
  name: string;
  /** Default <title>, without the site name (it is added after " - "). */
  seoTitle: string;
  seoDescription: string;
  /** Default keywords, comma separated. */
  keywords: string;
}

export const TOOL_PAGE_LIST: ToolPage[] = [
  {
    id: 'background-remover',
    path: '/background-remover',
    name: 'Background Remover',
    seoTitle: 'Background Remover - Free, No Sign-up',
    seoDescription:
      'Remove the background from any photo in seconds. Free, no sign-up, no watermark. Photos are deleted right away, never stored.',
    keywords: 'background remover, remove background, transparent background, remove bg, photo background eraser, free background remover',
  },
  {
    id: 'password-generator',
    path: '/password-generator',
    name: 'Password Generator',
    seoTitle: 'Password Generator - Strong & Random, Free',
    seoDescription:
      'Create strong, random passwords in one click. Choose the length and characters, then copy. Free, no sign-up; passwords are made on your device and never stored.',
    keywords: 'password generator, strong password generator, random password, secure password, password maker, free password generator',
  },
];

/** What the admin set for one tool. Empty fields mean "use the default". */
export interface ToolFaq {
  id: string;
  question: string;
  answer: string;
}

export interface ToolSeo {
  /** Full <title>; {brand} is replaced by the site name. */
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  /** Share image (Media Library /uploads/... path or full URL). */
  ogImage?: string;
  /** Keep the page out of search engines (and the sitemap). */
  noindex?: boolean;
  /** The admin's FAQ; missing means the built-in FAQ, shown translated. */
  faqs?: ToolFaq[];
}

export type ToolsContent = Record<string, ToolSeo>;

export const toolPageById = (id: string) => TOOL_PAGE_LIST.find((t) => t.id === id);

const LIMITS = { metaTitle: 120, metaDescription: 320, keywords: 500, ogImage: 500, question: 300, answer: 3000, faqs: 30 };

/** Keeps only known tools and well-formed fields (used by the server). */
export function cleanToolsContent(input: unknown): ToolsContent {
  const out: ToolsContent = {};
  if (!input || typeof input !== 'object') return out;
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  for (const tool of TOOL_PAGE_LIST) {
    const c = (input as Record<string, any>)[tool.id];
    if (!c || typeof c !== 'object') continue;
    const s: ToolSeo = {};
    const metaTitle = str(c.metaTitle, LIMITS.metaTitle);
    const metaDescription = str(c.metaDescription, LIMITS.metaDescription);
    const keywords = str(c.keywords, LIMITS.keywords);
    const ogImage = str(c.ogImage, LIMITS.ogImage);
    if (metaTitle) s.metaTitle = metaTitle;
    if (metaDescription) s.metaDescription = metaDescription;
    if (keywords) s.keywords = keywords;
    if (ogImage && (/^https?:\/\//i.test(ogImage) || ogImage.startsWith('/uploads/'))) s.ogImage = ogImage;
    if (c.noindex === true) s.noindex = true;
    if (Array.isArray(c.faqs)) {
      s.faqs = c.faqs
        .slice(0, LIMITS.faqs)
        .map((f: any, i: number) => ({
          id: str(f?.id, 60) || `faq_${i}`,
          question: str(f?.question, LIMITS.question),
          answer: str(f?.answer, LIMITS.answer),
        }))
        .filter((f: ToolFaq) => f.question && f.answer);
    }
    if (Object.keys(s).length) out[tool.id] = s;
  }
  return out;
}
