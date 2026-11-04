/**
 * Trending Sounds: reads the trending videos of one region from a list of
 * PROVIDERS (tried in order, each twice) and turns them into sounds, one entry
 * per sound with the views added up. Collect-only: no MP3 is downloaded.
 * Today there is one provider (TikWM, no key). A backup (for example a free
 * RapidAPI API with a key from the admin) is added by pushing one more
 * function into PROVIDERS.
 */
export type SoundHit = {
  id: string;
  name: string;
  creator: string;
  duration: number;
  original: boolean; // true = a user's own "original sound", false = probably a song
  views: number;
  videos: number;
  video?: { id: string; user: string; views: number }; // the most viewed video that uses it (for the admin "check on TikTok" link)
};

type Provider = { name: string; feed: (region: string) => Promise<any[]> };

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
// "original sound" in the languages of our regions (PT, ID, ES, FR, RU, JA, AR, UR)
const ORIGINAL = /original|\basli\b|оригинал|オリジナル|اصلی|الأصلي|asli/i;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const tikwm: Provider = {
  name: 'tikwm',
  async feed(region) {
    const res = await fetch(`https://www.tikwm.com/api/feed/list?region=${encodeURIComponent(region)}&count=20`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ASKDownloader/1.0)' },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: any = await res.json();
    if (json?.code !== 0 || !Array.isArray(json.data)) throw new Error(clean(json?.msg, 80) || 'bad reply');
    return json.data;
  },
};

export const PROVIDERS: Provider[] = [tikwm];

/** Videos of a region from the first provider that answers; throws only if all fail. */
async function videos(region: string): Promise<{ list: any[]; source: string }> {
  const errors: string[] = [];
  for (const p of PROVIDERS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const list = await p.feed(region);
        if (!list.length) throw new Error('empty list');
        return { list, source: p.name };
      } catch (err: any) {
        errors.push(`${p.name}: ${String(err?.message || err).slice(0, 60)}`);
        await wait(2000);
      }
    }
  }
  throw new Error(errors.slice(-2).join('; '));
}

export async function fetchRegion(region: string): Promise<{ hits: SoundHit[]; source: string }> {
  const { list, source } = await videos(region);
  const byId = new Map<string, SoundHit>();
  for (const v of list) {
    const m = v?.music_info;
    const id = clean(m?.id, 40);
    if (!/^\d+$/.test(id)) continue;
    const name = clean(m.title, 150);
    const hit = byId.get(id) ?? {
      id, name, creator: clean(m.author, 80), duration: Number(m.duration) || 0,
      original: ORIGINAL.test(name.slice(0, 40)), views: 0, videos: 0,
    };
    const plays = Number(v.play_count) || 0;
    const vid = clean(v.video_id, 30), user = clean(v.author?.unique_id, 40);
    if (/^\d+$/.test(vid) && /^[\w.]+$/.test(user) && plays >= (hit.video?.views ?? -1)) hit.video = { id: vid, user, views: plays };
    hit.views += plays;
    hit.videos += 1;
    byId.set(id, hit);
  }
  return { hits: [...byId.values()], source };
}
