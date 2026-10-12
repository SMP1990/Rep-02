// Every word of the Image Compressor (tool + its page), English. The other
// 10 languages live next to this file, typed as `Strings`, so TypeScript
// fails if one misses a key. They load only with the tool page.
// Placeholders: {n} number, {mb} megabytes, {p} percent, {size} file size.
export const en = {
  title: 'Image Compressor',
  subtitle: 'Make JPG, PNG and WebP images up to 90% smaller with no visible loss of quality. Free, no sign-up — your photos never leave your device.',
  privacy: 'Images are compressed on your device. They are never uploaded or saved.',

  dropTitle: 'Drop your images here',
  dropOr: 'or',
  choose: 'Choose images',
  dropHint: 'JPG, PNG, WebP and more · up to {n} images, {mb} MB each',
  pasteHint: 'You can also paste an image with Ctrl+V.',

  settingsTitle: 'Settings',
  format: 'Output format',
  formatAuto: 'Same as original',
  formatWebp: 'WebP (smallest)',
  formatJpeg: 'JPG',
  formatPng: 'PNG (lossless)',
  quality: 'Quality',
  qualityHint: 'Lower means a smaller file. 75 is a good balance.',
  resize: 'Resize',
  resizeOff: 'Keep original size',
  resizeTo: 'Longest side {n} px',
  target: 'Maximum file size',
  targetOff: 'No limit',
  targetHint: 'Each JPG or WebP image is made smaller than this.',
  apply: 'Compress again with these settings',

  listTitle: 'Your images',
  waiting: 'Waiting…',
  working: 'Compressing…',
  smaller: '{p}% smaller',
  kept: 'Already optimized — the original is the smallest',
  errUnsupported: 'This browser cannot open this image type (for example HEIC). Please use JPG, PNG or WebP.',
  errTooLarge: 'This image is too large (over {n} megapixels).',
  errFailed: 'Could not compress this image. Please try again.',
  errFileSize: 'Larger than {mb} MB — skipped.',
  errNotImage: 'Not an image — skipped.',
  errLimit: 'Only the first {n} images were added.',
  download: 'Download',
  downloadAll: 'Download all (ZIP)',
  clearAll: 'Clear all',
  remove: 'Remove',
  compare: 'Compare',
  closeCompare: 'Close',
  totalSaved: 'Saved {size} ({p}%) on {n} images',
  before: 'Before',
  after: 'After',
  compareLabel: 'Drag to compare the original and the compressed image',
  originalAlt: 'Original image',
  resultAlt: 'Compressed image',

  howTitle: 'How to compress images',
  step1Title: 'Add your images',
  step1Desc: 'Drop up to 20 photos or pictures, choose them from your device, or paste one with Ctrl+V.',
  step2Title: 'Pick the settings',
  step2Desc: 'Keep the format or switch to WebP, set the quality, resize, or set a maximum file size.',
  step3Title: 'Download',
  step3Desc: 'Compare before and after, then download each image or all of them in one ZIP file.',
  faqTitle: 'Frequently asked questions',
  faq1Q: 'How much smaller will my images get?',
  faq1A: 'Usually 70–90% for phone photos. In our tests, 2–4 MB photos became 0.2–0.8 MB at quality 75 with no visible difference. Resizing to 1920 px saves even more.',
  faq2Q: 'Will my images lose quality?',
  faq2A: 'At the default quality of 75 the difference is very hard to see. Use the Compare button to check each image, and raise the quality if you need it. PNG compression is lossless.',
  faq3Q: 'Which format should I choose?',
  faq3A: 'WebP gives the smallest files and works in all modern browsers and apps. Choose JPG when a website or form only accepts JPG, and PNG for screenshots or images that need transparency.',
  faq4Q: 'Are my images uploaded to a server?',
  faq4A: 'No. Everything happens in your browser. Your images are never uploaded, saved or logged. Location data (GPS) and other hidden details are removed from the compressed copies.',
  faq5Q: 'Why can an image not be made smaller?',
  faq5A: 'Some images are already well optimized; then you get the original back unchanged instead of a bigger file. HEIC photos from iPhones can only be opened in Safari — convert them to JPG first elsewhere.',

  moreTools: 'More free tools',
};

export type Strings = typeof en;

/** Replaces {key} placeholders, like the site's fill() helper. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
