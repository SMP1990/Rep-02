/**
 * Trending Sounds (collect only, nothing public yet).
 * Four times a day (and at once when the last run is older than 6 h, because the
 * host may restart the Node process) the trending videos of 8 regions are read
 * and their sounds saved in the data folder. If a region fails, the run is
 * repeated after 45 minutes. Errors are only logged. Admin: soundsRoutes.ts.
 * Filter rules: soundsFilter.ts. See ../PLAN-TRENDING-SOUNDS.md.
 */
import { read, write } from './store.ts';
import { fetchRegion } from './soundsFetch.ts';
import { hasSoundFile, saveSoundMp3 } from './soundsMp3.ts';
import { makeSlug } from './soundsPublic.ts';
import { DEFAULT_SETTINGS, cleanSettings, judge, type Settings, type Sound, type Status } from './soundsFilter.ts';

export const REGIONS = ['PK', 'IN', 'US', 'GB', 'AE', 'SA', 'ID', 'BR'];
const RUN_EVERY_MS = 6 * 3600 * 1000;
const RETRY_AFTER_MS = 45 * 60 * 1000;
const KEEP_DAYS = 60;
const HIST_DAYS = 14;

type RunLog = { at: string; found: number; added: number; failed: number; regions: Record<string, string> };
type State = { enabled: boolean; lastRun: string; log: RunLog[]; settings: Settings };

const getState = (): State => {
  const s = read<State>('soundsState', { enabled: false, lastRun: '', log: [], settings: DEFAULT_SETTINGS });
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  return s;
};
const getSounds = () => read<Record<string, Sound>>('soundsData', {});
let running = false;

export function soundsStatus() {
  const st = getState();
  const last = st.log[0];
  return { ...st, running, regions: REGIONS, total: Object.keys(getSounds()).length, allFailed: !!last && last.failed >= REGIONS.length };
}

/** Every sound with the filter's verdict ("reason" empty = qualified) and a score. */
export function soundsList() {
  const list = Object.values(getSounds());
  const verdicts = judge(list, getState().settings);
  return list.map((s) => ({ ...s, ...verdicts.get(s.id), file: hasSoundFile(s.id) }));
}

export function setSoundsEnabled(on: boolean) {
  write('soundsState', { ...getState(), enabled: on });
  if (on) void runSoundsJob();
}

export function setSoundsSettings(x: unknown) {
  write('soundsState', { ...getState(), settings: cleanSettings(x, getState().settings) });
}

export function setSoundStatus(id: string, status: Status): boolean {
  const s = getSounds()[id];
  if (!s || !['new', 'approved', 'rejected'].includes(status)) return false;
  s.status = status;
  const all = getSounds();
  all[id].status = status;
  addSlugs(all);
  write('soundsData', all);
  if (status === 'approved') void fetchMp3(id);
  return true;
}

/** Every approved sound gets its public address once; it never changes afterwards (so links and Google keep working). */
function addSlugs(all: Record<string, Sound>) {
  const taken = new Set(Object.values(all).map((s) => s.slug).filter(Boolean) as string[]);
  for (const s of Object.values(all)) {
    if (s.status === 'approved' && !s.slug) { s.slug = makeSlug(s.name, s.id, taken); taken.add(s.slug); }
  }
}

/** Saves the MP3 of an approved sound; the result ("" = ok) is kept on the sound for the admin page. */
export async function fetchMp3(id: string): Promise<string> {
  const before = getSounds()[id];
  if (!before) return 'unknown sound';
  const err = hasSoundFile(id) ? '' : await saveSoundMp3(id, before.mp3);
  const all = getSounds(); // read again: the collector may have saved meanwhile
  if (all[id]) { all[id].mp3Error = err; write('soundsData', all); }
  return err;
}

export async function runSoundsJob(): Promise<void> {
  if (running) return;
  running = true;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const sounds = getSounds();
  const log: RunLog = { at: now.toISOString(), found: 0, added: 0, failed: 0, regions: {} };
  try {
    for (const region of REGIONS) {
      try {
        const { hits, source } = await fetchRegion(region);
        log.regions[region] = `ok ${hits.length} (${source})`;
        for (const h of hits) {
          log.found++;
          let s = sounds[h.id];
          if (!s) { s = sounds[h.id] = { ...h, regions: [], days: [], firstSeen: today, lastSeen: today, status: 'new', hist: {}, vs: 2 }; log.added++; }
          if (s.vs !== 2) { s.views = h.views; s.hist = {}; s.vs = 2; } // old numbers counted repeated videos twice
          s.name = h.name || (s.name.startsWith('[object ') ? '' : s.name);
          s.original = h.original;
          if (h.mp3) s.mp3 = h.mp3;
          if (h.video && h.video.views >= (s.video?.views ?? -1)) s.video = h.video;
          s.views = Math.max(s.views, h.views);
          s.videos = Math.max(s.videos, h.videos);
          s.lastSeen = today;
          s.status ??= 'new';
          s.hist ??= {};
          s.hist[today] = Math.max(s.hist[today] ?? 0, h.views);
          if (!s.regions.includes(region)) s.regions.push(region);
          if (!s.days.includes(today)) s.days.push(today);
        }
      } catch (err: any) {
        log.failed++;
        log.regions[region] = `failed: ${String(err?.message || err).slice(0, 100)}`;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    const cutoff = new Date(now.getTime() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
    const histCut = new Date(now.getTime() - HIST_DAYS * 86400000).toISOString().slice(0, 10);
    for (const id of Object.keys(sounds)) {
      const s = sounds[id];
      if (s.lastSeen < cutoff && s.status !== 'approved') { delete sounds[id]; continue; }
      if (s.name.startsWith('[object ')) s.name = '';
      if (s.vs !== 2) {
        if (s.video) { s.views = s.video.views; s.hist = {}; s.vs = 2; } // not seen again: use its saved top video
        else if (!s.status || s.status === 'new') { delete sounds[id]; continue; } // old unchecked number, nothing was decided about it: it comes back when it trends again
      }
      for (const d of Object.keys(s.hist ?? {})) if (d < histCut) delete s.hist[d];
    }
    addSlugs(sounds);
    write('soundsData', sounds);
    const st = getState();
    write('soundsState', { ...st, lastRun: log.at, log: [log, ...st.log].slice(0, 40) });
    for (const s of Object.values(getSounds())) if (s.status === 'approved' && !hasSoundFile(s.id)) await fetchMp3(s.id); // retry missing MP3s of approved sounds
    console.log(`[sounds] run done: ${log.found} found, ${log.added} new, ${log.failed} failed`, log.regions);
  } catch (err) {
    console.warn('[sounds] run failed:', err);
  } finally {
    running = false;
  }
}

/** Called once at startup: checks every 15 min whether a run is due. */
export function startSoundsScheduler() {
  const tick = () => {
    const st = getState();
    if (!st.enabled || running) return;
    const age = Date.now() - (st.lastRun ? Date.parse(st.lastRun) : 0);
    if (age > RUN_EVERY_MS || (st.log[0]?.failed && age > RETRY_AFTER_MS)) void runSoundsJob();
  };
  setTimeout(tick, 60_000).unref();
  setInterval(tick, 15 * 60_000).unref();
}
