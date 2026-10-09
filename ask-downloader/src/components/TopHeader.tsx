import React from 'react';
import { useAdmin } from '../context/AdminContext';
import { ThemeToggle } from './ThemeToggle';
import { AdminNotificationBell } from './AdminNotificationBell';
import { Menu, ExternalLink, PlusCircle, Globe, LogOut } from 'lucide-react';
import { initialsAvatar } from '../utils/imageUpload.ts';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileMenu: () => void;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  actionButton,
}) => {
  const { adminUser, setCurrentRoute, logout } = useAdmin();

  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Mobile Toggle & Heading */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-[#4b2e83] dark:text-[#d1b9f7] hover:bg-white dark:hover:bg-[#181224] dark:hover:bg-[#181224] dark:hover:bg-[#261b3b] rounded-xl shadow-xs transition-colors cursor-pointer"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#2e2440] dark:text-[#f1e9fb] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-[#726c85] dark:text-[#b5a9cd] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Quick Actions & Profile Info */}
        <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto flex-wrap">
          {/* Action button if provided */}
          {actionButton && (
            <button
              onClick={actionButton.onClick}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] hover:from-[#5b3a9e] hover:to-[#d9628c] rounded-xl shadow-md shadow-[#7c4fd1]/20 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
            >
              {actionButton.icon ? <actionButton.icon className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              <span>{actionButton.label}</span>
            </button>
          )}

          {/* Live Website / Frontend Shortcut */}
          <button
            onClick={() => setCurrentRoute('home')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#4b2e83] dark:text-[#d1b9f7] bg-white dark:bg-[#1f1533] hover:bg-[#f1e9fb] dark:hover:bg-[#2a1c44] border border-[#a78bda]/40 dark:border-[#3e2e5c] rounded-xl shadow-xs transition-all cursor-pointer"
            title="Open Live Website / Frontend View"
          >
            <Globe className="w-3.5 h-3.5 text-[#6d46b8] dark:text-[#f0a8bf]" />
            <span>Live Website</span>
            <ExternalLink className="w-3 h-3 text-[#726c85] dark:text-[#b5a9cd]" />
          </button>

          {/* Real-time Notification Bell */}
          <AdminNotificationBell />

          {/* Global Theme Toggle (Sun/Moon switch) */}
          <ThemeToggle variant="pill" id="topheader-theme-toggle" />

          {/* Admin Avatar Preview & Logout */}
          <div className="flex items-center gap-2 pl-1 border-l border-[#eae3ee] dark:border-[#2e1d4d]">
            <img
              src={adminUser?.avatar || initialsAvatar(adminUser?.name || 'Admin')}
              alt={adminUser?.name || 'Admin Profile'}
              className="w-9 h-9 rounded-xl object-cover border-2 border-white dark:border-[#3e2e5c] shadow-xs"
            />
            <button
              onClick={logout}
              className="p-2 text-[#726c85] dark:text-[#b5a9cd] hover:text-rose-600 dark:text-[#b5a9cd] dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="Logout from Admin Dashboard"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
