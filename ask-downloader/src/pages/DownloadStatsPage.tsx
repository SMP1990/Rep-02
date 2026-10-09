import React, { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { TopHeader } from '../components/TopHeader';
import { VideoQuality } from '../types/admin';
import { 
  Search,
  Filter,
  Trash2,
  Copy,
  Check,
  HardDrive,
  Film,
  Music,
  Calendar,
  Volume2,
  VolumeX,
  DownloadCloud,
  Zap 
} from 'lucide-react';

interface DownloadStatsPageProps {
  onOpenMobileMenu: () => void;
}

export const DownloadStatsPage: React.FC<DownloadStatsPageProps> = ({ onOpenMobileMenu }) => {
  const { 
    downloadStats,
    downloadTotals,
    deleteDownloadStat, 
    showToast, 
    simulateLiveDownload, 
    notificationSoundEnabled, 
    toggleNotificationSound,
    siteSettings
  } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<'All' | VideoQuality>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered downloads
  const filteredDownloads = useMemo(() => {
    return downloadStats.filter((stat) => {
      const matchesSearch = 
        String(stat.videoTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(stat.videoUrl || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (stat.ipCountry && stat.ipCountry.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesQuality = selectedQuality === 'All' || stat.quality === selectedQuality;

      return matchesSearch && matchesQuality;
    });
  }, [downloadStats, searchQuery, selectedQuality]);

  // Calculations
  const count1080p = downloadTotals.byQuality['1080p'] ?? downloadStats.filter(d => d.quality === '1080p').length;
  const count720p = downloadTotals.byQuality['720p'] ?? downloadStats.filter(d => d.quality === '720p').length;
  const countMP3 = downloadTotals.byQuality['MP3'] ?? downloadStats.filter(d => d.quality === 'MP3').length;

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('Video link copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-fade-in">
      <TopHeader
        title="Download Analytics & Logs"
        subtitle="Detailed records of public video conversion jobs, stream resolutions, and bandwidth."
        onOpenMobileMenu={onOpenMobileMenu}
      />

      {/* REAL-TIME EVENT MONITOR & TEST SIMULATION BANNER */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-900/90 via-[#4b2e83] to-[#2e1d4d] text-white shadow-lg shadow-[#4b2e83]/15 border border-purple-500/20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <DownloadCloud className="w-5 h-5 text-purple-200" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-white">
                Real-Time Video Download Stream
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Listener Active</span>
              </span>
            </div>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Admin notification toasts trigger with audio chimes whenever users complete public downloads or convert media streams.
            </p>
          </div>
        </div>

        {/* Live Simulation Trigger Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          <button
            onClick={toggleNotificationSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              notificationSoundEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-white/10 text-white/60 border-white/10 hover:bg-white/15'
            }`}
            title="Toggle notification chime sound"
          >
            {notificationSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Sound {notificationSoundEnabled ? 'ON' : 'MUTED'}</span>
          </button>

          <button
            onClick={() => simulateLiveDownload({ quality: '1080p' })}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#181224] text-[#4b2e83] hover:bg-purple-50 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02]"
          >
            <Zap className="w-3.5 h-3.5 text-[#e6799f]" />
            <span>Simulate 1080p Download</span>
          </button>

          <button
            onClick={() => simulateLiveDownload({ quality: 'MP3' })}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#e6799f] to-[#d84e7a] text-white hover:opacity-95 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02]"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Simulate MP3 Audio</span>
          </button>
        </div>
      </div>

      {/* SUMMARY BANNER CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setSelectedQuality('All')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedQuality === 'All'
              ? 'bg-[#2e2440] text-white border-[#2e2440] shadow-md'
              : 'bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white border-[#e6799f]/15 hover:border-[#6d46b8]'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            Total Requests
          </div>
          <div className="font-heading text-2xl font-bold mt-1">
            {downloadTotals.total || downloadStats.length}
          </div>
          <div className="text-xs opacity-75 mt-0.5">All formats</div>
        </button>

        <button
          onClick={() => setSelectedQuality('1080p')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedQuality === '1080p'
              ? 'bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] text-white border-transparent shadow-md'
              : 'bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white border-[#e6799f]/15 hover:border-[#6d46b8]'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            1080p Full HD
          </div>
          <div className="font-heading text-2xl font-bold mt-1 text-purple-600">
            {count1080p}
          </div>
          <div className="text-xs opacity-75 mt-0.5">Highest quality</div>
        </button>

        <button
          onClick={() => setSelectedQuality('720p')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedQuality === '720p'
              ? 'bg-gradient-to-r from-[#6d46b8] to-[#e6799f] text-white border-transparent shadow-md'
              : 'bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white border-[#e6799f]/15 hover:border-[#e6799f]'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            720p HD Video
          </div>
          <div className="font-heading text-2xl font-bold mt-1 text-pink-600">
            {count720p}
          </div>
          <div className="text-xs opacity-75 mt-0.5">Standard HD</div>
        </button>

        <button
          onClick={() => setSelectedQuality('MP3')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedQuality === 'MP3'
              ? 'bg-amber-600 text-white border-transparent shadow-md'
              : 'bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white border-[#e6799f]/15 hover:border-amber-500'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            MP3 Audio Only
          </div>
          <div className="font-heading text-2xl font-bold mt-1 text-amber-600">
            {countMP3}
          </div>
          <div className="text-xs opacity-75 mt-0.5">Audio extractions</div>
        </button>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-[#181224] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#a29cb2] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by video title, Facebook URL, or country..."
            className="w-full pl-10 pr-4 py-2 text-sm text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:outline-hidden focus:border-[#7c4fd1] focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quality Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#6d46b8]" />
            Quality:
          </span>
          {(['All', '1080p', '720p', '360p', 'MP3'] as const).map((q) => (
            <button
              key={q}
              onClick={() => setSelectedQuality(q)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedQuality === q
                  ? 'bg-gradient-to-r from-[#6d46b8] to-[#e6799f] text-white shadow-xs'
                  : 'bg-[#f6f0f4] dark:bg-[#201538] text-[#726c85] dark:text-[#b5a9cd] hover:bg-[#f1e9fb] hover:text-[#4b2e83]'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* DOWNLOADS LOG TABLE */}
      <div className="bg-white dark:bg-[#181224] rounded-[22px] shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#f1e9fb] bg-[#f6f0f4]/60 text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
                <th className="py-3.5 px-6">Video Details & URL</th>
                <th className="py-3.5 px-4">Quality Format</th>
                <th className="py-3.5 px-4">File Size</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f6f0f4] text-sm">
              {filteredDownloads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#726c85] dark:text-[#b5a9cd]">
                    <Film className="w-8 h-8 text-[#a29cb2] mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-[#2e2440] dark:text-white">No download logs match your criteria.</p>
                    <p className="text-xs text-[#a29cb2] mt-1">Try changing the quality filter or search keywords.</p>
                  </td>
                </tr>
              ) : (
                filteredDownloads.map((stat) => (
                  <tr key={stat.id} className="hover:bg-[#fcfaff] transition-colors group">
                    <td className="py-4 px-6 max-w-sm">
                      <div className="font-semibold text-[#2e2440] dark:text-white line-clamp-1">
                        {stat.videoTitle}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#a29cb2]">
                        <span className="font-mono truncate max-w-[220px]">
                          {stat.videoUrl}
                        </span>
                        <button
                          onClick={() => handleCopy(stat.id, stat.videoUrl)}
                          title="Copy Link"
                          className="hover:text-[#6d46b8] cursor-pointer"
                        >
                          {copiedId === stat.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        stat.quality === '1080p'
                          ? 'bg-purple-100 text-[#6d46b8]'
                          : stat.quality === '720p'
                          ? 'bg-pink-100 text-[#d9628c]'
                          : stat.quality === 'MP3'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {stat.quality === 'MP3' ? <Music className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                        {stat.quality}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs font-medium text-[#2e2440] dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5 text-[#a29cb2]" />
                        <span>{stat.fileSize}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs text-[#726c85] dark:text-[#b5a9cd] whitespace-nowrap">
                      {stat.duration}
                    </td>

                    <td className="py-4 px-4 text-xs text-[#726c85] dark:text-[#b5a9cd] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#a29cb2]" />
                        <span>{stat.downloadedAt}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => deleteDownloadStat(stat.id)}
                        title="Delete log entry"
                        className="p-1.5 text-[#a29cb2] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-[#fcfaff] dark:bg-[#1f1730] border-t border-[#f1e9fb] dark:border-white/10 flex items-center justify-between text-xs text-[#726c85] dark:text-[#b5a9cd]">
          <span>
            Displaying <strong>{filteredDownloads.length}</strong> conversion logs
          </span>
          <span className="text-[11px] text-[#6b6480] dark:text-[#a29cb2]">
            Data synced with {siteSettings?.siteName} CDN proxy
          </span>
        </div>
      </div>
    </div>
  );
};
