import React, { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { TopHeader } from '../components/TopHeader';
import { ContactMessage, ContactMessageStatus, ContactMessageTopic } from '../types/admin';
import { 
  Inbox,
  Search,
  Mail,
  MailOpen,
  Trash2,
  Archive,
  CheckCircle2,
  Clock,
  DownloadCloud,
  Sparkles,
  Briefcase,
  ShieldAlert,
  MessageSquare,
  ExternalLink,
  Send,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';

interface MessagesPageProps {
  onOpenMobileMenu: () => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ onOpenMobileMenu }) => {
  // Reply links.
  //
  // A plain mailto: link only works when the computer has a desktop mail
  // app configured. Most people read mail in the browser (Gmail), where
  // clicking it appears to do nothing at all — which is why this button
  // seemed broken. So the admin is offered the web clients too, and the
  // recipient is always filled in automatically.
  const isValidEmail = (v?: string) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const replyParts = (msg: any) => {
    const site = siteSettings?.siteName || 'Support';
    const ref = String(msg.id).replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase();
    const subject = `Re: [${site} #${ref}] ${msg.topicLabel || 'Your inquiry'}`;
    const body =
      `Hi ${msg.name},\n\nThank you for contacting ${site}. Regarding your message:\n\n` +
      `${String(msg.message || '').split('\n').map((l: string) => `> ${l}`).join('\n')}\n\n`;
    return { to: String(msg.email || '').trim(), subject, body };
  };

  const openReply = (msg: any, via: 'default' | 'gmail' | 'outlook' | 'outlook365' | 'copy') => {
    if (!isValidEmail(msg?.email)) {
      showToast('This message has no valid email address to reply to.', 'error');
      return;
    }
    const { to, subject, body } = replyParts(msg);
    const s = encodeURIComponent(subject);
    const bd = encodeURIComponent(body);

    if (via === 'copy') {
      navigator.clipboard?.writeText(to)
        .then(() => showToast(`Copied ${to} to the clipboard.`, 'success'))
        .catch(() => showToast('Could not copy the address.', 'error'));
      return;
    }

    const urls: Record<string, string> = {
      default: `mailto:${encodeURIComponent(to)}?subject=${s}&body=${bd}`,
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${s}&body=${bd}`,
      outlook: `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${s}&body=${bd}`,
      outlook365: `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${s}&body=${bd}`,
    };

    if (via === 'default') {
      // Nothing visible happens when no mail app is installed, so say so.
      window.location.href = urls.default;
      setTimeout(() => showToast('If nothing opened, your computer has no mail app set up — use Gmail or Outlook instead.', 'info'), 1200);
    } else {
      window.open(urls[via], '_blank', 'noopener');
    }
    setReplyMenuOpen(false);
  };

  const { 
    contactMessages, 
    markMessageAsRead, 
    markMessageAsUnread, 
    markMessageAsReplied, 
    archiveContactMessage, 
    deleteContactMessage, 
    exportMessagesCsv,
    addContactMessage,
    siteSettings,
    showToast
  } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [replyMenuOpen, setReplyMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ContactMessageStatus>('all');
  const [topicFilter, setTopicFilter] = useState<'all' | ContactMessageTopic>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyNotesInput, setReplyNotesInput] = useState('');

  // Stats calculation
  const totalCount = contactMessages.length;
  const unreadCount = contactMessages.filter(m => m.status === 'unread').length;
  const readCount = contactMessages.filter(m => m.status === 'read').length;
  const repliedCount = contactMessages.filter(m => m.status === 'replied').length;
  const archivedCount = contactMessages.filter(m => m.status === 'archived').length;

  const downloadIssuesCount = contactMessages.filter(m => m.topic === 'download-issue').length;
  const businessCount = contactMessages.filter(m => m.topic === 'business').length;

  // Filtered messages list
  const filteredMessages = useMemo(() => {
    return contactMessages.filter(msg => {
      // Status filter
      if (statusFilter !== 'all' && msg.status !== statusFilter) {
        return false;
      }
      // Topic filter
      if (topicFilter !== 'all' && msg.topic !== topicFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = msg.name.toLowerCase().includes(query);
        const matchesEmail = msg.email.toLowerCase().includes(query);
        const matchesContent = msg.message.toLowerCase().includes(query);
        const matchesTopic = (msg.topicLabel || msg.topic).toLowerCase().includes(query);
        const matchesId = msg.id.toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesContent || matchesTopic || matchesId;
      }
      return true;
    });
  }, [contactMessages, statusFilter, topicFilter, searchQuery]);

  const handleSelectMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplyNotesInput(msg.replyNotes || '');
    if (msg.status === 'unread') {
      markMessageAsRead(msg.id);
    }
  };

  const handleSaveReplyNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage) return;
    markMessageAsReplied(selectedMessage.id, replyNotesInput.trim());
    setSelectedMessage(prev => prev ? { 
      ...prev, 
      status: 'replied', 
      replyNotes: replyNotesInput.trim(),
      repliedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    } : null);
  };

  const handleSimulateNewMessage = () => {
    const SAMPLE_SENDERS = [
      { name: 'Liam Cooper', email: 'liam.c@mediastudio.io', topic: 'download-issue' as ContactMessageTopic, topicLabel: 'Video Download Issue (URL not parsing)', message: 'Unable to extract 1080p stream for Facebook live broadcast recording. Link: fb.watch/live994' },
      { name: 'Aria Takahashi', email: 'aria@tokyocreatives.jp', topic: 'feature-request' as ContactMessageTopic, topicLabel: 'New Platform or Feature Request', message: 'Would love to see YouTube Shorts or Twitter/X video downloader options in the near future!' },
      { name: 'Carlos Rodriguez', email: 'carlos@vortexpodcast.es', topic: 'business' as ContactMessageTopic, topicLabel: 'Business & Partnership Inquiries', message: 'We want to sponsor your download completion page with banner advertising. Who is the right person to contact?' },
      { name: 'Emily Watson', email: 'emily.w@designpulse.org', topic: 'feedback' as ContactMessageTopic, topicLabel: 'General Feedback or Compliment', message: 'The interface is super fast and clean. No spammy ads or malware popups. Great job team!' },
    ];

    const pick = SAMPLE_SENDERS[Math.floor(Math.random() * SAMPLE_SENDERS.length)];
    addContactMessage(pick);
    showToast(`Simulated message received from ${pick.name}!`, 'info');
  };

  const getTopicBadgeColor = (topic: ContactMessageTopic) => {
    switch (topic) {
      case 'download-issue':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'business':
        return 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'feature-request':
        return 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'legal':
        return 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'feedback':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getTopicIcon = (topic: ContactMessageTopic) => {
    switch (topic) {
      case 'download-issue': return DownloadCloud;
      case 'business': return Briefcase;
      case 'feature-request': return Sparkles;
      case 'legal': return ShieldAlert;
      default: return MessageSquare;
    }
  };

  return (
    <div className="animate-fade-in pb-16">
      <TopHeader
        title="Contact Inquiries & Messages"
        subtitle="Live inbox receiving direct submissions from the public Contact Us page."
        onOpenMobileMenu={onOpenMobileMenu}
        actionButton={{
          label: "Export CSV",
          onClick: exportMessagesCsv,
        }}
      />

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        
        {/* Card 1: Total Messages */}
        <div className="bg-white dark:bg-[#181224] rounded-2xl p-5 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
              Total Inquiries
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-[#2a1b4e] flex items-center justify-center text-[#6d46b8] dark:text-[#c498f0]">
              <Inbox className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-3xl font-bold text-[#2e2440] dark:text-[#f4eefb]">
              {totalCount}
            </span>
            <span className="text-xs text-[#726c85] dark:text-[#b5a9cd]">logged</span>
          </div>
          <p className="mt-2 text-xs text-[#726c85] dark:text-[#b5a9cd]">
            Direct user form submissions
          </p>
        </div>

        {/* Card 2: Unread Messages */}
        <div className="bg-white dark:bg-[#181224] rounded-2xl p-5 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
              Unread Messages
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-3xl font-bold text-rose-600 dark:text-rose-400">
              {unreadCount}
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                Action Required
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-[#726c85] dark:text-[#b5a9cd]">
            Awaiting response or review
          </p>
        </div>

        {/* Card 3: Replied / Resolved */}
        <div className="bg-white dark:bg-[#181224] rounded-2xl p-5 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
              Handled & Replied
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {repliedCount}
            </span>
            <span className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
              ({totalCount > 0 ? Math.round((repliedCount / totalCount) * 100) : 0}% rate)
            </span>
          </div>
          <p className="mt-2 text-xs text-[#726c85] dark:text-[#b5a9cd]">
            Tickets answered by admin team
          </p>
        </div>

        {/* Card 4: Issue Inquiries */}
        <div className="bg-white dark:bg-[#181224] rounded-2xl p-5 border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
              Download Issues
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <DownloadCloud className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-3xl font-bold text-[#2e2440] dark:text-[#f4eefb]">
              {downloadIssuesCount}
            </span>
            <span className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
              + {businessCount} business
            </span>
          </div>
          <p className="mt-2 text-xs text-[#726c85] dark:text-[#b5a9cd]">
            Stream reports and URL inquiries
          </p>
        </div>

      </div>

      {/* CONTROLS & FILTER BAR */}
      <div className="bg-white dark:bg-[#181224] p-4 sm:p-5 rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] shadow-sm mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#4b2e83] text-white shadow-sm'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:bg-slate-100 dark:hover:bg-[#24193b]'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'unread'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:bg-slate-100 dark:hover:bg-[#24193b]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setStatusFilter('read')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'read'
                  ? 'bg-[#6d46b8] text-white shadow-sm'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:bg-slate-100 dark:hover:bg-[#24193b]'
              }`}
            >
              Read ({readCount})
            </button>
            <button
              onClick={() => setStatusFilter('replied')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'replied'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:bg-slate-100 dark:hover:bg-[#24193b]'
              }`}
            >
              Replied ({repliedCount})
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === 'archived'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-[#726c85] dark:text-[#b5a9cd] hover:bg-slate-100 dark:hover:bg-[#24193b]'
              }`}
            >
              Archived ({archivedCount})
            </button>
          </div>

          {/* Simulate Demo Test Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSimulateNewMessage}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f1e9fb] dark:bg-[#2e1d4d] text-[#6d46b8] dark:text-[#c498f0] hover:bg-[#e4d6f8] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Generate a test incoming contact message"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Incoming Test</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-[#2e1d4d]">
          {/* Search Box */}
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-[#726c85] dark:text-[#b5a9cd] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by sender name, email, keyword, or ticket ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border border-[#eae3ee] dark:border-[#2e1d4d] bg-slate-50/70 dark:bg-[#1f1630] text-[#2e2440] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6d46b8]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Topic Dropdown Filter */}
          <div className="sm:col-span-4">
            <select
              value={topicFilter}
              onChange={e => setTopicFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl text-xs border border-[#eae3ee] dark:border-[#2e1d4d] bg-slate-50/70 dark:bg-[#1f1630] text-[#2e2440] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6d46b8]"
            >
              <option value="all">All Categories & Topics</option>
              <option value="download-issue">Video Download Issues</option>
              <option value="feature-request">Platform & Feature Requests</option>
              <option value="business">Business & Partnerships</option>
              <option value="feedback">Feedback & Compliments</option>
              <option value="legal">Copyright / DMCA Takedown</option>
            </select>
          </div>
        </div>
      </div>

      {/* MESSAGES LIST & SPLIT DETAIL VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* MESSAGES FEED */}
        <div className={`space-y-3 ${selectedMessage ? 'lg:col-span-6 xl:col-span-5' : 'lg:col-span-12'}`}>
          {filteredMessages.length === 0 ? (
            <div className="bg-white dark:bg-[#181224] rounded-2xl p-12 border border-[#eae3ee] dark:border-[#2e1d4d] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#24193b] text-slate-400 flex items-center justify-center mx-auto">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#2e2440] dark:text-[#f4eefb]">
                No messages found
              </h4>
              <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || topicFilter !== 'all'
                  ? 'No contact submissions match the current filters. Try resetting your search parameters.'
                  : 'Your inbox is clear. Messages submitted from the public contact form will appear here in real time.'}
              </p>
              {(searchQuery || statusFilter !== 'all' || topicFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setTopicFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6d46b8] dark:text-[#c498f0] bg-[#f1e9fb] dark:bg-[#2e1d4d] hover:opacity-90 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const TopicIcon = getTopicIcon(msg.topic);
              const isSelected = selectedMessage?.id === msg.id;
              const isUnread = msg.status === 'unread';

              return (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`
                    bg-white dark:bg-[#181224] p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group relative
                    ${isSelected
                      ? 'border-[#6d46b8] dark:border-[#9e5488] shadow-md ring-2 ring-[#6d46b8]/20 bg-purple-50/20 dark:bg-[#221638]'
                      : 'border-[#eae3ee] dark:border-[#2e1d4d] hover:border-[#6d46b8]/50 hover:shadow-xs'
                    }
                    ${isUnread ? 'bg-purple-50/10 dark:bg-[#1d142d]' : ''}
                  `}
                >
                  {/* Top line: Topic badge, timestamp, unread dot */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shrink-0" title="Unread Message" />
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getTopicBadgeColor(msg.topic)}`}>
                        <TopicIcon className="w-3 h-3" />
                        <span>{msg.topicLabel || msg.topic}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#726c85] dark:text-[#b5a9cd]">
                      <Clock className="w-3 h-3" />
                      <span>{msg.createdAt}</span>
                    </div>
                  </div>

                  {/* Sender info */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className={`text-sm ${isUnread ? 'font-black text-[#2e2440] dark:text-white' : 'font-bold text-[#2e2440] dark:text-[#f4eefb]'}`}>
                        {msg.name}
                      </h4>
                      <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] font-mono">
                        {msg.email}
                      </p>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {msg.status === 'unread' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          UNREAD
                        </span>
                      )}
                      {msg.status === 'read' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          READ
                        </span>
                      )}
                      {msg.status === 'replied' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> REPLIED
                        </span>
                      )}
                      {msg.status === 'archived' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Snippet */}
                  <p className="text-xs text-[#524968] dark:text-[#cbbddf] line-clamp-2 leading-relaxed">
                    {msg.message}
                  </p>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-[#271941] text-xs">
                    <span className="text-[10px] text-[#a29cb2] font-mono">
                      #{msg.id}
                    </span>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {msg.status === 'unread' ? (
                        <button
                          onClick={() => markMessageAsRead(msg.id)}
                          title="Mark as Read"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2e1d4d] transition-colors"
                        >
                          <MailOpen className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => markMessageAsUnread(msg.id)}
                          title="Mark as Unread"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2e1d4d] transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => archiveContactMessage(msg.id)}
                        title="Archive Message"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteContactMessage(msg.id)}
                        title="Delete Message"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FULL MESSAGE DETAILS & INTERACTIVE ACTIONS PANEL */}
        {selectedMessage && (
          <div className="lg:col-span-6 xl:col-span-7 bg-white dark:bg-[#181224] rounded-3xl border border-[#eae3ee] dark:border-[#2e1d4d] shadow-md p-6 sticky top-6 animate-in fade-in space-y-6">
            
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#eae3ee] dark:border-[#2e1d4d]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTopicBadgeColor(selectedMessage.topic)}`}>
                    {selectedMessage.topicLabel || selectedMessage.topic}
                  </span>
                  <span className="text-xs font-mono text-[#726c85] dark:text-[#b5a9cd]">
                    Ticket #{selectedMessage.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#2e2440] dark:text-[#f4eefb]">
                  {selectedMessage.name}
                </h3>
                <button
                  type="button"
                  onClick={() => openReply(selectedMessage, 'copy')}
                  title="Copy this email address"
                  className="text-xs text-[#6d46b8] dark:text-[#c498f0] font-mono hover:underline flex items-center gap-1.5 mt-0.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{selectedMessage.email}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#25193d] transition-colors"
                title="Close Reader"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1f1630] text-xs">
              <div>
                <span className="block text-[10px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-0.5">
                  Submitted
                </span>
                <span className="font-semibold text-[#2e2440] dark:text-[#f4eefb]">
                  {selectedMessage.createdAt}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-0.5">
                  Current Status
                </span>
                <span className="font-bold text-[#6d46b8] dark:text-[#c498f0] uppercase text-[11px]">
                  {selectedMessage.status}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-0.5">
                  User Location
                </span>
                <span className="font-semibold text-[#2e2440] dark:text-[#f4eefb] truncate block">
                  {selectedMessage.ipCountry || 'Global Internet'}
                </span>
              </div>
            </div>

            {/* Full Message Body */}
            <div>
              <label className="block text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-2">
                User Submission
              </label>
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1d142d] border border-slate-200/80 dark:border-[#2e1d4d] text-sm text-[#2e2440] dark:text-[#f4eefb] leading-relaxed whitespace-pre-wrap selection:bg-[#6d46b8]/20">
                {selectedMessage.message}
              </div>
            </div>

            {/* Existing Reply Notes or Internal Log */}
            {selectedMessage.replyNotes && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Internal Action / Admin Response Note
                  </span>
                  {selectedMessage.repliedAt && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      {selectedMessage.repliedAt}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  {selectedMessage.replyNotes}
                </p>
              </div>
            )}

            {/* ADMIN ACTIONS: MAILTO & INTERNAL NOTE LOGGING */}
            <div className="space-y-4 pt-2 border-t border-[#eae3ee] dark:border-[#2e1d4d]">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setReplyMenuOpen((v) => !v)}
                    disabled={!isValidEmail(selectedMessage.email)}
                    title={isValidEmail(selectedMessage.email) ? `Reply to ${selectedMessage.email}` : 'This message has no valid email address'}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] hover:opacity-95 transition-opacity flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Reply via Email</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {replyMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setReplyMenuOpen(false)} />
                      <div className="absolute left-0 mt-2 z-50 w-60 rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] shadow-lg overflow-hidden">
                        <p className="px-3 pt-2.5 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#a29cb2]">
                          Reply to {selectedMessage.email}
                        </p>
                        {[
                          { key: 'gmail', label: 'Gmail (in browser)' },
                          { key: 'outlook', label: 'Outlook.com' },
                          { key: 'outlook365', label: 'Outlook (work / Microsoft 365)' },
                          { key: 'default', label: 'Default mail app on this device' },
                          { key: 'copy', label: 'Copy email address' },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => openReply(selectedMessage, opt.key as any)}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-[#2e2440] dark:text-white hover:bg-[#f6f0f4] dark:hover:bg-[#241a38] cursor-pointer"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {selectedMessage.status !== 'replied' && (
                  <button
                    onClick={() => {
                      markMessageAsReplied(selectedMessage.id, 'Marked as responded.');
                      setSelectedMessage(prev => prev ? { ...prev, status: 'replied' } : null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark as Handled</span>
                  </button>
                )}

                {selectedMessage.status === 'unread' ? (
                  <button
                    onClick={() => {
                      markMessageAsRead(selectedMessage.id);
                      setSelectedMessage(prev => prev ? { ...prev, status: 'read' } : null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#25193d] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Mark as Read
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      markMessageAsUnread(selectedMessage.id);
                      setSelectedMessage(prev => prev ? { ...prev, status: 'unread' } : null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#25193d] text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Mark as Unread
                  </button>
                )}

                <button
                  onClick={() => {
                    archiveContactMessage(selectedMessage.id);
                    setSelectedMessage(prev => prev ? { ...prev, status: 'archived' } : null);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#25193d] text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors cursor-pointer"
                  title="Archive ticket"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    deleteContactMessage(selectedMessage.id);
                    setSelectedMessage(null);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#25193d] text-rose-700 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                  title="Delete ticket"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Log Internal Admin Note Form */}
              <form onSubmit={handleSaveReplyNotes} className="space-y-2">
                <label className="block text-xs font-bold text-[#726c85] dark:text-[#b5a9cd]">
                  Log Internal Resolution Note
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Sent email troubleshooting instructions; issue resolved..."
                    value={replyNotesInput}
                    onChange={e => setReplyNotesInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl text-xs border border-[#eae3ee] dark:border-[#2e1d4d] bg-slate-50 dark:bg-[#1f1630] text-[#2e2440] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6d46b8]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#6d46b8] hover:bg-[#5a369e] transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
