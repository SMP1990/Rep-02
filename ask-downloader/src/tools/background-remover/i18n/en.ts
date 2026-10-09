// Every word of the Background Remover (tool + its page), English. The other
// 10 languages live next to this file, typed as `Strings`, so TypeScript
// fails if one misses a key. They load only with the tool page, never with
// the rest of the site. Placeholders: {n} number, {w}/{h} size, {c} colour.
export const en = {
  title: 'Background Remover',
  subtitle: 'Remove the background from any photo in seconds. Free, no sign-up, no watermark.',
  privacy: 'Your photo never leaves your device. Everything runs inside your browser.',

  dropTitle: 'Drop an image here',
  dropOr: 'or',
  chooseButton: 'Choose image',
  pasteHint: 'You can also paste an image (Ctrl + V)',
  formats: 'JPG, PNG or WEBP, up to {n} MB',

  loadingTitle: 'Getting our system ready…',
  processingTitle: 'Removing the background…',
  processingHint: 'This can take a few seconds on phones.',
  hdLoadingTitle: 'Getting the deeper check ready…',
  hdProcessingTitle: 'Taking a closer look…',
  hdProcessingHint: 'Our system is checking the whole picture again.',

  betterButton: 'Need better results?',
  betterHint: 'Our system checks the photo a second time, more closely, and brings back missing parts, like a cut-off body or arm.',
  betterDone: 'Checked twice for the best result.',

  before: 'Before',
  after: 'After',
  compareLabel: 'Drag to compare before and after',
  downloadPng: 'Download PNG',
  newImage: 'New image',
  resultAlt: 'Your image with the background removed',
  originalAlt: 'Your original image',
  resizedNote: 'Your image was large, so it was resized to {w} × {h} pixels.',
  downloadJpg: 'Download JPG',
  preparing: 'Preparing…',

  background: 'Background',
  bgTransparent: 'Transparent',
  bgColor: 'Color {c}',
  bgCustomColor: 'Pick any color',
  bgUpload: 'Use your own background image',
  bgRemoveImage: 'Remove background image',

  editButton: 'Erase / Restore',
  editHint: 'Paint over the picture: Erase removes parts, Restore brings parts back.',
  erase: 'Erase',
  restore: 'Restore',
  brushSize: 'Brush size',
  undo: 'Undo',
  resetEdits: 'Reset edits',
  done: 'Done',
  editorLabel: 'Editing area: paint to erase or restore parts of the picture',

  howTitle: 'How to remove a background from a photo',
  step1Title: 'Upload your photo',
  step1Desc: 'Drop a JPG, PNG or WEBP image here, choose it from your device, or paste it.',
  step2Title: 'Let our system do the work',
  step2Desc: 'The background is removed in seconds, right in your browser. Not perfect? Tap "Need better results?" or fix it with the Erase / Restore brush.',
  step3Title: 'Download',
  step3Desc: 'Save a transparent PNG, or choose a colour or your own background and save it as PNG or JPG.',
  faqTitle: 'Frequently asked questions',
  faq1Q: 'Is the Background Remover free?',
  faq1A: 'Yes. It is completely free, with no sign-up, no watermark and no daily limit.',
  faq2Q: 'Are my photos uploaded to a server?',
  faq2A: 'No. Everything runs inside your browser, so your photo never leaves your device.',
  faq3Q: 'Why is it slower the first time?',
  faq3A: 'The first time, the tool (about 50 MB) is downloaded and saved in your browser. After that it starts right away.',
  faq4Q: 'Which photos work best?',
  faq4A: 'People, products, animals and objects with clear edges. Hair, glass, or a background with the same colour as the subject is harder: use "Need better results?" or the Erase / Restore brush.',
  faq5Q: 'Which file types and sizes can I use?',
  faq5A: 'JPG, PNG and WEBP images up to 25 MB. Very large photos are scaled down so your device stays fast.',

  errorTitle: 'Something went wrong',
  tryAgain: 'Try again',
  errors: {
    'unsupported-type': 'This file type is not supported. Please use a JPG, PNG or WEBP image.',
    'file-too-large': 'This image is too large. Please use an image under {n} MB.',
    'decode-failed': 'We could not open this image. It may be damaged; please try another one.',
    'model-download-failed':
      'The tool could not be loaded. Please check your internet connection and try again.',
    'out-of-memory':
      'Your device ran out of memory for this image. Please try a smaller image or close other tabs.',
    'processing-failed': 'The background could not be removed from this image. Please try again.',
  },
};

export type Strings = typeof en;
export type ErrorCode = keyof Strings['errors'];

/** Replaces {key} placeholders, like the site's fill() helper. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
