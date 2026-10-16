// Every word of the Watermark Remover (tool + its page), English. The other
// 10 languages live next to this file, typed as `Strings`, so TypeScript
// fails if one misses a key. They load only with the tool page.
// Placeholders: {n} number, {name} file name, {p} percent, {text} text.
export const en = {
  title: 'Watermark Remover',
  subtitle: 'Remove watermarks from your own photos, PDFs, Word documents and videos. AI fills the area naturally. Free, no sign-up, no limits.',
  ownFiles: 'Use this tool only for your own files or files you have permission to edit.',

  tabImage: 'Image',
  tabPdf: 'PDF',
  tabWord: 'Word',
  tabVideo: 'Video',

  drop: 'Drop a file here or tap to choose',
  dropMany: 'Drop files here or tap to choose (several at once is fine)',
  acceptImage: 'JPG, PNG or WebP, any size',
  acceptPdf: 'PDF files, any size',
  acceptWord: 'DOCX files (Word 2007 and newer), any size',
  acceptVideo: 'MP4, MOV, WebM and more, up to 2 GB',
  wrongType: 'This file type is not supported here.',
  another: 'Choose another file',
  download: 'Download',
  downloadAll: 'Download all',
  remove: 'Remove',
  working: 'Working…',
  privacyLocal: 'Your file is processed in your browser. It is never uploaded.',
  privacyServer: 'Only the area you marked is sent to our server, processed and deleted at once. Nothing is stored.',
  privacyVideo: 'Your video is processed on our server and deleted automatically after you download it.',

  imgHow: 'Paint over the watermark, then tap Remove.',
  brush: 'Brush size',
  undo: 'Undo',
  clear: 'Clear marks',
  showOriginal: 'Hold to see the original',
  removeImg: 'Remove watermark',
  imgDone: 'Done! Paint again to remove anything left, or download.',
  imgNoMark: 'Paint over the watermark first.',
  imgTooBig: 'This photo is too large for your browser. Try a smaller copy.',
  imgScaled: 'This photo is very large, so it was reduced to fit what your browser can edit.',

  pdfStrong: 'Strong mode: also remove opaque header shapes and faint diagonal text (use if the normal mode leaves the watermark)',
  pdfPassword: 'This PDF is password-protected. Enter its password:',
  pdfOpen: 'Open',
  pdfWrongPassword: 'Wrong password, try again.',
  pdfNotPdf: 'This file is not a readable PDF.',
  pdfView: 'Open result',
  docRemoved: 'Watermark removed',
  docNone: 'No watermark found',
  docNoneHelp: 'The watermark may be part of the page itself (for example a scan). Try Strong mode, or convert the page to an image and use the Image tab.',
  pdfFound: '{n} page(s) cleaned',
  wordFound: 'Removed: {text}',
  wordPicture: 'picture watermark',
  wordText: 'text watermark',
  wordNotDocx: 'This is not a DOCX file. Old .doc files: open in Word and save as .docx first.',

  vidHow: 'Draw a box over the logo or watermark (you can draw several), then tap Remove.',
  vidUploading: 'Uploading… {p}%',
  vidQueued: 'In line… {n} video(s) ahead of you',
  vidWorking: 'Removing the watermark… {p}%',
  vidDone: 'Your video is ready.',
  vidCancel: 'Cancel',
  vidNoBox: 'Draw a box over the watermark first.',
  vidTip: 'Best results on plain or still backgrounds; on busy moving areas the box may look slightly blurred.',

  errBusy: 'The server is busy. Trying again…',
  errUnavailable: 'This part of the tool is not available on the server right now. Please try again later.',
  errFailed: 'Something went wrong. Please try again.',
  errNetwork: 'Connection problem. Check your internet and try again.',
  errTooBig: 'This file is larger than 2 GB.',
  errBadVideo: 'This file could not be read as a video.',

  howTitle: 'How to remove a watermark',
  step1Title: 'Choose the file type',
  step1Desc: 'Pick Image, PDF, Word or Video and add your file. Several PDF or Word files can be done at once.',
  step2Title: 'Mark or let it find',
  step2Desc: 'On photos paint over the watermark; on videos draw a box. PDF and Word watermarks are found automatically.',
  step3Title: 'Download',
  step3Desc: 'Check the result and download it. The rest of your file stays exactly as it was.',
  faqTitle: 'Frequently asked questions',
  faq1Q: 'Is it really free and unlimited?',
  faq1A: 'Yes. There is no sign-up, no daily limit and no limit on file size for photos, PDF and Word. Videos can be up to 2 GB each; when many people use it at once, files wait in line for a few seconds.',
  faq2Q: 'How does the photo watermark remover work?',
  faq2A: 'You paint over the watermark and an AI model (MI-GAN) redraws that area from its surroundings. Only the marked area is changed; every other pixel of your photo stays original, at full resolution.',
  faq3Q: 'Which PDF and Word watermarks can it remove?',
  faq3A: 'Word: text and picture watermarks added with Design > Watermark. PDF: watermarks added by Acrobat and other editors, watermark layers and annotations, and watermarks of PDFs exported from Word. If the watermark is printed into a scanned page, use the Image tab.',
  faq4Q: 'Are my files safe?',
  faq4A: 'PDF and Word files never leave your device. For photos only the marked area is sent and deleted right after processing. Videos are deleted automatically after you download them. Nothing is stored or shared.',
  faq5Q: 'Can I remove watermarks from any file?',
  faq5A: 'Use the tool only for your own files or files you have the right to edit, for example to remove a DRAFT stamp, your old logo, or a mark on your own photo. Removing someone else\'s watermark to use their work may break copyright law.',

  moreTools: 'More free tools',
};

export type Strings = typeof en;

/** Replaces {key} placeholders, like the site's fill() helper. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
