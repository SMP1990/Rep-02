// Every word the tool shows. When the tool joins the site these keys move to
// src/translations/extra/*.ts (all 11 languages) as `t.bgRemover.*`.
export const en = {
  title: 'Background Remover',
  subtitle: 'Remove the background from any photo in seconds. Free, no sign-up, no watermark.',
  privacy: 'Your photo never leaves your device. Everything runs inside your browser.',

  dropTitle: 'Drop an image here',
  dropOr: 'or',
  chooseButton: 'Choose image',
  pasteHint: 'You can also paste an image (Ctrl + V)',
  formats: 'JPG, PNG or WEBP, up to {n} MB',
  dropzoneLabel: 'Upload an image to remove its background',

  loadingTitle: 'Getting the AI ready…',
  loadingFirstTime: 'First time only: about {n} MB. Next time it opens instantly.',
  processingTitle: 'Removing the background…',
  processingHint: 'This can take a few seconds on phones.',
  seconds: '{n}s',

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

  errorTitle: 'Something went wrong',
  tryAgain: 'Try again',
  errors: {
    'unsupported-type': 'This file type is not supported. Please use a JPG, PNG or WEBP image.',
    'file-too-large': 'This image is too large. Please use an image under {n} MB.',
    'decode-failed': 'We could not open this image. It may be damaged; please try another one.',
    'model-download-failed':
      'The AI could not be downloaded. Please check your internet connection and try again.',
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
