/**
 * Trending Sounds, step A: asks TikWM for the trending videos of one region
 * and turns them into a list of sounds (one entry per sound, views added up).
 * Collect-only: no MP3 is downloaded here.
 */
export type SoundHit = {
  id: string;
  name: string;
  creator: string;
  duration: number;
  original: boolean; // true = "original sound" made by a user, false = a song/library sound
  views: number;
  videos: number;
};

const FEED = 'https://www.tikwm.com/api/feed/list';

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);

export async function fetchRegion(region: string): Promise<SoundHit[]> {
  const res = await fetch(`${FEED}?region=${encodeURIComponent(region)}&count=20`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ASKDownloader/1.0)' },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: any = await res.json();
  if (json?.code !== 0 || !Array.isArray(json.data)) throw new Error(clean(json?.msg, 80) || 'bad reply');

  const byId = new Map<string, SoundHit>();
  for (const v of json.data) {
    const m = v?.music_info;
    const id = clean(m?.id, 40);
    if (!/^\d+$/.test(id)) continue;
    const hit = byId.get(id) ?? {
      id,
      name: clean(m.title, 150),
      creator: clean(m.author, 80),
      duration: Number(m.duration) || 0,
      original: /^original sound\b/i.test(clean(m.title, 40)),
      views: 0,
      videos: 0,
    };
    hit.views += Number(v.play_count) || 0;
    hit.videos += 1;
    byId.set(id, hit);
  }
  return [...byId.values()];
}
