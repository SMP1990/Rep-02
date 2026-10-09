/**
 * Messages that come back in English from AdminContext, shown to readers
 * in their own language. Unknown messages fall back to a translated generic one.
 */
const MAP: Record<string, string> = {
  'Please provide a valid email address.': 'invalidEmail',
  'Please enter a valid email address.': 'invalidEmail',
  'This email is already subscribed.': 'alreadySubscribed',
  'Please enter your name.': 'enterName',
  'Please enter your comment message.': 'enterComment',
};

export function readerError(message: string | undefined, t: any, lang: string, fallbackKey = 'genericError'): string {
  const key = message ? MAP[message.trim()] : undefined;
  if (key) return t.ui[key];
  if (lang === 'en' && message) return message;
  return t.ui[fallbackKey];
}
