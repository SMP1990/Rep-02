/**
 * Trending Sounds, step A (collect only, nothing public).
 * Twice a day (and at once when the last run is older than 12 h, because the
 * host may restart the Node process) the trending videos of 4 regions are
 * read and their sounds are saved in the data folder. Errors are only logged.
 * Admin switch + data view: soundsRoutes.ts. See ../PLAN-TRENDING-SOUNDS.md.
 */
import { read, write } from './store.ts';
import { fetchRegion, type SoundHit } from './soundsFetch.ts';

export const REGIONS = ['PK', 'BR', 'GB', 'ID'];
const RUN_EVERY_MS = 12 * 3600 * 1000;
const KEEP_DAYS = 60;

export type Sound = SoundHit & { regions: string[]; days: string[]; firstSeen: string; lastSeen: string };
type RunLog = { at: string; found: number; added: number; regions: Record<string, string> };
type State = { enabled: boolean; lastRun: string; log: RunLog[] };

const getState = () => read<State>('soundsState', { enabled: false, lastRun: '', log: [] });
const getSounds = () => read<Record<string, Sound>>('soundsData', {});
let running = false;

export const soundsStatus = () => ({ ...getState(), running, regions: REGIONS, total: Object.keys(getSounds()).length });
export const soundsList = () => Object.values(getSounds());

export function setSoundsEnabled(on: boolean) {
  write('soundsState', { ...getState(), enabled: on });
  if (on) void runSoundsJob();
}

export async function runSoundsJob(): Promise<void> {
  if (running) return;
  running = true;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const sounds = getSounds();
  const log: RunLog = { at: now.toISOString(), found: 0, added: 0, regions: {} };
  try {
    for (const region of REGIONS) {
      try {
        const hits = await fetchRegion(region);
        log.regions[region] = `ok ${hits.length}`;
        for (const h of hits) {
          log.found++;
          let s = sounds[h.id];
          if (!s) { s = sounds[h.id] = { ...h, regions: [], days: [], firstSeen: today, lastSeen: today }; log.added++; }
          s.views = Math.max(s.views, h.views);
          s.videos = Math.max(s.videos, h.videos);
          s.lastSeen = today;
          if (!s.regions.includes(region)) s.regions.push(region);
          if (!s.days.includes(today)) s.days.push(today);
        }
      } catch (err: any) {
        log.regions[region] = `failed: ${String(err?.message || err).slice(0, 80)}`;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    const cutoff = new Date(now.getTime() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
    for (const id of Object.keys(sounds)) if (sounds[id].lastSeen < cutoff) delete sounds[id];
    write('soundsData', sounds);
    const st = getState();
    write('soundsState', { ...st, lastRun: log.at, log: [log, ...st.log].slice(0, 40) });
    console.log(`[sounds] run done: ${log.found} found, ${log.added} new`, log.regions);
  } catch (err) {
    console.warn('[sounds] run failed:', err);
  } finally {
    running = false;
  }
}

/** Called once at startup: checks every 30 min whether a run is due. */
export function startSoundsScheduler() {
  const tick = () => {
    const st = getState();
    if (!st.enabled) return;
    if (!st.lastRun || Date.now() - Date.parse(st.lastRun) > RUN_EVERY_MS) void runSoundsJob();
  };
  setTimeout(tick, 60_000).unref();
  setInterval(tick, 30 * 60_000).unref();
}
