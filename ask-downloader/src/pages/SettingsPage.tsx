import { LEGAL_TEXT_DATE } from '../config/legal.ts';
import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { initialsAvatar } from '../utils/imageUpload.ts';
import { MediaPicker } from '../components/MediaPicker';
import { TopHeader } from '../components/TopHeader';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  User,
  Lock,
  Globe,
  Check,
  Camera,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Palette 
} from 'lucide-react';

interface SettingsPageProps {
  onOpenMobileMenu: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenMobileMenu }) => {
  const [restoring, setRestoring] = useState(false);
  // Every image here comes from the Media Library (WordPress-style): the
  // picker shows what is already there and uploads new files into it.
  // Replacing or removing an image never deletes the file — it may be used
  // elsewhere; unused files are deleted from the Media Library.
  const [picker, setPicker] = useState<'' | 'avatar' | 'logoUrl' | 'faviconUrl' | 'ogImage'>('');

  const { 
    adminUser, 
    updateAdminProfile, 
    changePassword, 
    siteSettings, 
    updateSiteSettings,
    showToast 
  } = useAdmin();

  // Profile Form
  const [name, setName] = useState(adminUser?.name || 'Admin');
  const [email, setEmail] = useState(adminUser?.email || 'admin@example.com');
  const [avatar, setAvatar] = useState(adminUser?.avatar || '');

  // Password Form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passError, setPassError] = useState('');

  // Site Settings Form
  const [siteForm, setSiteForm] = useState(siteSettings);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Name and email are required.', 'error');
      return;
    }
    updateAdminProfile(name, email, avatar);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (!currentPass || !newPass || !confirmPass) {
      setPassError('Please fill out all password fields.');
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    const res = changePassword(currentPass, newPass);
    if (!res.success) {
      setPassError(res.message);
    } else {
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    }
  };

  const handleSiteSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSiteSettings(siteForm);
  };

  return (
    <div className="animate-fade-in">
      <TopHeader
        title="Settings & Administration"
        subtitle="Manage administrator credentials, site branding, metadata, and security switches."
        onOpenMobileMenu={onOpenMobileMenu}
      />

      <div className="space-y-8 max-w-4xl">
        {/* CARD: VISUAL THEME & DEEP NIGHT MODE */}
        <div className="bg-white dark:bg-[#181224] rounded-[22px] p-6 sm:p-8 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
          <div className="flex items-center gap-3 pb-5 border-b border-[#f1e9fb] mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                Appearance & Theme
              </h3>
              <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                Switch between light theme and eye-safe dark theme
              </p>
            </div>
          </div>

          <ThemeToggle variant="cards" id="settings-theme-cards" />
        </div>

        {/* CARD 1: ADMIN PROFILE */}
        <div className="bg-white dark:bg-[#181224] rounded-[22px] p-6 sm:p-8 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
          <div className="flex items-center gap-3 pb-5 border-b border-[#f1e9fb] mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                Admin Profile
              </h3>
              <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">Personal details and account representation</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Click the photo to choose one from the Media Library. */}
              <button type="button" onClick={() => setPicker('avatar')} className="relative group cursor-pointer rounded-full" title="Choose a new avatar">
                <img
                  src={avatar || initialsAvatar(name)}
                  alt={name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-[#f1e9fb] shadow-md"
                />
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>

              <div className="flex-1 w-full space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1 uppercase tracking-wider">
                    Avatar
                  </label>
                  <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mb-1.5">
                    Click the photo to choose one from the Media Library (or upload a new one), or paste an image URL below.
                  </p>
                  {/* Text, not type="url": Media Library images are /uploads/... paths,
                      which the browser's URL check rejects (and would block saving). */}
                  <input
                    type="text"
                    inputMode="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-mono text-[#2e2440] dark:text-white bg-[#f6f0f4] dark:bg-[#201538] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:bg-white dark:focus:bg-[#181224] dark:focus:bg-[#181224] focus:border-[#7c4fd1] outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Profile Info</span>
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: CHANGE PASSWORD */}
        <div className="bg-white dark:bg-[#181224] rounded-[22px] p-6 sm:p-8 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
          <div className="flex items-center gap-3 pb-5 border-b border-[#f1e9fb] mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#fdedf1] text-[#e6799f] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                Security & Password
              </h3>
              <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">Update your secret admin credentials</p>
            </div>
          </div>

          {passError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a29cb2] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#4b2e83] hover:bg-[#3d246e] rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>

        {/* CARD 3: SITE BRANDING & METADATA */}
        <div className="bg-white dark:bg-[#181224] rounded-[22px] p-6 sm:p-8 shadow-[0_10px_30px_rgba(140,80,120,0.08)] border border-[#e6799f]/10">
          <div className="flex items-center gap-3 pb-5 border-b border-[#f1e9fb] mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                Website Identity & SEO
              </h3>
              <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">Global site parameters and metadata</p>
            </div>
          </div>

          <form onSubmit={handleSiteSettingsSubmit} className="space-y-4">
            {/* Logo and favicon — uploaded from the device, like every other
                image in the dashboard. Blank keeps the built-in defaults. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { key: 'logoUrl' as const, title: 'Site Logo', hint: 'Shown in the header. PNG or SVG with a transparent background works best.', box: 'h-14 w-auto max-w-[140px]' },
                { key: 'faviconUrl' as const, title: 'Favicon', hint: 'The small icon in the browser tab. A square image works best.', box: 'h-10 w-10' },
              ]).map((f) => (
                <div key={f.key} className="rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] p-3">
                  <p className="text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider mb-1">{f.title}</p>
                  <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mb-2">{f.hint}</p>
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 rounded-lg bg-[#f6f0f4] dark:bg-[#241a38] border border-[#eae3ee] dark:border-[#2e1d4d] p-1.5 flex items-center justify-center">
                      {siteForm[f.key]
                        ? <img src={siteForm[f.key]} alt={f.title} className={`${f.box} object-contain`} />
                        : <span className="text-[10px] text-[#a29cb2] px-2">Default</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setPicker(f.key)}
                        className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white cursor-pointer">
                        {siteForm[f.key] ? 'Replace' : 'Choose image'}
                      </button>
                      {siteForm[f.key] && (
                        <button type="button" onClick={() => setSiteForm({ ...siteForm, [f.key]: '' })}
                          className="px-3 py-1.5 text-[11px] font-bold rounded-lg text-rose-600 border border-rose-200 cursor-pointer">Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Site Name
                </label>
                <input
                  type="text"
                  value={siteForm.siteName}
                  onChange={(e) => setSiteForm({ ...siteForm, siteName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Site Tagline
                </label>
                <input
                  type="text"
                  value={siteForm.siteTagline}
                  onChange={(e) => setSiteForm({ ...siteForm, siteTagline: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                Support & Contact Email
              </label>
              <input
                type="email"
                value={siteForm.contactEmail}
                onChange={(e) => setSiteForm({ ...siteForm, contactEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  Contact Phone <span className="font-normal normal-case text-[#a29cb2]">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={siteForm.contactPhone}
                  onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                  WhatsApp Number <span className="font-normal normal-case text-[#a29cb2]">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="15551234567 (no + or spaces)"
                  value={siteForm.whatsappNumber}
                  onChange={(e) => setSiteForm({ ...siteForm, whatsappNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                Social Media Links <span className="font-normal normal-case text-[#a29cb2]">(leave blank to hide an icon)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="url"
                  placeholder="Facebook page URL"
                  value={siteForm.socialFacebook}
                  onChange={(e) => setSiteForm({ ...siteForm, socialFacebook: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
                <input
                  type="url"
                  placeholder="Instagram profile URL"
                  value={siteForm.socialInstagram}
                  onChange={(e) => setSiteForm({ ...siteForm, socialInstagram: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
                <input
                  type="url"
                  placeholder="YouTube channel URL"
                  value={siteForm.socialYoutube}
                  onChange={(e) => setSiteForm({ ...siteForm, socialYoutube: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
                <input
                  type="url"
                  placeholder="TikTok profile URL"
                  value={siteForm.socialTiktok}
                  onChange={(e) => setSiteForm({ ...siteForm, socialTiktok: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
                <input
                  type="url"
                  placeholder="Twitter / X profile URL"
                  value={siteForm.socialTwitter}
                  onChange={(e) => setSiteForm({ ...siteForm, socialTwitter: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
                <input
                  type="url"
                  placeholder="LinkedIn page URL"
                  value={siteForm.socialLinkedin}
                  onChange={(e) => setSiteForm({ ...siteForm, socialLinkedin: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                />
              </div>
              <p className="text-[11px] text-[#a29cb2] mt-2">
                These update the footer and every other page that shows contact info or social icons — nothing needs to be edited elsewhere.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                Global SEO Meta Description
              </label>
              <textarea
                rows={3}
                value={siteForm.metaDescription}
                onChange={(e) => setSiteForm({ ...siteForm, metaDescription: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
                Social Share Image (Open Graph) <span className="font-normal normal-case text-[#a29cb2]">(optional, ~1200\u00d7630px)</span>
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {siteForm.ogImage && (
                  <img src={siteForm.ogImage} alt="Social share preview" className="w-40 h-[84px] object-cover rounded-lg border border-[#eae3ee] dark:border-[#2e1d4d] shrink-0" />
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setPicker('ogImage')}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white cursor-pointer">
                    {siteForm.ogImage ? 'Replace' : 'Choose image'}
                  </button>
                  {siteForm.ogImage && (
                    <button type="button" onClick={() => setSiteForm({ ...siteForm, ogImage: '' })}
                      className="px-3 py-1.5 text-[11px] font-bold rounded-lg text-rose-600 border border-rose-200 cursor-pointer">Remove</button>
                  )}
                </div>
              </div>
              <input
                type="text"
                inputMode="url"
                placeholder="…or paste an image URL: https://.../share-preview.jpg"
                aria-label="Social share image URL"
                value={siteForm.ogImage}
                onChange={(e) => setSiteForm({ ...siteForm, ogImage: e.target.value })}
                className="mt-2 w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
              />
              <p className="text-[11px] text-[#a29cb2] mt-1.5">
                Shown as the preview image when a page is shared on Facebook, WhatsApp, X, or other social platforms.
              </p>
            </div>


            {/* Search-engine ownership verification */}
            <div className="pt-4 border-t border-[#f1e9fb] dark:border-white/10">
              <p className="text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider mb-1">
                Site Verification
              </p>
              <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mb-3 leading-relaxed">
                Proves you own this domain, which is what unlocks Google Search Console, Bing
                Webmaster Tools and Pinterest Rich Pins. Each service shows you a{' '}
                <code className="px-1 rounded bg-[#f6f0f4] dark:bg-[#201538]">&lt;meta&gt;</code> tag —
                paste only the <strong>content</strong> value here, not the whole tag. These are
                written into the raw HTML, so the verifiers see them without running JavaScript.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['verifyGoogle', 'Google Search Console', 'google-site-verification'],
                  ['verifyBing', 'Bing Webmaster Tools', 'msvalidate.01'],
                  ['verifyYandex', 'Yandex Webmaster', 'yandex-verification'],
                  ['verifyPinterest', 'Pinterest', 'p:domain_verify'],
                  ['verifyFacebookDomain', 'Meta / Facebook Domain', 'facebook-domain-verification'],
                ] as const).map(([key, label, tag]) => (
                  <div key={key}>
                    <label className="block text-[11px] font-bold text-[#2e2440] dark:text-white mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      spellCheck={false}
                      placeholder={tag}
                      value={(siteForm as any)[key] || ''}
                      onChange={(e) => setSiteForm({ ...siteForm, [key]: e.target.value.trim() })}
                      className="w-full px-3.5 py-2 text-xs font-mono text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Google Analytics 4 */}
            <div className="pt-4 border-t border-[#f1e9fb] dark:border-white/10">
              <p className="text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider mb-1">
                Google Analytics
              </p>
              <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mb-3 leading-relaxed">
                Paste your GA4 <strong>Measurement ID</strong> (Google Analytics → Admin → Data streams →
                your website). Tracking starts as soon as you save; leave it empty to switch analytics off.
                Admin pages are never tracked.
              </p>
              <input
                type="text"
                spellCheck={false}
                placeholder="G-XXXXXXXXXX"
                value={siteForm.googleAnalyticsId || ''}
                onChange={(e) => setSiteForm({ ...siteForm, googleAnalyticsId: e.target.value.trim().toUpperCase() })}
                className="w-full sm:w-72 px-3.5 py-2 text-xs font-mono text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
              />
              {siteForm.googleAnalyticsId && !/^G-[A-Z0-9]{4,20}$/.test(siteForm.googleAnalyticsId) && (
                <p className="mt-1.5 text-[11px] text-rose-600">
                  This doesn't look like a GA4 ID. It starts with "G-" (old "UA-" IDs no longer work).
                </p>
              )}
              {siteForm.googleAnalyticsId && /^G-[A-Z0-9]{4,20}$/.test(siteForm.googleAnalyticsId) && (
                <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  ✓ Valid ID. Save settings, then check Google Analytics → Reports → Realtime.
                </p>
              )}
            </div>

            {/* Legal pages date */}
            <div className="pt-4 border-t border-[#f1e9fb] dark:border-white/10">
              <p className="text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider mb-1">
                Legal Pages — Last Updated
              </p>
              <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mb-3 leading-relaxed">
                Shown on Privacy Policy, Terms of Use and Legal. Change it only when you actually change
                those policies — a date that moves on its own looks fake to readers and to Google.
              </p>
              <input
                type="date"
                value={siteForm.legalUpdatedAt || LEGAL_TEXT_DATE}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setSiteForm({ ...siteForm, legalUpdatedAt: e.target.value })}
                className="px-3.5 py-2 text-xs text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] outline-hidden"
              />
            </div>

            {/* Discovery endpoints */}
            <div className="pt-4 border-t border-[#f1e9fb] dark:border-white/10">
              <p className="text-xs font-bold text-[#2e2440] dark:text-white uppercase tracking-wider mb-1">
                Submit These To Search Engines
              </p>
              <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] mb-2.5">
                Generated automatically from your live posts — nothing to maintain by hand.
              </p>
              <div className="flex flex-wrap gap-2">
                {['/sitemap.xml', '/rss.xml', '/robots.txt'].map((path) => (
                  <a
                    key={path}
                    href={path}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold bg-[#f6f0f4] dark:bg-[#201538] text-[#4b2e83] dark:text-[#d1b9f7] border border-[#eae3ee] dark:border-[#2e1d4d] hover:border-[#7c4fd1] transition-colors"
                  >
                    {path}
                  </a>
                ))}
              </div>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="pt-4 border-t border-[#f1e9fb] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#2e2440] dark:text-white">Maintenance Mode</p>
                <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd]">
                  Temporarily pause public video downloads for scheduled backend maintenance.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteForm.maintenanceMode}
                  onChange={(e) => setSiteForm({ ...siteForm, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#181224] after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6d46b8]" />
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Site Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Backup & Restore — everything on this site in one file, so the
            site can be moved to another host or account without loss. */}
        <div className="bg-white dark:bg-[#181224] rounded-2xl border border-[#eae3ee] dark:border-[#2e1d4d] p-6 shadow-xs mt-6">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">Backup &amp; Restore</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Download everything on this site — messages, blog posts, comments, subscribers, settings, download totals
            and uploaded images — as a single file. Upload that file on a new site to bring it all back.
            The file also contains your admin login, so keep it private.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="/api/admin/backup"
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-xl shadow-md cursor-pointer inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Download Backup</span>
            </a>

            <label className="px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#241a38] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl cursor-pointer inline-flex items-center gap-2 hover:border-[#6d46b8]">
              <span>{restoring ? 'Restoring…' : 'Restore From Backup'}</span>
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                disabled={restoring}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  if (!window.confirm(
                    'Restore from this backup?\n\n' +
                    'It replaces the sections the file contains (messages, posts, subscribers, settings, images) and can change the admin password to the one saved in the backup.\n\n' +
                    'A copy of the current data is saved on the server first, so nothing is lost.'
                  )) return;
                  setRestoring(true);
                  try {
                    const payload = JSON.parse(await file.text());
                    const res = await fetch('/api/admin/restore', {
                      method: 'POST',
                      credentials: 'same-origin',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });
                    const data = await res.json();
                    if (data.success) {
                      showToast(data.message || 'Backup restored. Reloading…', 'success');
                      setTimeout(() => window.location.reload(), 1200);
                    } else {
                      showToast(data.error || 'Could not restore this file.', 'error');
                    }
                  } catch {
                    showToast('That file is not a valid backup.', 'error');
                  }
                  setRestoring(false);
                }}
              />
            </label>
          </div>
        </div>
      </div>
      <MediaPicker
        open={!!picker}
        title={{ avatar: 'Profile photo', logoUrl: 'Site logo', faviconUrl: 'Favicon', ogImage: 'Social share image' }[picker || 'avatar']}
        accept={['image']}
        onClose={() => setPicker('')}
        onSelect={(f) => {
          if (picker === 'avatar') {
            setAvatar(f.url);
            // Saved straight away so the new photo appears everywhere at once.
            updateAdminProfile(name, email, f.url);
          } else if (picker) {
            setSiteForm({ ...siteForm, [picker]: f.url });
          }
        }}
      />
    </div>
  );
};
