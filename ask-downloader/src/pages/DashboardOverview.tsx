import React, { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { TopHeader } from '../components/TopHeader';
import { 
  DownloadCloud,
  Users,
  Film,
  BookOpen,
  TrendingUp,
  ArrowUpRight,
  Clock,
  ChevronRight,
  FileEdit,
  BarChart2,
  MessageSquare 
} from 'lucide-react';

interface DashboardOverviewProps {
  onOpenMobileMenu: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onOpenMobileMenu }) => {
  const { subscribers, downloadStats, downloadTotals, blogPosts, setCurrentRoute, contactMessages, unreadMessagesCount } = useAdmin();
  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d');
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);

  // Stats calculation
  const totalSubscribers = subscribers.length;
  const publishedBlogPosts = blogPosts.filter(p => p.status === 'published').length;
  const draftBlogPosts = blogPosts.filter(p => p.status === 'draft').length;

  // Mock aggregated stats based on download data
  // Real count from the server, not an invented baseline.
  const totalDownloadsCount = downloadTotals.total;
  const mostDownloaded = downloadStats[0] || {
    videoTitle: 'Grand Canyon Scenic 4K Drone Footage • Nature Documentary',
    quality: '1080p',
    fileSize: '48.2 MB',
  };

  // Real chart data, built from the per-day download counts the server
  // keeps. These used to be hardcoded arrays, so the chart showed made-up
  // traffic that never changed.
  const dayKey = (d: Date) => {
    // Local date, not UTC — otherwise "today" can be off by a day.
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const shortDate = (d: Date) => `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;

  const chartData7Days = useMemo(() => {
    const out: Array<{ label: string; downloads: number; quality1080: number; mp3: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      const q = downloadTotals.byDateQuality?.[key] || {};
      out.push({
        label: i === 0 ? `${shortDate(d)} (Today)` : shortDate(d),
        downloads: downloadTotals.byDate?.[key] || 0,
        quality1080: q['1080p'] || 0,
        mp3: q['MP3'] || 0,
      });
    }
    return out;
  }, [downloadTotals]);

  const chartData30Days = useMemo(() => {
    const out: Array<{ label: string; downloads: number; quality1080: number; mp3: number }> = [];
    for (let w = 3; w >= 0; w--) {
      const end = new Date();
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      let downloads = 0, quality1080 = 0, mp3 = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const key = dayKey(d);
        downloads += downloadTotals.byDate?.[key] || 0;
        const q = downloadTotals.byDateQuality?.[key] || {};
        quality1080 += q['1080p'] || 0;
        mp3 += q['MP3'] || 0;
      }
      out.push({ label: `${shortDate(start)} – ${shortDate(end)}`, downloads, quality1080, mp3 });
    }
    return out;
  }, [downloadTotals]);

  const currentChartData = chartRange === '7d' ? chartData7Days : chartData30Days;
  const periodTotal = currentChartData.reduce((s, d) => s + d.downloads, 0);
  const busiest = periodTotal > 0
    ? currentChartData.reduce((a, d) => (d.downloads > a.downloads ? d : a), currentChartData[0])
    : null;
  const maxDownloadValue = Math.max(1, ...currentChartData.map(d => d.downloads));

  return (
    <div className="animate-fade-in">
      <TopHeader
        title="Dashboard Overview"
        subtitle="Real-time control metrics, video download activity, and blog performance."
        onOpenMobileMenu={onOpenMobileMenu}
        actionButton={{
          label: "New Blog Post",
          onClick: () => setCurrentRoute('blog-manager'),
        }}
      />

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Card 1: Total Downloads */}
        <div className="bg-white dark:bg-[#181224] rounded-[20px] p-5 sm:p-6 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
              Total Downloads
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#f1e9fb] flex items-center justify-center text-[#6d46b8] group-hover:scale-105 transition-transform">
              <DownloadCloud className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-[#2e2440] dark:text-white">
              {totalDownloadsCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+18.4%</span>
            <span className="text-[#a29cb2] font-normal">vs last week</span>
          </div>
          <div className="mt-2 text-[11px] text-[#726c85] dark:text-[#b5a9cd]">
            1080p Full HD & MP3 audio peak traffic
          </div>
        </div>

        {/* Card 2: Newsletter Subscribers */}
        <div className="bg-white dark:bg-[#181224] rounded-[20px] p-5 sm:p-6 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
              Subscribers
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#fdedf1] flex items-center justify-center text-[#e6799f] group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-[#2e2440] dark:text-white">
              {totalSubscribers}
            </span>
            <span className="text-xs font-semibold text-[#6d46b8] bg-[#f1e9fb] px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-emerald-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+9 new</span>
            <span className="text-[#a29cb2] font-normal">this month</span>
          </div>
          <button
            onClick={() => setCurrentRoute('subscribers')}
            className="mt-2 text-[11px] text-[#6d46b8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Manage newsletter list</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 3: Most Downloaded Video */}
        <div className="bg-white dark:bg-[#181224] rounded-[20px] p-5 sm:p-6 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
              Top Video Clip
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#f1e9fb] flex items-center justify-center text-[#7c4fd1] group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5" />
            </div>
          </div>
          <div className="font-heading text-sm font-bold text-[#2e2440] dark:text-white line-clamp-2 leading-tight">
            {mostDownloaded.videoTitle}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#e6799f]/15 text-[#d9628c]">
              {mostDownloaded.quality}
            </span>
            <span className="text-[#726c85] dark:text-[#b5a9cd] text-xs">{mostDownloaded.fileSize}</span>
            <span className="text-emerald-600 text-xs font-semibold ml-auto">
              1,420 DLs
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#a29cb2]">
            Viral Facebook Reel
          </div>
        </div>

        {/* Card 4: Total Blog Posts */}
        <div className="bg-white dark:bg-[#181224] rounded-[20px] p-5 sm:p-6 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
              Blog Articles
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#fdedf1] flex items-center justify-center text-[#d9628c] group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-[#2e2440] dark:text-white">
              {blogPosts.length}
            </span>
            <span className="text-xs text-[#726c85] dark:text-[#b5a9cd]">total posts</span>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs font-medium">
            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-semibold">
              {publishedBlogPosts} Published
            </span>
            <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-semibold">
              {draftBlogPosts} Drafts
            </span>
          </div>
          <button
            onClick={() => setCurrentRoute('blog-manager')}
            className="mt-2 text-[11px] text-[#6d46b8] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Write or edit articles</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* DOWNLOADS OVER TIME CHART SECTION */}
      <div className="bg-white dark:bg-[#181224] rounded-[22px] p-6 sm:p-7 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#f1e9fb]">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#6d46b8]" />
              <h2 className="font-heading text-lg sm:text-xl font-bold text-[#2e2440] dark:text-white">
                Download Volume Over Time
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#726c85] dark:text-[#b5a9cd] mt-0.5">
              Daily requests processed across 1080p, 720p, 360p, and MP3 formats.
            </p>
          </div>

          {/* Time range switch */}
          <div className="flex items-center gap-1 p-1 bg-[#f6f0f4] dark:bg-[#201538] rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] self-start sm:self-auto">
            <button
              onClick={() => setChartRange('7d')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                chartRange === '7d'
                  ? 'bg-white dark:bg-[#181224] text-[#4b2e83] shadow-xs'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setChartRange('30d')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                chartRange === '30d'
                  ? 'bg-white dark:bg-[#181224] text-[#4b2e83] shadow-xs'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Visual Chart Bars / Visualization */}
        <div className="pt-6">
          <div className="h-64 flex items-end justify-between gap-2 sm:gap-6 pt-6 pb-2 px-2">
            {currentChartData.map((item, idx) => {
              const heightPercent = Math.round((item.downloads / maxDownloadValue) * 100);
              const isHovered = activeChartPoint === idx;
              return (
                <div
                  key={item.label}
                  onMouseEnter={() => setActiveChartPoint(idx)}
                  onMouseLeave={() => setActiveChartPoint(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute -top-16 z-20 px-3 py-2 bg-[#2e2440] text-white text-xs rounded-xl shadow-xl pointer-events-none whitespace-nowrap animate-fade-in border border-white/20">
                      <p className="font-bold text-[#f0a8bf]">{item.label}</p>
                      <p className="text-white font-semibold">
                        {item.downloads.toLocaleString()} total downloads
                      </p>
                      <div className="text-[10px] text-white/70 flex gap-2 mt-0.5">
                        <span>1080p: {item.quality1080.toLocaleString()}</span>
                        <span>•</span>
                        <span>MP3: {item.mp3.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Bar */}
                  <div className="w-full max-w-[48px] bg-[#f1e9fb] rounded-t-xl overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:scale-105 h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        isHovered
                          ? 'bg-gradient-to-t from-[#4b2e83] via-[#7c4fd1] to-[#e6799f]'
                          : 'bg-gradient-to-t from-[#6d46b8] to-[#f0a8bf]'
                      }`}
                    />
                  </div>

                  {/* Label */}
                  <span className="text-[11px] font-medium text-[#726c85] dark:text-[#b5a9cd] mt-3 truncate max-w-full text-center">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#f1e9fb] mt-2 text-xs text-[#726c85] dark:text-[#b5a9cd]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gradient-to-r from-[#6d46b8] to-[#e6799f]" />
                <span>Daily Total Traffic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>{chartRange === '7d' ? 'Last 7 days' : 'Last 4 weeks'}: {periodTotal.toLocaleString()} downloads</span>
              </div>
            </div>
            <div className="font-medium text-[#4b2e83]">
              {busiest
                ? <>Busiest: <span className="font-bold">{busiest.label} ({busiest.downloads.toLocaleString()})</span></>
                : <span className="font-bold">No downloads recorded yet</span>}
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN LOWER SECTION: RECENT DOWNLOADS & QUICK CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Recent Downloads Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#181224] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
          <div className="flex items-center justify-between pb-4 border-b border-[#f1e9fb]">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#2e2440] dark:text-white">
                Recent Video Activity
              </h3>
              <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                Real-time extractions completed on the public downloader
              </p>
            </div>
            <button
              onClick={() => setCurrentRoute('downloads')}
              className="text-xs font-bold text-[#6d46b8] hover:text-[#4b2e83] flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-[#f6f0f4] overflow-x-auto">
            {downloadStats.slice(0, 5).map((stat) => (
              <div key={stat.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#2e2440] dark:text-white truncate">
                    {stat.videoTitle}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#a29cb2]">
                    <span className="font-medium text-[#6d46b8]">{stat.platform}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {stat.downloadedAt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    stat.quality === '1080p'
                      ? 'bg-purple-100 text-[#6d46b8]'
                      : stat.quality === '720p'
                      ? 'bg-pink-100 text-[#d9628c]'
                      : stat.quality === 'MP3'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {stat.quality}
                  </span>
                  <span className="text-xs font-medium text-[#726c85] dark:text-[#b5a9cd] w-16 text-right">
                    {stat.fileSize}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Back-Office Action Cards (1 Column) */}
        <div className="space-y-4">
          {/* Landing Content Editor Shortcut */}
          <div className="bg-gradient-to-br from-[#4b2e83] to-[#6d46b8] text-white rounded-[22px] p-6 shadow-lg shadow-[#4b2e83]/15 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white mb-3">
                <FileEdit className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-lg text-white">
                Landing Content Editor
              </h4>
              <p className="text-xs text-white/80 mt-1 mb-4 leading-relaxed">
                Update the public website's hero tagline, feature cards, and FAQ items without touching code.
              </p>
              <button
                onClick={() => setCurrentRoute('content-editor')}
                className="w-full py-2.5 px-4 bg-white dark:bg-[#181224] text-[#4b2e83] text-xs font-bold rounded-xl hover:bg-[#f1e9fb] transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <span>Edit Site Copy & FAQs</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Direct Contact Inquiries Inbox Card */}
          <div className="bg-white dark:bg-[#181224] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-[#6d46b8] dark:text-[#c498f0] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h4 className="font-heading font-bold text-base text-[#2e2440] dark:text-[#f4eefb]">
                  Contact Messages
                </h4>
              </div>
              {unreadMessagesCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 animate-pulse">
                  {unreadMessagesCount} Unread
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  All Handled
                </span>
              )}
            </div>
            <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mb-4">
              {contactMessages.length} total direct message inquiries received from the public Contact Us form.
            </p>
            <button
              onClick={() => setCurrentRoute('messages')}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f] rounded-xl hover:opacity-95 transition-opacity cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <span>Open Support Inbox</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Newsletter Growth */}
          <div className="bg-white dark:bg-[#181224] rounded-[22px] p-6 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
            <h4 className="font-heading font-bold text-base text-[#2e2440] dark:text-white mb-2">
              Newsletter Quick Action
            </h4>
            <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mb-4">
              You currently have <strong className="text-[#6d46b8]">{totalSubscribers}</strong> active email subscribers waiting for video conversion tips and feature releases.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentRoute('subscribers')}
                className="flex-1 py-2 px-3 text-xs font-bold text-[#6d46b8] bg-[#f1e9fb] hover:bg-[#e4d6fb] rounded-xl transition-colors cursor-pointer text-center"
              >
                View Subscribers
              </button>
              <button
                onClick={() => setCurrentRoute('blog-manager')}
                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl transition-colors cursor-pointer text-center"
              >
                Publish Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
