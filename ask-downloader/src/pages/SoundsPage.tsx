import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TopHeader } from '../components/TopHeader';
import { useAdmin } from '../context/AdminContext';

type Sound = {
  id: string; name: string; creator: string; duration: number; original: boolean; views: number;
  videos: number; regions: string[]; days: string[]; firstSeen: string; lastSeen: string;
};
type Run = { at: string; found: number; added: number; regions: Record<string, string> };
type Status = { enabled: boolean; lastRun: string; log: Run[]; running: boolean; total: number };

const card = 'bg-white dark:bg-[#181129] rounded-2xl border border-[#eae3ee] dark:border-white/10 shadow-xs';
const btn = 'px-4 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 cursor-pointer bg-[#6d46b8] hover:bg-[#4b2e83]';

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
  const [onlyOriginal, setOnlyOriginal] = useState(false);

  const load = useCallback(async () => {
    const d = await call('GET', '/api/admin/sounds');
    if (d.status) { setStatus(d.status); setSounds(d.sounds || []); }
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
    if (d.success) { setStatus(d.status); showToast('Run started (about 30 seconds).', 'info'); }
  };

  const rows = useMemo(
    () => sounds.filter((s) => !onlyOriginal || s.original).sort((a, b) => b.views - a.views).slice(0, 300),
    [sounds, onlyOriginal],
  );
  const originals = sounds.filter((s) => s.original).length;
  const repeats = sounds.filter((s) => s.days.length > 1).length;

  return (
    <div className="animate-fade-in">
      <TopHeader title="Trending Sounds" subtitle="Step A: collects trending TikTok sounds twice a day. Only you can see this." onOpenMobileMenu={onOpenMobileMenu} />

      <div className={`${card} p-5 mb-6`}>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={toggle} className={btn}>{status?.enabled ? 'Turn OFF' : 'Turn ON'}</button>
          <button onClick={runNow} disabled={!status?.enabled || status?.running} className={btn}>{status?.running ? 'Running…' : 'Run now'}</button>
          <span className="text-sm">Status: <b>{status?.enabled ? 'ON' : 'OFF'}</b> · Last run: {status?.lastRun ? new Date(status.lastRun).toLocaleString() : 'never'}</span>
        </div>
        <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-3">
          {sounds.length} sounds saved · {originals} are "original sound" · {repeats} seen on more than one day
        </p>
        {status?.log[0] && (
          <p className="text-xs mt-2">Last run: {Object.entries(status.log[0].regions).map(([r, v]) => `${r} ${v}`).join(' · ')}</p>
        )}
      </div>

      <div className={`${card} p-5`}>
        <label className="text-sm flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={onlyOriginal} onChange={(e) => setOnlyOriginal(e.target.checked)} /> Only "original sound"
        </label>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead><tr className="text-[#726c85] dark:text-[#b5a9cd]">
              <th className="py-2 pr-3">Sound</th><th className="pr-3">Creator</th><th className="pr-3">Sec</th><th className="pr-3">Views</th>
              <th className="pr-3">Regions</th><th className="pr-3">Days</th><th>First seen</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-[#eae3ee] dark:border-white/10">
                  <td className="py-2 pr-3 max-w-[260px] truncate" title={s.name}>{s.name}</td>
                  <td className="pr-3">{s.creator}</td><td className="pr-3">{s.duration}</td><td className="pr-3">{fmt(s.views)}</td>
                  <td className="pr-3">{s.regions.join(', ')}</td><td className="pr-3">{s.days.length}</td><td>{s.firstSeen}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="py-6 text-center text-[#726c85]">No data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
