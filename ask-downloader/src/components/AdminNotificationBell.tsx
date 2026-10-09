import React, { useState, useRef, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { 
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  DownloadCloud,
  MessageSquare,
  Volume2,
  VolumeX,
  Sparkles,
  Clock 
} from 'lucide-react';

export const AdminNotificationBell: React.FC = () => {
  const {
    notificationsHistory,
    unreadNotificationsCount,
    notificationSoundEnabled,
    toggleNotificationSound,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotificationsHistory,
    simulateLiveDownload,
    simulateLiveComment,
    setCurrentRoute,
    approveBlogComment,
  } = useAdmin();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'downloads' | 'comments'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredNotifications = notificationsHistory.filter((item) => {
    if (filter === 'downloads') return item.type === 'download';
    if (filter === 'comments') return item.type === 'comment';
    return true;
  });

  const handleOpenItem = (item: typeof notificationsHistory[0]) => {
    markNotificationAsRead(item.id);
    if (item.type === 'download') {
      setCurrentRoute('downloads');
    } else if (item.type === 'comment') {
      setCurrentRoute('blog-manager');
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="btn-admin-notifications-bell"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-[#f1e9fb] dark:bg-[#281b40] text-[#6d46b8] dark:text-[#c4a9f3] border-[#6d46b8]/40 shadow-xs'
            : unreadNotificationsCount > 0
            ? 'bg-white dark:bg-[#1f1730] text-[#4b2e83] dark:text-[#f1e9fb] border-[#e6799f]/30 hover:border-[#6d46b8] shadow-xs'
            : 'bg-white dark:bg-[#1f1730] text-[#726c85] dark:text-[#a29cb2] border-[#eae3ee] dark:border-white/10 hover:border-[#6d46b8] shadow-xs'
        }`}
        aria-label="Real-time Admin Notifications"
        title="Real-time Admin Notifications"
      >
        {unreadNotificationsCount > 0 ? (
          <BellRing className="w-5 h-5 text-[#6d46b8] dark:text-[#c4a9f3] animate-swing" />
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {/* Unread Counter Badge */}
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-gradient-to-r from-[#e6799f] to-[#d84e7a] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs border-2 border-white dark:border-[#140e21]">
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div 
          id="admin-notifications-popover"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1a1329] rounded-2xl shadow-2xl border border-[#eae3ee] dark:border-white/10 text-[#2e2440] dark:text-[#f1e9fb] z-[9999] overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#eae3ee] dark:border-white/10 bg-gradient-to-r from-[#fcfaff] to-[#f6f0f4] dark:from-[#211835] dark:to-[#1a1329] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm text-[#2e2440] dark:text-white">
                Live Notifications
              </span>
              {unreadNotificationsCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f1e9fb] dark:bg-[#322055] text-[#6d46b8] dark:text-[#c4a9f3]">
                  {unreadNotificationsCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                onClick={toggleNotificationSound}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  notificationSoundEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'
                }`}
                title={notificationSoundEnabled ? 'Alert Chime Sound: ON' : 'Alert Chime Sound: MUTED'}
              >
                {notificationSoundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Mark all as read */}
              {unreadNotificationsCount > 0 && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Simulation Bar (Allows instant testing) */}
          <div className="px-3 py-2 bg-[#f1e9fb]/40 dark:bg-white/[0.02] border-b border-[#eae3ee] dark:border-white/10 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[#6d46b8] dark:text-[#c4a9f3] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Simulate Real-Time:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => simulateLiveDownload()}
                className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
              >
                + Download
              </button>
              <button
                onClick={() => simulateLiveComment()}
                className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-pink-100 hover:bg-pink-200 dark:bg-pink-950/80 dark:hover:bg-pink-900 text-pink-800 dark:text-pink-200 border border-pink-200 dark:border-pink-800 transition-colors cursor-pointer"
              >
                + Comment
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex border-b border-[#eae3ee] dark:border-white/10 text-xs px-3 pt-2 gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`pb-2 font-bold transition-all relative cursor-pointer ${
                filter === 'all'
                  ? 'text-[#6d46b8] dark:text-[#c4a9f3]'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-[#a29cb2]'
              }`}
            >
              <span>All ({notificationsHistory.length})</span>
              {filter === 'all' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6d46b8]" />
              )}
            </button>
            <button
              onClick={() => setFilter('downloads')}
              className={`pb-2 font-bold transition-all relative cursor-pointer ${
                filter === 'downloads'
                  ? 'text-[#6d46b8] dark:text-[#c4a9f3]'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-[#a29cb2]'
              }`}
            >
              <span>Downloads ({notificationsHistory.filter(n => n.type === 'download').length})</span>
              {filter === 'downloads' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6d46b8]" />
              )}
            </button>
            <button
              onClick={() => setFilter('comments')}
              className={`pb-2 font-bold transition-all relative cursor-pointer ${
                filter === 'comments'
                  ? 'text-[#6d46b8] dark:text-[#c4a9f3]'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-[#a29cb2]'
              }`}
            >
              <span>Comments ({notificationsHistory.filter(n => n.type === 'comment').length})</span>
              {filter === 'comments' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6d46b8]" />
              )}
            </button>
          </div>

          {/* Notification Items List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-[#eae3ee] dark:divide-white/5">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#f1e9fb] dark:bg-white/5 text-[#6d46b8] dark:text-[#c4a9f3] flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-xs font-semibold text-[#726c85] dark:text-[#a29cb2]">
                  No notifications in this view
                </p>
                <p className="text-[11px] text-[#a29cb2] mt-0.5">
                  Real-time alerts for completed downloads and comments will show here.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className={`p-3.5 hover:bg-[#fcfaff] dark:hover:bg-white/5 transition-colors cursor-pointer relative flex items-start gap-3 ${
                    !item.read ? 'bg-[#f8f4fb]/70 dark:bg-white/[0.03]' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className="shrink-0 mt-0.5">
                    {item.type === 'download' ? (
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-[#6d46b8] dark:text-[#c4a9f3] flex items-center justify-center">
                        <DownloadCloud className="w-4 h-4" />
                      </div>
                    ) : item.type === 'comment' ? (
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-[#d84e7a] dark:text-rose-300 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="font-semibold text-xs text-[#2e2440] dark:text-white line-clamp-1">
                        {item.title}
                      </h5>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-[#d84e7a] shrink-0" />
                      )}
                    </div>

                    <p className="text-[11px] text-[#726c85] dark:text-[#a29cb2] line-clamp-2 mt-0.5 leading-snug">
                      {item.message}
                    </p>

                    {item.type === 'download' && item.downloadData && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                          {item.downloadData.quality}
                        </span>
                        <span>&bull;</span>
                        <span className="text-[#a29cb2]">{item.downloadData.fileSize}</span>
                        <span>&bull;</span>
                        <span className="text-[#6d46b8] dark:text-[#c4a9f3] font-medium">
                          {item.downloadData.platform}
                        </span>
                      </div>
                    )}

                    {item.type === 'comment' && item.commentData && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                          Pending Moderation
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.commentData?.commentId) {
                              approveBlogComment(item.commentData.commentId);
                              markNotificationAsRead(item.id);
                            }
                          }}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                        >
                          Approve Now
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[10px] text-[#a29cb2] mt-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{item.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notificationsHistory.length > 0 && (
            <div className="p-2.5 border-t border-[#eae3ee] dark:border-white/10 bg-slate-50 dark:bg-black/20 flex items-center justify-between text-xs">
              <button
                onClick={clearNotificationsHistory}
                className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear history</span>
              </button>

              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Real-time listener active</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
