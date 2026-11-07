/**
 * Trending Sounds: the PUBLIC, read-only side. Only sounds that are approved by
 * the admin AND have a saved MP3 are visible. Visitors never trigger any
 * outside call: everything is read from the saved data.
 */
import type { Express, Request, Response } from 'express';
import { read } from './store.ts';
import { hasSoundFile, soundFile } from './soundsMp3.ts';
import { realName, type Sound } from './soundsFilter.ts';

/** Address part for a sound: "original sound - Abdi The Captain" -> "abdi-the-captain-mp3". Empty if the name has no Latin letters/digits. */
export function makeSlug(name: string, id: string, taken: Set<string>): string {
  const base = realName(name).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '');
  let slug = `${base || 'sound'}-mp3`;
  if (taken.has(slug) || !base) slug = `${base || 'sound'}-${id.slice(-6)}-mp3`;
  return slug;
}

export type PublicSound = {
  slug: string; title: string; creator: string; duration: number; views: number;
  regions: string[]; firstSeen: string; lastSeen: string; video?: { id: string; user: string };
};

const toPublic = (s: Sound): PublicSound => ({
  slug: s.slug as string, title: realName(s.name) || s.name, creator: s.creator, duration: s.duration, views: s.views,
  regions: s.regions, firstSeen: s.firstSeen, lastSeen: s.lastSeen,
  video: s.video ? { id: s.video.id, user: s.video.user } : undefined,
});

const visible = (): Sound[] =>
  Object.values(read<Record<string, Sound>>('soundsData', {}))
    .filter((s) => s.status === 'approved' && s.slug && hasSoundFile(s.id));

export const publicSounds = (): PublicSound[] => visible().sort((a, b) => b.views - a.views).map(toPublic);
export const publicSound = (slug: string): PublicSound | undefined => {
  const s = visible().find((x) => x.slug === slug);
  return s ? toPublic(s) : undefined;
};

export function registerPublicSoundsRoutes(app: Express) {
  app.get('/api/sounds', (_req: Request, res: Response) => {
    res.set('Cache-Control', 'public, max-age=300').json({ sounds: publicSounds() });
  });

  app.get('/api/sounds/:slug', (req: Request, res: Response) => {
    const s = publicSound(String(req.params.slug));
    if (!s) return void res.status(404).json({ error: 'not found' });
    res.set('Cache-Control', 'public, max-age=300').json({ sound: s, related: publicSounds().filter((x) => x.slug !== s.slug).slice(0, 6) });
  });

  /** The MP3 itself. Add ?dl=1 to make the browser download it instead of playing it. */
  app.get('/api/sounds/:slug/mp3', (req: Request, res: Response) => {
    const s = visible().find((x) => x.slug === String(req.params.slug));
    if (!s) return void res.status(404).end();
    res.set('Cache-Control', 'public, max-age=3600');
    if (req.query.dl) res.attachment(`${String(s.slug).replace(/-mp3$/, '')}.mp3`);
    res.type('audio/mpeg').sendFile(soundFile(s.id), { acceptRanges: true });
  });
}
