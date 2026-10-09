/**
 * Machine translation through MyMemory (https://mymemory.translated.net).
 *
 * Free and keyless. Without an email the daily allowance is shared by every
 * site on the same IP address, so the owner's address is sent with each
 * request (MYMEMORY_EMAIL in the hosting panel), which gives the site its own
 * allowance.
 *
 * Every function returns null instead of throwing when a translation can't be
 * had — the caller then shows the built-in text, never an error or English.
 */

const ENDPOINT = 'https://api.mymemory.translated.net/get';
/** MyMemory refuses queries over 500 bytes. */
const MAX_BYTES = 450;

const bytes = (s: string) => Buffer.byteLength(s, 'utf8');

/** Splits a long line into chunks MyMemory accepts, at sentence ends where possible. */
function chunkLine(line: string): string[] {
  if (bytes(line) <= MAX_BYTES) return [line];
  const pieces = line.split(/(?<=[.!?۔。])\s+|\s+/);
  const out: string[] = [];
  let cur = '';
  for (const p of pieces) {
    const next = cur ? `${cur} ${p}` : p;
    if (bytes(next) > MAX_BYTES && cur) { out.push(cur); cur = p; } else { cur = next; }
  }
  if (cur) out.push(cur);
  return out;
}

/** One request. The source language is detected by MyMemory. */
async function translateChunk(q: string, target: string): Promise<string | null> {
  const params = new URLSearchParams({ q, langpair: `autodetect|${target}` });
  const email = (process.env.MYMEMORY_EMAIL || '').trim();
  if (email) params.set('de', email);
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(20000) });
    const data: any = await res.json().catch(() => null);
    const details = String(data?.responseDetails || '');
    // Text already in the target language: keep it as it is.
    if (/DISTINCT LANGUAGES/i.test(details)) return q;
    const text = String(data?.responseData?.translatedText || '');
    // When the daily allowance runs out MyMemory puts its warning where the
    // translation belongs, sometimes with a 200 status. Never store that.
    if (!res.ok || Number(data?.responseStatus) !== 200 || data?.quotaFinished === true || !text || /MYMEMORY WARNING/i.test(text)) {
      console.warn(`[translate] ${target}: HTTP ${res.status} ${(details || text).slice(0, 120)}`);
      return null;
    }
    const detected = String(data?.responseData?.detectedLanguage || '').slice(0, 2).toLowerCase();
    if (detected === target) return q;
    return text;
  } catch (err: any) {
    console.warn(`[translate] ${target}: ${err?.message || err}`);
    return null;
  }
}

/**
 * Translates a block of text into one language, line by line so paragraph
 * breaks and "- " bullet markers survive. Null if any part failed.
 */
export async function translateText(text: string, target: string): Promise<string | null> {
  const lines = text.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(\s*[-•]\s+)?(.*)$/)!;
    const prefix = m[1] || '';
    const body = m[2].trim();
    if (!body) { out.push(line); continue; }
    const parts: string[] = [];
    for (const chunk of chunkLine(body)) {
      const t = await translateChunk(chunk, target);
      if (t === null) return null;
      parts.push(t);
    }
    out.push(prefix + parts.join(' '));
  }
  const result = out.join('\n');
  // A placeholder the translation lost or mangled ({platform}, {brand})
  // would break the page; treat that as a failed translation instead.
  const tokens = text.match(/\{[a-z]+\}/g) || [];
  if (tokens.some((tk) => !result.includes(tk))) return null;
  return result;
}
