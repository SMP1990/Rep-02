import React, { useEffect, useMemo, useState } from 'react';
import { TopHeader } from '../components/TopHeader';
import { Users, RefreshCw, Download, Clock } from 'lucide-react';

interface VisitorsPageProps {
  onOpenMobileMenu: () => void;
}

type Visitor = {
  id: string;
  label: string;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
  downloadCount: number;
  lastDownloadAt?: string;
  lastDownloadType?: string;
  platforms: Record<string, number>;
  segment: string;
};

type Report = {
  total: number;
  totalVisits: number;
  totalDownloads: number;
  returning: number;
  segments: Record<string, number>;
  thresholds: { frequentVisits: number; frequentDownloads: number; inactiveDays: number };
  visitors: Visitor[];
};

const SEGMENT_STYLE: Record<string, string> = {
  'Highly Engaged': 'bg-purple-100 text-purple-800 border-purple-300',
  'Frequent Downloader': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Frequent Visitor': 'bg-blue-100 text-blue-800 border-blue-300',
  'Returning Visitor': 'bg-amber-100 text-amber-800 border-amber-300',
  'New Visitor': 'bg-slate-100 text-slate-700 border-slate-300',
  Inactive: 'bg-rose-100 text-rose-800 border-rose-300',
};

const when = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  const days = Math.round(mins / 1440);
  return days < 30 ? `${days} day${days > 1 ? 's' : ''} ago` : d.toISOString().slice(0, 10);
};

export const VisitorsPage: React.FC<VisitorsPageProps> = ({ onOpenMobileMenu }) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const load = () => {
    setLoading(true);
    fetch('/api/admin/visitors', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setReport(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const shown = useMemo(
    () => (report?.visitors || []).filter((v) => filter === 'All' || v.segment === filter),
    [report, filter]
  );

  const cards = [
    { label: 'Anonymous Visitors', value: report?.total ?? 0, icon: Users },
    { label: 'Total Visits', value: report?.totalVisits ?? 0, icon: RefreshCw },
    { label: 'Returning Visitors', value: report?.returning ?? 0, icon: Clock },
    { label: 'Downloads by Visitors', value: report?.totalDownloads ?? 0, icon: Download },
  ];

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17]">
      <TopHeader onOpenMobileMenu={onOpenMobileMenu} />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-extrabold text-[#2e2440] dark:text-white">Visitors &amp; Engagement</h1>
        <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mb-5">
          Anonymous, cookie-based recognition — no accounts, no personal data, no fingerprinting. The same person counts
          as a new visitor after clearing cookies, or in another browser, in incognito, or on another device.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {cards.map((c) => (
            <div key={c.label} className="bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <c.icon className="w-4 h-4 text-[#6d46b8]" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#726c85] dark:text-[#b5a9cd]">{c.label}</span>
              </div>
              <p className="text-2xl font-extrabold text-[#2e2440] dark:text-white">{c.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {['All', ...Object.keys(report?.segments || {})].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                filter === s
                  ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white border-transparent'
                  : 'bg-white dark:bg-[#181224] text-[#726c85] dark:text-[#b5a9cd] border-[#eae3ee] dark:border-[#2e1d4d]'
              }`}
            >
              {s}
              {s !== 'All' && ` (${report?.segments[s] ?? 0})`}
            </button>
          ))}
          <button onClick={load} className="ml-auto px-3 py-1.5 text-xs font-bold rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] cursor-pointer">
            Refresh
          </button>
        </div>

        <div className="bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] shadow-xs overflow-x-auto">
          {loading && !report ? (
            <p className="p-6 text-xs text-[#726c85] dark:text-[#b5a9cd]">Loading visitor activity…</p>
          ) : shown.length === 0 ? (
            <p className="p-6 text-xs text-[#726c85] dark:text-[#b5a9cd]">
              No visitors recorded yet. They appear here as soon as people browse the site.
            </p>
          ) : (
            <table className="w-full text-left min-w-[680px]">
              <thead className="bg-[#f6f0f4] dark:bg-[#201538]">
                <tr>
                  {['Visitor', 'Segment', 'Visits', 'Downloads', 'Last Download', 'First Seen', 'Last Active'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#726c85] dark:text-[#b5a9cd]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((v) => (
                  <tr key={v.id} className="border-t border-[#eae3ee] dark:border-[#2e1d4d]">
                    <td className="px-4 py-3 text-xs font-bold text-[#2e2440] dark:text-white">
                      {v.label}
                      {Object.keys(v.platforms || {}).length > 0 && (
                        <span className="block text-[10px] font-medium text-[#726c85] dark:text-[#b5a9cd]">
                          {Object.entries(v.platforms).map(([p, n]) => `${p} ×${n}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold border ${SEGMENT_STYLE[v.segment] || SEGMENT_STYLE['New Visitor']}`}>
                        {v.segment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-[#2e2440] dark:text-white">{v.visitCount}</td>
                    <td className="px-4 py-3 text-xs font-bold text-[#2e2440] dark:text-white">{v.downloadCount}</td>
                    <td className="px-4 py-3 text-xs text-[#726c85] dark:text-[#b5a9cd]">
                      {v.lastDownloadAt ? `${when(v.lastDownloadAt)}${v.lastDownloadType ? ` · ${v.lastDownloadType}` : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#726c85] dark:text-[#b5a9cd]">{when(v.firstSeenAt)}</td>
                    <td className="px-4 py-3 text-xs text-[#726c85] dark:text-[#b5a9cd]">{when(v.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {report && (
          <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mt-3">
            Labels use these thresholds: Frequent Visitor from {report.thresholds.frequentVisits} visits, Frequent
            Downloader from {report.thresholds.frequentDownloads} downloads, Inactive after{' '}
            {report.thresholds.inactiveDays} days. They can be changed with the SEGMENT_* environment variables.
          </p>
        )}
      </div>
    </div>
  );
};
