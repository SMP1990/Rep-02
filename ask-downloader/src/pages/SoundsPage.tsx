import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TopHeader } from '../components/TopHeader';
import { useAdmin } from '../context/AdminContext';

type Sound = {
  id: string; name: string; creator: string; duration: number; original: boolean; views: number;
  regions: string[]; days: string[]; firstSeen: string; status?: string; reason?: string; score?: number;
  video?: { id: string; user: string; views: number };
  vs?: number;
};
type Settings = { minViews: number; minSec: number; maxSec: number; perCreator: number; excludeMusic: boolean };
type Status = {
  enabled: boolean; lastRun: string; running: boolean; allFailed: boolean; settings: Settings;
  log: { regions: Record<string, string> }[];
};

const card = 'bg-white dark:bg-[#181129] rounded-2xl border border-[#eae3ee] dark:border-white/10 shadow-xs';
const btn = 'px-4 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 cursor-pointer bg-[#6d46b8] hover:bg-[#4b2e83]';
const box = 'w-24 px-2.5 py-1.5 rounded-lg text-sm bg-[#f6f0f4] dark:bg-[#0e0a17] border border-[#eae3ee] dark:border-white/10';
const mini = 'px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer text-white';

async function call(method: string, url: string, body?: unknown) {
  const r = await fetch(url, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json().catch(() => ({ success: false }));
}

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n));

export const SoundsPage: React.FC<{ onOpenMobileMenu: () => void }> = ({ onOpenMobileMenu }) => {
  const { showToast } = useAdmin();
  const [status, setStatus] = useState<Status | null>(null);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [set, setSet] = useState<Settings | null>(null);
  const [show, setShow] = useState('qualified');

  const load = useCallback(async () => {
    const d = await call('GET', '/api/admin/sounds');
    if (!d.status) return;
    setStatus(d.status);
    setSounds(d.sounds || []);
    setSet((cur) => cur ?? d.status.settings);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!status?.running) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [status?.running, load]);

  const toggle = async () => {
    const d = await call('POST', '/api/admin/sounds/enabled', { enabled: !status?.enabled });
    if (!d.success) return showToast('Could not save.', 'error');
    setStatus(d.status);
    showToast(d.status.enabled ? 'Collector is ON.' : 'Collector is OFF.', 'info');
  };
  const runNow = async () => {
    const d = await call('POST', '/api/admin/sounds/run');
    if (d.success) { setStatus(d.status); showToast('Run started (about 1 minute).', 'info'); }
  };
  const saveSettings = async () => {
    const d = await call('POST', '/api/admin/sounds/settings', set);
    if (!d.success) return showToast('Could not save.', 'error');
    setStatus(d.status); setSounds(d.sounds); setSet(d.status.settings);
    showToast('Filter saved.', 'success');
  };
  const mark = async (id: string, to: string) => {
    const d = await call('POST', '/api/admin/sounds/status', { id, status: to });
    if (d.success) setSounds(d.sounds);
  };

  const rows = useMemo(() => {
    const f = (s: Sound) =>
      show === 'all' ? true : show === 'qualified' ? !s.reason : show === 'approved' ? s.status === 'approved'
        : show === 'rejected' ? s.status === 'rejected' : !!s.reason && s.status !== 'rejected';
    return sounds.filter(f).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 300);
  }, [sounds, show]);
  const qualified = sounds.filter((s) => !s.reason).length;
  const field = (k: keyof Settings, label: string) => (
    <label className="text-xs flex flex-col gap-1">{label}
      <input className={box} type="number" value={set ? (set[k] as number) : ''} onChange={(e) => setSet({ ...set!, [k]: Number(e.target.value) })} />
    </label>
  );

  return (
    <div className="animate-fade-in">
      <TopHeader title="Trending Sounds" subtitle="Collects trending TikTok sounds four times a day. Only you can see this." onOpenMobileMenu={onOpenMobileMenu} />

      {status?.allFailed && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
          The last run failed in every region. The system tries again in about 45 minutes. Old data is kept.
        </div>
      )}

      <div className={`${card} p-5 mb-6`}>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={toggle} className={btn}>{status?.enabled ? 'Turn OFF' : 'Turn ON'}</button>
          <button onClick={runNow} disabled={!status?.enabled || status?.running} className={btn}>{status?.running ? 'Running…' : 'Run now'}</button>
          <span className="text-sm">Status: <b>{status?.enabled ? 'ON' : 'OFF'}</b> · Last run: {status?.lastRun ? new Date(status.lastRun).toLocaleString() : 'never'}</span>
        </div>
        <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-3">{sounds.length} sounds saved · {qualified} pass the filter</p>
        {status?.log[0] && <p className="text-xs mt-2">Last run: {Object.entries(status.log[0].regions).map(([r, v]) => `${r} ${v}`).join(' · ')}</p>}
      </div>

      {set && (
        <div className={`${card} p-5 mb-6`}>
          <h2 className="text-sm font-bold mb-3">Filter (sounds are never deleted by it, only hidden from the list)</h2>
          <div className="flex flex-wrap items-end gap-3">
            {field('minViews', 'Min views')}{field('minSec', 'Min seconds')}{field('maxSec', 'Max seconds')}{field('perCreator', 'Per creator')}
            <label className="text-xs flex items-center gap-2 pb-2 cursor-pointer">
              <input type="checkbox" checked={set.excludeMusic} onChange={(e) => setSet({ ...set, excludeMusic: e.target.checked })} /> No songs
            </label>
            <button onClick={saveSettings} className={btn}>Save</button>
          </div>
        </div>
      )}

      <div className={`${card} p-5`}>
        <select className={`${box} w-auto mb-3`} value={show} onChange={(e) => setShow(e.target.value)}>
          <option value="qualified">Passed the filter</option><option value="approved">Approved</option>
          <option value="rejected">Rejected</option><option value="out">Filtered out</option><option value="all">All</option>
        </select>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead><tr className="text-[#726c85] dark:text-[#b5a9cd]">
              <th className="py-2 pr-3">Sound</th><th className="pr-3">Creator</th><th className="pr-3">Sec</th><th className="pr-3" title="Views of the most viewed trending video that uses this sound (open Video to see the same number)">Top video views</th>
              <th className="pr-3">Regions</th><th className="pr-3">Days</th><th className="pr-3">Score</th><th className="pr-3">Filter</th><th className="pr-3">Check on TikTok</th><th>Review</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-[#eae3ee] dark:border-white/10">
                  <td className="py-2 pr-3 max-w-[240px] truncate" title={s.name}>{s.name}</td>
                  <td className="pr-3">{s.creator}</td><td className="pr-3">{s.duration}</td><td className="pr-3" title={s.vs === 2 ? undefined : "Old number, not verified. It is refreshed when the sound trends again."}>{fmt(s.views)}{s.vs === 2 ? "" : " ?"}</td>
                  <td className="pr-3">{s.regions.join(', ')}</td><td className="pr-3">{s.days.length}</td><td className="pr-3">{s.score}</td>
                  <td className="pr-3">{s.reason || 'ok'}</td>
                  <td className="pr-3 whitespace-nowrap text-[#6d46b8] font-bold">
                    {s.video && <a href={`https://www.tiktok.com/@${s.video.user}/video/${s.video.id}`} target="_blank" rel="noopener noreferrer" title={`Video with ${fmt(s.video.views)} views when fetched`}>Video</a>}
                    {s.video && ' · '}
                    <a href={`https://www.tiktok.com/music/x-${s.id}`} target="_blank" rel="noopener noreferrer">Sound</a>
                  </td>
                  <td className="whitespace-nowrap">
                    {s.status !== 'approved' && <button className={`${mini} bg-green-600 mr-1`} onClick={() => mark(s.id, 'approved')}>Approve</button>}
                    {s.status !== 'rejected' && <button className={`${mini} bg-red-600`} onClick={() => mark(s.id, 'rejected')}>Reject</button>}
                    {(s.status === 'approved' || s.status === 'rejected') && <button className={`${mini} bg-gray-500 ml-1`} onClick={() => mark(s.id, 'new')}>Undo</button>}
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={10} className="py-6 text-center text-[#726c85]">Nothing here.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
