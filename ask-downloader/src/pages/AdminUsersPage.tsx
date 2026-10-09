import React, { useEffect, useState } from 'react';
import { TopHeader } from '../components/TopHeader';
import { useAdmin } from '../context/AdminContext';
import { ShieldCheck, Trash2, UserPlus } from 'lucide-react';

interface AdminUsersPageProps {
  onOpenMobileMenu: () => void;
}

type AdminAccount = {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  active: boolean;
};

/** Grouped only for readability — the server decides what each one allows. */
const GROUPS: Record<string, string[]> = {
  Blog: ['blog.view', 'blog.create', 'blog.edit', 'blog.delete'],
  Comments: ['comments.view', 'comments.approve', 'comments.delete'],
  Messages: ['messages.view', 'messages.manage'],
  Subscribers: ['subscribers.view', 'subscribers.manage'],
  Media: ['media.manage'],
  Settings: ['settings.view', 'settings.edit', 'seo.edit'],
  Backups: ['backup.create', 'backup.restore'],
  Analytics: ['analytics.view'],
};

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ onOpenMobileMenu }) => {
  const { showToast } = useAdmin();
  const [list, setList] = useState<AdminAccount[]>([]);
  const [presets, setPresets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'moderator' });
  const [perms, setPerms] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch('/api/admin/users', { credentials: 'same-origin' })
      .then(async (r) => {
        if (r.status === 403 || r.status === 401) { setDenied(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setList(d.users || []);
        setPresets(d.rolePresets || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const applyPreset = (role: string) => {
    setForm((f) => ({ ...f, role }));
    setPerms(presets[role] ? [...presets[role]] : []);
  };

  const toggle = (p: string) =>
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, permissions: perms }),
      });
      const data = await res.json();
      if (!data.success) setError(data.message || 'Could not add this admin.');
      else {
        showToast(`${form.name} can now sign in to the dashboard.`, 'success');
        setForm({ name: '', email: '', password: '', role: 'moderator' });
        setPerms([]);
        load();
      }
    } catch {
      setError('Could not reach the server.');
    }
    setSaving(false);
  };

  const patch = async (id: string, body: any) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
    load();
  };

  const remove = async (u: AdminAccount) => {
    if (!window.confirm(`Remove ${u.name}? They will no longer be able to sign in.`)) return;
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE', credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!data.success) showToast(data.message || 'Could not remove this admin.', 'error');
    load();
  };

  if (denied) {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17]">
        <TopHeader onOpenMobileMenu={onOpenMobileMenu} />
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] p-8 text-center">
            <ShieldCheck className="w-8 h-8 text-[#6d46b8] mx-auto mb-2" />
            <h1 className="text-lg font-extrabold text-[#2e2440] dark:text-white mb-1">Master Admin only</h1>
            <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">Only the Master Admin can manage admin accounts and permissions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17]">
      <TopHeader onOpenMobileMenu={onOpenMobileMenu} />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-extrabold text-[#2e2440] dark:text-white">Admins &amp; Permissions</h1>
        <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] mb-5">
          Give each person only what they need. Permissions are enforced on the server, so a blocked action stays blocked
          even outside the dashboard.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <form onSubmit={addUser} className="lg:col-span-2 bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] p-5 shadow-xs h-fit">
            <h2 className="text-sm font-extrabold text-[#2e2440] dark:text-white mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#6d46b8]" /> Add an admin
            </h2>

            {[
              { k: 'name' as const, label: 'Name', type: 'text', ph: 'Sara Khan' },
              { k: 'email' as const, label: 'Email', type: 'email', ph: 'sara@example.com' },
              { k: 'password' as const, label: 'Password (at least 8 characters)', type: 'password', ph: '' },
            ].map((f) => (
              <div key={f.k} className="mb-3">
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.k]}
                  placeholder={f.ph}
                  onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white outline-hidden focus:border-[#7c4fd1]"
                />
              </div>
            ))}

            <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">Start from a role</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.keys(presets).filter((r) => r !== 'master').map((r) => (
                <button key={r} type="button" onClick={() => applyPreset(r)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer capitalize ${
                    form.role === r ? 'bg-[#6d46b8] text-white' : 'bg-white dark:bg-[#241a38] text-[#726c85] dark:text-[#b5a9cd] border border-[#eae3ee] dark:border-[#2e1d4d]'
                  }`}>{r}</button>
              ))}
            </div>

            <p className="text-xs font-bold text-[#2e2440] dark:text-white mb-1.5">Permissions ({perms.length})</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {Object.entries(GROUPS).map(([group, items]) => (
                <div key={group}>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#a29cb2]">{group}</p>
                  {items.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-[11px] text-[#2e2440] dark:text-white cursor-pointer py-0.5">
                      <input type="checkbox" checked={perms.includes(p)} onChange={() => toggle(p)} className="accent-[#6d46b8]" />
                      <span className="font-mono">{p}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            {error && <p className="text-[11px] font-semibold text-rose-600 mt-2">{error}</p>}
            <button type="submit" disabled={saving}
              className="w-full mt-3 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] rounded-xl cursor-pointer disabled:opacity-60">
              {saving ? 'Adding…' : 'Add admin'}
            </button>
          </form>

          <div className="lg:col-span-3 bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] shadow-xs overflow-x-auto h-fit">
            {loading ? (
              <p className="p-6 text-xs text-[#726c85] dark:text-[#b5a9cd]">Loading admins…</p>
            ) : (
              <table className="w-full text-left min-w-[520px]">
                <thead className="bg-[#f6f0f4] dark:bg-[#201538]">
                  <tr>
                    {['Admin', 'Role', 'Permissions', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#726c85] dark:text-[#b5a9cd]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((u) => (
                    <tr key={u.id} className="border-t border-[#eae3ee] dark:border-[#2e1d4d]">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-[#2e2440] dark:text-white">{u.name}</p>
                        <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd]">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold border capitalize ${
                          u.role === 'master' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>{u.role === 'master' ? 'Master Admin' : u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#726c85] dark:text-[#b5a9cd]">
                        {u.role === 'master' ? 'Everything' : `${u.permissions.length} allowed`}
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'master' ? (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Always active</span>
                        ) : (
                          <button onClick={() => patch(u.id, { active: !u.active })}
                            className={`text-[11px] font-bold cursor-pointer ${u.active ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {u.active ? 'Active' : 'Suspended'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.role !== 'master' && (
                          <button onClick={() => remove(u)} title="Remove this admin"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
