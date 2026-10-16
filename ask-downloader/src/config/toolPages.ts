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
  {
    id: 'age-calculator',
    path: '/age-calculator',
    name: 'Age Calculator',
    seoTitle: 'Age Calculator - Exact Age & Next Birthday',
    seoDescription:
      'Calculate your exact age in years, months and days from your date of birth, and count down to your next birthday. Free, no sign-up; nothing is stored.',
    keywords: 'age calculator, calculate age, age calculator by date of birth, how old am I, exact age, birthday calculator, date of birth calculator',
  },
  {
    id: 'grade-calculator',
    path: '/grade-calculator-swift-score',
    name: 'Grade Calculator - Swift Score',
    seoTitle: 'Grade Calculator - Swift Score',
    seoDescription:
      'Enter the number of questions and wrong answers to get the score, percentage and letter grade instantly, with a full grading chart. Free for teachers and students.',
    keywords: 'grade calculator, test grade calculator, ez grader, easy grader, score calculator, percentage grade calculator, letter grade calculator, teacher grading tool',
  },
  {
    id: 'word-counter',
    path: '/word-counter',
    name: 'Word Counter',
    seoTitle: 'Word Counter - Count Words & Characters',
    seoDescription:
      'Count words, characters, sentences and paragraphs as you type, and see the reading time. Free, works in any language; your text is never stored.',
    keywords: 'word counter, character counter, count words, word count tool, letter counter, sentence counter, reading time calculator',
  },
  {
    id: 'image-compressor',
    path: '/image-compressor',
    name: 'Image Compressor',
    seoTitle: 'Image Compressor - Reduce JPG, PNG & WebP Size',
    seoDescription:
      'Compress JPG, PNG and WebP images up to 90% without visible quality loss. Resize, convert to WebP, set a max size. Free; photos never leave your device.',
    keywords: 'image compressor, compress image, reduce image size, compress jpg, compress png, webp converter, photo compressor, image size reducer',
  },
  {
    id: 'watermark-remover',
    path: '/watermark-remover',
    name: 'Watermark Remover',
    seoTitle: 'Watermark Remover - Photos, PDF, Word & Video',
    seoDescription:
      'Remove watermarks from your own photos with AI, and from PDF, Word (DOCX) and video files. Free, no sign-up, no limits; PDF and Word files never leave your device.',
    keywords: 'watermark remover, remove watermark from photo, remove watermark from pdf, remove watermark from word, remove logo from video, ai watermark remover, free watermark remover',
  },
  {
    id: 'dns-checker',
    path: '/dns-checker',
    name: 'DNS Checker',
    seoTitle: 'DNS Checker - Check DNS Propagation Worldwide',
    seoDescription:
      'Check A, AAAA, CNAME, MX, NS, TXT, SOA and CAA records on 16 public DNS servers worldwide and compare them with the true answer from the domain\'s own name servers. Free.',
    keywords: 'dns checker, dns propagation checker, dns lookup, check dns records, mx lookup, txt record lookup, nameserver lookup, whats my dns',
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
