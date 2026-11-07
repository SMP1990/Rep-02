// Every word of the public Sounds pages, English. The other 10 languages live next
// to this file, typed as `Strings`, so TypeScript fails if one misses a key.
// Placeholders: {n} number.
export const en = {
  title: 'Trending Meme Sounds & Funny Audio',
  subtitle: 'Listen to the sounds that are going viral right now and download them as free MP3. New sounds are added every day.',
  searchLabel: 'Search sounds',
  searchPlaceholder: 'Search sounds…',
  play: 'Play',
  pause: 'Pause',
  download: 'Download MP3',
  loading: 'Loading sounds…',
  empty: 'No sounds yet. New trending sounds are added every day, so please check back soon.',
  noResults: 'No sound matches your search.',
  loadError: 'The sounds could not be loaded. Please try again.',
  retry: 'Try again',
  count: '{n} sounds',
  sec: '{n} sec',
  views: '{n} views',
  note: 'Sounds belong to their creators and are shared for personal, fun use.',
};
export type Strings = typeof en;
