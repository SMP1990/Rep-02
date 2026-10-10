import React from 'react';
import { useAdmin } from '../context/AdminContext';
import { RouteType } from '../types/admin';
import { ThemeToggle } from './ThemeToggle';
import { initialsAvatar } from '../utils/imageUpload.ts';
import {   LayoutDashboard,
  ShieldCheck,
  Users,
  BarChart3,
  FileEdit,
  BookOpen,
  Settings,
  LogOut,
  ExternalLink,
  Sparkles,
  X,
  Radio,
  Globe,
  MessageSquare,
  Shuffle,
  Image as ImageIcon,
  Wrench,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { currentRoute, setCurrentRoute, logout, subscribers, blogPosts, adminUser, unreadMessagesCount, siteSettings } = useAdmin();

  const navItems: Array<{
    route: RouteType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    {
      route: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      route: 'messages',
      label: 'Messages & Inquiries',
      icon: MessageSquare,
      count: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    {
      route: 'subscribers',
      label: 'Subscribers',
      icon: Users,
      count: subscribers.length,
    },
    {
      route: 'downloads',
      label: 'Download Stats',
      icon: BarChart3,
    },
    {
      route: 'visitors',
      label: 'Visitors',
      icon: Users,
    },
    {
      route: 'admin-users',
      label: 'Admins & Roles',
      icon: ShieldCheck,
    },
    {
      route: 'content-editor',
      label: 'Content Editor',
      icon: FileEdit,
    },
    {
      route: 'blog-manager',
      label: 'Blog Manager',
      icon: BookOpen,
      count: blogPosts.length,
    },
    {
      route: 'media',
      label: 'Media Library',
      icon: ImageIcon,
    },
    {
      route: 'redirects',
      label: '301 Redirects',
      icon: Shuffle,
    },
    {
      route: 'tools-seo',
      label: 'Tools SEO & FAQ',
      icon: Wrench,
    },
    {
      route: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const handleNavClick = (route: RouteType) => {
    setCurrentRoute(route);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 md:w-68 lg:w-72
        bg-gradient-to-b from-[#4b2e83] via-[#6d46b8] to-[#9e5488]
        text-white flex flex-col justify-between p-6 shadow-2xl md:shadow-none
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Top Header & Brand */}
        <div>
          <div className="flex items-center justify-between pb-6 mb-2 border-b border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e6799f] to-[#7c4fd1] p-0.5 shadow-md flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-[#3d246e]/80 backdrop-blur-xs rounded-[10px] flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5 text-[#f0a8bf]" />
                </div>
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg leading-tight tracking-tight text-white truncate">
                  {siteSettings?.siteName || 'ASK Downloader'}
                </h1>
                <p className="text-[11px] font-semibold text-[#f0a8bf] uppercase tracking-wider">
                  Admin Panel
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Online Service Badge */}
          <div className="my-4 px-3 py-2 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-white/90 font-medium">Downloader Engine</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-md">
              LIVE
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            <div className="px-3 pb-1 text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Management
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => handleNavClick(item.route)}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer
                    ${isActive
                      ? 'bg-white/20 text-white font-semibold shadow-inner ring-1 ring-white/30 backdrop-blur-xs'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/70'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className={`
                      text-[11px] font-bold px-2 py-0.5 rounded-full
                      ${isActive ? 'bg-white dark:bg-[#181224] text-[#6d46b8]' : 'bg-white/15 text-white/90'}
                    `}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Public Links Section */}
            <div className="pt-4 px-3 pb-1 text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Public Website
            </div>

            <button
              onClick={() => handleNavClick('home')}
              className={`
                w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer mb-1
                ${currentRoute === 'home'
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-[#f0a8bf]" />
                <span>Live Website (Frontend)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-white/60" />
            </button>

            <button
              onClick={() => handleNavClick('public-blog')}
              className={`
                w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer mb-1
                ${currentRoute === 'public-blog' || currentRoute === 'public-blog-post'
                  ? 'bg-white/20 text-white font-semibold'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Radio className="w-4 h-4 text-[#f0a8bf]" />
                <span>View Public Blog</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-white/60" />
            </button>
          </nav>
        </div>

        {/* Footer Admin User & Logout */}
        <div className="pt-4 border-t border-white/15 space-y-3">
          {/* Global Theme Toggle */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">
            <span className="text-[11px] font-semibold text-white/80">Theme</span>
            <ThemeToggle variant="pill" id="sidebar-theme-toggle" className="scale-90 origin-right border-white/20" />
          </div>

          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/10 border border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={adminUser?.avatar || initialsAvatar(adminUser?.name || 'Admin')}
                alt={adminUser?.name || 'Admin'}
                className="w-9 h-9 rounded-full object-cover border border-white/30 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {adminUser?.name || 'Admin'}
                </p>
                <p className="text-[11px] text-white/70 truncate">
                  {adminUser?.email || 'admin@example.com'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
