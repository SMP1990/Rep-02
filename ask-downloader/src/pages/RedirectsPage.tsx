import React, { useEffect, useMemo, useState } from 'react';
import { TopHeader } from '../components/TopHeader';
import { useAdmin } from '../context/AdminContext';
import { ArrowRight, Trash2, Plus, Search, CornerDownRight } from 'lucide-react';

type Redirect = { from: string; to: string; createdAt: string; hits: number };

const card = 'bg-white dark:bg-[#181129] rounded-2xl border border-[#eae3ee] dark:border-white/10 shadow-xs';
const input =
  'w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#f6f0f4] dark:bg-[#0e0a17] border border-[#eae3ee] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#6d46b8]/40';

async function call(method: string, url: string, body?: unknown) {
  const r = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json().catch(() => ({ success: false, error: 'Server error.' }));
}

export const RedirectsPage: React.FC<{ onOpenMobileMenu: () => void }> = ({ onOpenMobileMenu }) => {
  const { showToast } = useAdmin();
  const [list, setList] = useState<Redirect[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    call('GET', '/api/admin/redirects').then((d) => setList(d.redirects || []));
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rows = s ? list.filter((r) => r.from.includes(s) || r.to.toLowerCase().includes(s)) : list;
    return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [list, q]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const d = await call('POST', '/api/admin/redirects', { from, to });
    setSaving(false);
    if (!d.success) return showToast(d.error || 'Could not save redirect.', 'error');
    setList(d.redirects);
    setFrom('');
    setTo('');
    showToast('301 redirect saved.', 'success');
  };

  const remove = async (r: Redirect) => {
    if (!confirm(`Delete redirect ${r.from} → ${r.to}?`)) return;
    const d = await call('DELETE', `/api/admin/redirects?from=${encodeURIComponent(r.from)}`);
    if (!d.success) return showToast(d.error || 'Could not delete.', 'error');
    setList(d.redirects);
    showToast('Redirect deleted.', 'info');
  };

  return (
    <div className="animate-fade-in">
      <TopHeader
        title="301 Redirects"
        subtitle="Send old or changed URLs permanently to their new address, so backlinks and Google rankings are kept."
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <form onSubmit={add} className={`${card} p-5 mb-6`}>
        <h2 className="text-sm font-bold mb-1">Add a redirect</h2>
        <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mb-4">
          Changing a published post's URL in Blog Manager adds its redirect automatically — use this for anything else.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
          <input className={input} placeholder="Old URL, e.g. /blog/old-post" value={from} onChange={(e) => setFrom(e.target.value)} />
          <ArrowRight className="w-4 h-4 text-[#6d46b8] hidden md:block" />
          <input className={input} placeholder="New URL, e.g. /blog/new-post" value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            disabled={saving || !from.trim() || !to.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#6d46b8] hover:bg-[#4b2e83] text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add 301
          </button>
        </div>
      </form>

      <div className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-[#eae3ee] dark:border-white/10">
          <h2 className="text-sm font-bold">Active redirects ({list.length})</h2>
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a29cb2]" />
            <input className={`${input} pl-9 py-2`} placeholder="Search URLs" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#726c85] dark:text-[#b5a9cd]">
            {list.length ? 'No redirect matches your search.' : 'No redirects yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-[#eae3ee] dark:divide-white/10">
            {shown.map((r) => (
              <li key={r.from} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-mono truncate text-[#2e2440] dark:text-white">{r.from}</p>
                  <p className="font-mono truncate text-[#6d46b8] dark:text-[#a78bda] flex items-center gap-1">
                    <CornerDownRight className="w-3.5 h-3.5 shrink-0" /> {r.to}
                  </p>
                </div>
                <div className="text-right text-[11px] text-[#726c85] dark:text-[#b5a9cd] shrink-0">
                  <p className="font-bold">{r.hits || 0} hits</p>
                  <p>{r.createdAt.slice(0, 10)}</p>
                </div>
                <button
                  onClick={() => remove(r)}
                  title="Delete redirect"
                  className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
