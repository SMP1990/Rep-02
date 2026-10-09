import React, { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';
import { TopHeader } from '../components/TopHeader';
import { 
  Search,
  Trash2,
  Download,
  Plus,
  ArrowUpDown,
  Mail,
  CheckCircle2,
  X,
  AlertTriangle,
  Calendar 
} from 'lucide-react';

interface SubscribersPageProps {
  onOpenMobileMenu: () => void;
}

export const SubscribersPage: React.FC<SubscribersPageProps> = ({ onOpenMobileMenu }) => {
  const { subscribers, addSubscriber, deleteSubscriber, exportSubscribersCsv } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newSource, setNewSource] = useState('Admin Manual Entry');
  const [addError, setAddError] = useState('');

  // Delete confirmation
  const [subscriberToDelete, setSubscriberToDelete] = useState<string | null>(null);

  // Filtered & Sorted subscribers
  const filteredSubscribers = useMemo(() => {
    return subscribers
      .filter(sub => 
        sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.source.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const timeA = new Date(a.subscribedAt).getTime();
        const timeB = new Date(b.subscribedAt).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [subscribers, searchQuery, sortOrder]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const result = addSubscriber(newEmail, newSource);
    if (!result.success) {
      setAddError(result.error || 'Failed to add subscriber.');
    } else {
      setShowAddModal(false);
      setNewEmail('');
    }
  };

  const confirmDelete = () => {
    if (subscriberToDelete) {
      deleteSubscriber(subscriberToDelete);
      setSubscriberToDelete(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <TopHeader
        title="Newsletter Subscribers"
        subtitle="Manage audience subscriptions collected across public downloader pages and blog articles."
        onOpenMobileMenu={onOpenMobileMenu}
        actionButton={{
          label: "Add Subscriber",
          onClick: () => setShowAddModal(true),
          icon: Plus,
        }}
      />

      {/* TOP METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-[#181224] rounded-2xl p-5 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
          <div className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-1">
            Total Audience
          </div>
          <div className="font-heading text-2xl font-bold text-[#2e2440] dark:text-white">
            {subscribers.length} Emails
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            100% Opt-in via public site
          </p>
        </div>

        <div className="bg-white dark:bg-[#181224] rounded-2xl p-5 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
          <div className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-1">
            Active Status
          </div>
          <div className="font-heading text-2xl font-bold text-[#6d46b8]">
            {subscribers.filter(s => s.status === 'active').length} Active
          </div>
          <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-1">
            Ready to receive broadcast updates
          </p>
        </div>

        <div className="bg-white dark:bg-[#181224] rounded-2xl p-5 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
          <div className="text-xs font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider mb-1">
            Data Export
          </div>
          <button
            onClick={exportSubscribersCsv}
            className="mt-1 w-full py-2 px-3 text-xs font-bold text-[#4b2e83] bg-[#f1e9fb] hover:bg-[#e4d6fb] rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#6d46b8]" />
            <span>Export Subscribers CSV</span>
          </button>
        </div>
      </div>

      {/* CONTROLS BAR: SEARCH, SORT, EXPORT */}
      <div className="bg-white dark:bg-[#181224] rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#a29cb2] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email address or signup source..."
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

        {/* Sort Button & Add */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-3.5 py-2 text-xs font-semibold text-[#4b2e83] bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-[#f1e9fb] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#6d46b8]" />
            <span>Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* SUBSCRIBERS TABLE */}
      <div className="bg-white dark:bg-[#181224] rounded-[22px] shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#f1e9fb] bg-[#f6f0f4]/60 text-[11px] font-bold text-[#726c85] dark:text-[#b5a9cd] uppercase tracking-wider">
                <th className="py-3.5 px-6">Subscriber Email</th>
                <th className="py-3.5 px-6">Subscription Date</th>
                <th className="py-3.5 px-6">Origin / Source</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f6f0f4] text-sm">
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#726c85] dark:text-[#b5a9cd]">
                    <Mail className="w-8 h-8 text-[#a29cb2] mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-[#2e2440] dark:text-white">No subscribers match your search.</p>
                    <p className="text-xs text-[#a29cb2] mt-1">Try clearing your search query.</p>
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#fcfaff] transition-colors group">
                    <td className="py-4 px-6 font-semibold text-[#2e2440] dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center text-xs font-bold shrink-0">
                          {sub.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[240px] sm:max-w-xs">{sub.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-[#726c85] dark:text-[#b5a9cd] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#a29cb2]" />
                        <span>{sub.subscribedAt}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-[#726c85] dark:text-[#b5a9cd]">
                      <span className="px-2.5 py-1 rounded-lg bg-[#f6f0f4] dark:bg-[#201538] text-[#4b2e83] font-medium inline-block">
                        {sub.source}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs whitespace-nowrap">
                      {sub.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                          Unsubscribed
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSubscriberToDelete(sub.id)}
                        title="Delete subscriber"
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

        {/* Table Footer info */}
        <div className="p-4 bg-[#fcfaff] border-t border-[#f1e9fb] flex items-center justify-between text-xs text-[#726c85] dark:text-[#b5a9cd]">
          <span>
            Showing <strong>{filteredSubscribers.length}</strong> of <strong>{subscribers.length}</strong> subscribers
          </span>
          <span className="text-[11px] text-[#a29cb2]">
            Double opt-in compliant
          </span>
        </div>
      </div>

      {/* ADD SUBSCRIBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#181224] rounded-[22px] p-6 shadow-2xl border border-white">
            <div className="flex items-center justify-between pb-4 border-b border-[#f1e9fb] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                    Add New Subscriber
                  </h3>
                  <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">Add an email address to the newsletter</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="subscriber@example.com"
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] focus:ring-2 focus:ring-[#7c4fd1]/20 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Origin / Source
                </label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] focus:ring-2 focus:ring-[#7c4fd1]/20 outline-hidden"
                >
                  <option value="Admin Manual Entry">Admin Manual Entry</option>
                  <option value="Imported CSV Campaign">Imported CSV Campaign</option>
                  <option value="Partner Referral">Partner Referral</option>
                  <option value="VIP Creator List">VIP Creator List</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f1e9fb]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] hover:opacity-95 rounded-xl shadow-md cursor-pointer"
                >
                  Save Subscriber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {subscriberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#181224] rounded-[22px] p-6 shadow-2xl border border-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
              Delete Subscriber?
            </h3>
            <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mt-1 mb-6 leading-relaxed">
              Are you sure you want to delete this subscriber? They will no longer receive blog tutorials and product newsletters.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubscriberToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
