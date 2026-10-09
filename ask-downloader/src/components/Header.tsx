import React, { useState, useEffect, useRef } from 'react';
import { isAuthored } from '../utils/cmsField';
import { INITIAL_SITE_SETTINGS } from '../data/mockAdminData';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RouteLink } from './PageLink';

// The mobile menu items keep their tap animation as real links.
const MotionRouteLink = motion.create(RouteLink);
import { 
  Home,
  BookOpen,
  Mail,
  Info,
  Video,
  ChevronDown,
  X,
  Sparkles,
  Music,
  Instagram,
  Twitter,
  Pin,
  MessageSquare,
  AtSign,
  Tv,
  DownloadCloud,
  ShieldCheck,
  Lock,
  ArrowRight 
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext.tsx';
import { useLanguage, LANGUAGES } from '../context/LanguageContext.tsx';
import { FlagIcon } from './FlagIcon.tsx';
import type { BlogLanguage } from '../config/blogLanguages.ts';
import { SocialPlatform } from '../types.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const { 
    currentRoute, 
    setCurrentRoute, 
    activeSocialPlatform, 
    navigateToDownloader,
    isAuthenticated,
    siteSettings 
  } = useAdmin();

  // Split the site name so the last word keeps the gradient treatment.
  const brandName = (siteSettings?.siteName || 'ASK Downloader').trim();
  const brandWords = brandName.split(/\s+/);
  const [brandLead, brandTail] =
    brandWords.length > 1
      ? [brandWords.slice(0, -1).join(' ') + ' ', brandWords[brandWords.length - 1]]
      : brandName.length > 5
      ? [brandName.slice(0, Math.ceil(brandName.length / 2)), brandName.slice(Math.ceil(brandName.length / 2))]
      : [brandName, ''];
  const { language, setLanguage, t } = useLanguage();
  // Tool list labels in the reader's language (brand names stay as they are).
  const BADGES: Record<string, string> = {
    'All-in-One': t.ui.allInOne, 'No Watermark': t.ui.noWatermark, 'HD Reels': t.ui.hdReels,
    'Fast MP4': t.ui.fastMp4, 'Full HD Pins': t.ui.fullHdPin, 'Audio & HD': t.ui.audioHd,
  };
  const tr = (opt: { platform: string; title: string; subtitle: string; badge: string }) => ({
    title: opt.platform === 'universal' ? t.ui.allPlatforms : opt.title,
    subtitle: t.tools?.[`${opt.platform}Subtitle`] || opt.subtitle,
    badge: BADGES[opt.badge] ?? opt.badge,
  });

  // Desktop dropdown state & hover timeout for smooth interaction
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  // Mobile off-canvas drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(true); // default open in mobile for convenience

  // Language dropdown state
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Sticky header on scroll elevation
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile off-canvas drawer is active
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close dropdowns on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setMobileMenuOpen(false);
        setLangMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Desktop hover handlers with slight debounce to prevent abrupt closing
  const handleMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 180);
  };

  // Downloader menu items specification
  const downloaderOptions: Array<{
    platform: SocialPlatform;
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    hoverBorder: string;
  }> = [
    {
      platform: 'universal',
      title: 'All Platforms',
      subtitle: 'Paste any social video link for auto-detection',
      badge: 'All-in-One',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      icon: Sparkles,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-700',
    },
    {
      platform: 'facebook',
      title: 'Facebook',
      subtitle: 'Reels, Watch & Video Posts (1080p Full HD)',
      badge: '1080p HD',
      badgeColor: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      icon: Video,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
    },
    {
      platform: 'tiktok',
      title: 'TikTok',
      subtitle: 'Videos without watermark & crystal MP3 audio',
      badge: 'No Watermark',
      badgeColor: 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      icon: Music,
      iconBg: 'bg-teal-50 dark:bg-teal-950/60',
      iconColor: 'text-teal-600 dark:text-teal-400',
      hoverBorder: 'hover:border-teal-300 dark:hover:border-teal-700',
    },
    {
      platform: 'instagram',
      title: 'Instagram',
      subtitle: 'Reels, Carousel Posts, Stories & Audio',
      badge: 'HD Reels',
      badgeColor: 'bg-pink-100 dark:bg-pink-950/80 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
      icon: Instagram,
      iconBg: 'bg-pink-50 dark:bg-pink-950/60',
      iconColor: 'text-pink-600 dark:text-pink-400',
      hoverBorder: 'hover:border-pink-300 dark:hover:border-pink-700',
    },
    {
      platform: 'twitter',
      title: 'Twitter / X',
      subtitle: 'Tweets, video clips, and spaces in high quality',
      badge: 'Fast MP4',
      badgeColor: 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      icon: Twitter,
      iconBg: 'bg-sky-50 dark:bg-sky-950/60',
      iconColor: 'text-sky-600 dark:text-sky-400',
      hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-700',
    },
    {
      platform: 'pinterest',
      title: 'Pinterest',
      subtitle: 'Video Pins, Idea Pins & tutorials in Full HD',
      badge: 'Full HD Pins',
      badgeColor: 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      icon: Pin,
      iconBg: 'bg-red-50 dark:bg-red-950/60',
      iconColor: 'text-red-600 dark:text-red-400',
      hoverBorder: 'hover:border-red-300 dark:hover:border-red-700',
    },
    {
      platform: 'reddit',
      title: 'Reddit',
      subtitle: 'Posts, clips, audio & v.redd.it videos in HD',
      badge: 'Audio & HD',
      badgeColor: 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      icon: MessageSquare,
      iconBg: 'bg-orange-50 dark:bg-orange-950/60',
      iconColor: 'text-orange-600 dark:text-orange-400',
      hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-700',
    },
    {
      platform: 'threads',
      title: 'Threads',
      subtitle: 'Posts, video clips & audio in HD',
      badge: 'HD MP4',
      badgeColor: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
      icon: AtSign,
      iconBg: 'bg-zinc-100 dark:bg-zinc-900',
      iconColor: 'text-zinc-900 dark:text-zinc-200',
      hoverBorder: 'hover:border-zinc-400 dark:hover:border-zinc-600',
    },
    {
      platform: 'dailymotion',
      title: 'Dailymotion',
      subtitle: 'HD Streams, videos & MP3 audio',
      badge: 'DM HD',
      badgeColor: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      icon: Tv,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700',
    },
  ];

  const handleSelectDownloader = (platform: SocialPlatform) => {
    setIsDropdownOpen(false);
    setMobileMenuOpen(false);
    navigateToDownloader(platform);
  };

  // Nav items are real links (see PageLink); this just tidies the menus
  // before the page changes.
  const closeMenus = () => {
    setIsDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  // Determine active route state
  const isHomeActive = currentRoute === 'home';
  const isBlogActive = currentRoute === 'public-blog' || currentRoute === 'public-blog-post';
  const isContactActive = currentRoute === 'contact';
  const isAboutActive = currentRoute === 'about-us';
  const isDownloaderActive = isHomeActive && (activeSocialPlatform !== undefined);

  return (
    <>
      <header
        id="main-navigation-header"
        role="banner"
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 dark:bg-[#181224]/95 backdrop-blur-md shadow-sm border-b border-[#eae3ee] dark:border-[#2e1d4d]'
            : 'bg-white/90 dark:bg-[#181224]/90 backdrop-blur-xs border-b border-[#eae3ee]/80 dark:border-[#2e1d4d]/80'
        } ${className}`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* BRAND LOGO */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <RouteLink route="home" onBeforeNavigate={closeMenus}
              className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#6d46b8] rounded-xl min-w-0"
              aria-label={`${siteSettings?.siteName || ''} — ${t.ui.siteHome}`}
            >
              {/* Logo: the one uploaded in Settings, or the built-in mark. */}
              {siteSettings?.logoUrl ? (
                <img
                  src={siteSettings.logoUrl}
                  alt={siteSettings.siteName || 'Site logo'}
                  className="h-9 sm:h-11 w-auto max-w-[150px] object-contain shrink-0 group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#4b2e83] via-[#6d46b8] to-[#e6799f] p-0.5 shadow-sm group-hover:scale-105 transition-transform duration-200 shrink-0">
                  <div className="w-full h-full bg-[#341d5b] rounded-[10px] flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#f0a8bf] group-hover:rotate-12 transition-transform duration-300" />
                  </div>
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Name comes from Settings. The last word keeps the
                      gradient so the look stays the same for any name. */}
                  <span className="font-heading font-extrabold text-lg sm:text-2xl tracking-tight text-[#2e2440] dark:text-[#f4eefb] whitespace-nowrap">
                    {brandLead}
                    {brandTail && (
                      <span className="bg-gradient-to-r from-[#6d46b8] to-[#e6799f] bg-clip-text text-transparent">{brandTail}</span>
                    )}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] border border-[#a78bda]/30 whitespace-nowrap">
                    <ShieldCheck className="w-3 h-3 text-[#6d46b8] dark:text-[#d1b9f7]" /> {t.ui.fastSafe}
                  </span>
                </div>
                <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] hidden md:block font-medium truncate">
                  {isAuthored(siteSettings?.siteTagline, INITIAL_SITE_SETTINGS.siteTagline) ? siteSettings.siteTagline : t.header?.subtitle}
                </p>
              </div>
            </RouteLink>
          </div>

          {/* DESKTOP MAIN NAVIGATION (4 MAIN MENU ITEMS) */}
          <nav
            role="navigation"
            aria-label={t.ui.mainNav}
            className="hidden lg:flex items-center gap-1 xl:gap-2"
          >
            {/* 1. HOME */}
            <RouteLink route="home" onBeforeNavigate={closeMenus}
              id="nav-link-home"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isHomeActive
                  ? 'text-[#4b2e83] dark:text-[#f4eefb] bg-[#f1e9fb] dark:bg-[#261b3b] shadow-2xs'
                  : 'text-[#5e5473] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <Home className={`w-4 h-4 ${isHomeActive ? 'text-[#6d46b8] dark:text-[#d1b9f7]' : 'text-[#8b849c]'}`} />
              <span>{t.header?.home || 'Home'}</span>
            </RouteLink>

            {/* 2. VIDEO DOWNLOADER (DROPDOWN MENU) */}
            <div
              ref={dropdownContainerRef}
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                id="nav-dropdown-downloader-btn"
                type="button"
                onClick={() => setIsDropdownOpen(prev => !prev)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[#6d46b8] ${
                  isDownloaderActive || isDropdownOpen
                    ? 'text-[#4b2e83] dark:text-[#f4eefb] bg-[#f1e9fb] dark:bg-[#261b3b]'
                    : 'text-[#5e5473] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <DownloadCloud className={`w-4 h-4 ${isDownloaderActive ? 'text-[#6d46b8] dark:text-[#d1b9f7]' : 'text-[#8b849c]'}`} />
                <span>{t.header?.videoDownloader || 'Video Downloader'}</span>
                <ChevronDown 
                  className={`w-3.5 h-3.5 transition-transform duration-200 text-[#8b849c] ${
                    isDropdownOpen ? 'rotate-180 text-[#6d46b8] dark:text-[#d1b9f7]' : 'rotate-0'
                  }`} 
                />
              </button>

              {/* DROPDOWN MENU POPOVER */}
              {isDropdownOpen && (
                <div
                  id="nav-dropdown-downloader-menu"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="nav-dropdown-downloader-btn"
                  className="absolute left-0 top-full pt-2.5 w-80 lg:w-92 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="p-2.5 bg-white dark:bg-[#1a1329] rounded-2xl shadow-xl shadow-[#4b2e83]/10 dark:shadow-black/60 border border-[#eae3ee] dark:border-[#2e1d4d] backdrop-blur-md">
                    <div className="px-3 py-1.5 mb-1 flex items-center justify-between border-b border-[#eae3ee]/60 dark:border-[#2e1d4d]/60">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#726c85] dark:text-[#887c9f]">
                        {t.header?.selectDownloader || 'Select Downloader Tool'}
                      </span>
                      <span className="text-[10px] font-semibold text-[#6d46b8] dark:text-[#d1b9f7] bg-[#f1e9fb] dark:bg-[#261b3b] px-2 py-0.5 rounded-full">
                        {t.header?.instantSwitch || 'Instant Switch'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {downloaderOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isCurrentActive = isHomeActive && activeSocialPlatform === opt.platform;

                        return (
                          <button
                            key={opt.platform}
                            id={`dropdown-item-${opt.platform}`}
                            role="menuitem"
                            onClick={() => handleSelectDownloader(opt.platform)}
                            className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer border border-transparent ${opt.hoverBorder} ${
                              isCurrentActive
                                ? 'bg-[#f1e9fb]/80 dark:bg-[#261b3b]/80 border-[#6d46b8]/20'
                                : 'hover:bg-slate-50 dark:hover:bg-[#221935]'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg ${opt.iconBg} ${opt.iconColor} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-bold text-[#2e2440] dark:text-[#f4eefb] truncate">
                                  {tr(opt).title}
                                </span>
                                <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${opt.badgeColor} shrink-0`}>
                                  {tr(opt).badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd] truncate mt-0.5 leading-tight">
                                {tr(opt).subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Helper Footer in Dropdown */}
                    <div className="mt-2 pt-2 px-3 border-t border-[#eae3ee]/60 dark:border-[#2e1d4d]/60 flex items-center justify-between text-[11px] text-[#726c85] dark:text-[#887c9f]">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#e6799f]" />
                        {t.ui.directHome}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        100% Free
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. BLOG */}
            <RouteLink route="public-blog" onBeforeNavigate={closeMenus}
              id="nav-link-blog"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isBlogActive
                  ? 'text-[#4b2e83] dark:text-[#f4eefb] bg-[#f1e9fb] dark:bg-[#261b3b] shadow-2xs'
                  : 'text-[#5e5473] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${isBlogActive ? 'text-[#6d46b8] dark:text-[#d1b9f7]' : 'text-[#8b849c]'}`} />
              <span>{t.header?.blog || 'Blog'}</span>
            </RouteLink>

            {/* 4. CONTACT US */}
            <RouteLink route="about-us" onBeforeNavigate={closeMenus}
              id="nav-link-about"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isAboutActive
                  ? 'text-[#4b2e83] dark:text-[#f4eefb] bg-[#f1e9fb] dark:bg-[#261b3b] shadow-2xs'
                  : 'text-[#5e5473] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <Info className={`w-4 h-4 ${isAboutActive ? 'text-[#6d46b8] dark:text-[#d1b9f7]' : 'text-[#8b849c]'}`} />
              <span>{t.header?.about || 'About Us'}</span>
            </RouteLink>

            <RouteLink route="contact" onBeforeNavigate={closeMenus}
              id="nav-link-contact"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isContactActive
                  ? 'text-[#4b2e83] dark:text-[#f4eefb] bg-[#f1e9fb] dark:bg-[#261b3b] shadow-2xs'
                  : 'text-[#5e5473] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <Mail className={`w-4 h-4 ${isContactActive ? 'text-[#6d46b8] dark:text-[#d1b9f7]' : 'text-[#8b849c]'}`} />
              <span>{t.header?.contact || 'Contact Us'}</span>
            </RouteLink>
          </nav>

          {/* RIGHT CONTROLS: THEME TOGGLE, LANGUAGE SWITCHER, ADMIN PORTAL LINK, HAMBURGER */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Global Theme Toggle: Compact icon on mobile, Dual-pill on tablet/desktop */}
            <div className="hidden sm:block shrink-0">
              <ThemeToggle 
                variant="pill" 
                id="header-nav-theme-toggle-desktop" 
                className="scale-95" 
              />
            </div>
            <div className="sm:hidden shrink-0">
              <ThemeToggle 
                variant="icon" 
                id="header-nav-theme-toggle-mobile" 
                className="w-9 h-9" 
              />
            </div>

            {/* Language Switcher Toggle */}
            <div className="relative shrink-0" ref={langDropdownRef}>
              <button
                type="button"
                id="header-language-switcher-btn"
                onClick={() => setLangMenuOpen(prev => !prev)}
                aria-label={t.header.languageSelect}
                aria-expanded={langMenuOpen}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-[#5e5473] dark:text-[#b5a9cd] bg-white dark:bg-[#1f1630] border border-[#eae3ee] dark:border-[#2e1d4d] hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <span className="w-5 h-3.5 rounded-[2px] overflow-hidden ring-1 ring-black/10 dark:ring-white/15 shrink-0">
                  <FlagIcon code={language as BlogLanguage} className="w-full h-full block" />
                </span>
                <span className="uppercase text-[11px] sm:text-xs">{language}</span>
                <ChevronDown className={`w-3 h-3 text-[#726c85] dark:text-[#b5a9cd] transition-transform duration-150 ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {langMenuOpen && (
                <div 
                  id="header-language-dropdown-menu"
                  className="absolute end-0 mt-1.5 w-48 max-h-[70vh] overflow-y-auto py-1.5 bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  {LANGUAGES.map((langItem) => (
                    <button
                      key={langItem.code}
                      onClick={() => {
                        setLanguage(langItem.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                        language === langItem.code
                          ? 'bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-3.5 rounded-[2px] overflow-hidden ring-1 ring-black/10 dark:ring-white/15 shrink-0">
                          <FlagIcon code={langItem.code as BlogLanguage} className="w-full h-full block" />
                        </span>
                        <span className="truncate">{langItem.nativeName}</span>
                      </span>
                      {language === langItem.code && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6d46b8] dark:bg-[#d1b9f7]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Dashboard Link (only visible when authenticated) */}
            {isAuthenticated && (
              <button
                id="btn-admin-portal"
                onClick={() => setCurrentRoute('dashboard')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#4b2e83] dark:text-[#f4eefb] bg-[#f1e9fb]/80 dark:bg-[#261b3b] hover:bg-[#e8dbf7] dark:hover:bg-[#341d5b] border border-[#a78bda]/30 rounded-xl transition-all cursor-pointer shadow-2xs"
                title={t.ui.openAdmin}
              >
                <Lock className="w-3.5 h-3.5 text-[#6d46b8] dark:text-[#f0a8bf]" />
                <span>Admin</span>
              </button>
            )}

            {/* MOBILE HAMBURGER BUTTON (Visible on mobile & tablets < 1024px) */}
            <motion.button
              type="button"
              id="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label={mobileMenuOpen ? t.ui.closeMenu : t.ui.mainNav}
              aria-expanded={mobileMenuOpen}
              whileTap={{ scale: 0.9 }}
              className={`lg:hidden shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border transition-colors duration-200 flex items-center justify-center cursor-pointer shadow-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#6d46b8] ${
                mobileMenuOpen
                  ? 'bg-gradient-to-tr from-[#4b2e83] to-[#e6799f] border-transparent text-white'
                  : 'bg-[#f6f0f4] dark:bg-[#201538] border-[#d8cce4] dark:border-[#432d6d] text-[#4b2e83] dark:text-[#f4eefb] hover:bg-[#efe4fb] dark:hover:bg-[#2e1f4d]'
              }`}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                <motion.span
                  className="absolute w-5 h-0.5 rounded-full bg-current"
                  animate={mobileMenuOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                />
                <motion.span
                  className="absolute w-5 h-0.5 rounded-full bg-current"
                  animate={mobileMenuOpen ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                />
                <motion.span
                  className="absolute w-5 h-0.5 rounded-full bg-current"
                  animate={mobileMenuOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 6 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                />
              </div>
            </motion.button>
          </div>
        </div>
      </header>

      {/* MOBILE SLIDE-IN OFF-CANVAS NAVIGATION DRAWER VIA REACT PORTAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              id="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[9998] bg-slate-950/70 backdrop-blur-xs lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              {/* Off-canvas Drawer Panel */}
              <motion.div
                id="mobile-nav-drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm bg-white dark:bg-[#160f22] border-l border-[#eae3ee] dark:border-[#2e1d4d] shadow-2xl flex flex-col z-[9999] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Decorative ambient glow */}
                <div className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full bg-gradient-to-br from-[#e6799f]/25 to-[#6d46b8]/20 blur-3xl" />
                <div className="pointer-events-none absolute top-1/2 -left-16 w-44 h-44 rounded-full bg-[#4b2e83]/15 dark:bg-[#4b2e83]/25 blur-3xl" />

                {/* Drawer Top Header */}
                <div className="relative p-4 sm:p-5 border-b border-[#eae3ee] dark:border-[#2e1d4d] flex items-center justify-between bg-white/80 dark:bg-[#160f22]/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4b2e83] via-[#6d46b8] to-[#e6799f] p-0.5 flex items-center justify-center shadow-xs">
                      <div className="w-full h-full bg-[#341d5b] rounded-[10px] flex items-center justify-center text-white">
                        <Sparkles className="w-4 h-4 text-[#f0a8bf]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-extrabold text-lg text-[#2e2440] dark:text-[#f4eefb]">
                          {/* Same name and split as the desktop logo — it used to
                              be the old brand, hardcoded. */}
                          {brandLead}<span className="text-[#6d46b8] dark:text-[#a78bda]">{brandTail}</span>
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#f1e9fb] dark:bg-[#261b3b] text-[#6d46b8] dark:text-[#d1b9f7] border border-[#a78bda]/30">
                          Fast
                        </span>
                      </div>
                      <span className="block text-[11px] font-medium text-[#726c85] dark:text-[#a78bda]">
                        {isAuthored(siteSettings?.siteTagline, INITIAL_SITE_SETTINGS.siteTagline) ? siteSettings.siteTagline : t.header?.subtitle}
                      </span>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-10 h-10 rounded-xl text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={t.ui.closeMenu}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Drawer Scrollable Content */}
                <motion.div
                  className="relative flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                  }}
                >
                  {/* Quick Jump Platforms Bar */}
                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#726c85] dark:text-[#887c9f] mb-2 px-1">
                      {t.ui.quickTools}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleSelectDownloader('facebook')}
                        className="p-2 rounded-xl text-center bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100 transition-colors"
                      >
                        <span className="block text-xs font-bold text-blue-600 dark:text-blue-400">Facebook</span>
                        <span className="block text-[9px] text-[#726c85] dark:text-[#a29cb2]">1080p HD</span>
                      </button>
                      <button
                        onClick={() => handleSelectDownloader('tiktok')}
                        className="p-2 rounded-xl text-center bg-pink-50 dark:bg-pink-950/40 border border-pink-200/60 dark:border-pink-800/40 hover:bg-pink-100 transition-colors"
                      >
                        <span className="block text-xs font-bold text-pink-600 dark:text-pink-400">TikTok</span>
                        <span className="block text-[9px] text-[#726c85] dark:text-[#a29cb2]">{t.ui.noWatermark}</span>
                      </button>
                      <button
                        onClick={() => handleSelectDownloader('instagram')}
                        className="p-2 rounded-xl text-center bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 hover:bg-purple-100 transition-colors"
                      >
                        <span className="block text-xs font-bold text-[#6d46b8] dark:text-[#a78bda]">Instagram</span>
                        <span className="block text-[9px] text-[#726c85] dark:text-[#a29cb2]">Reels/Audio</span>
                      </button>
                    </div>
                  </motion.div>

                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                    className="border-t border-[#eae3ee] dark:border-[#2e1d4d]/60 pt-2 space-y-1.5"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#726c85] dark:text-[#887c9f] px-1 mb-1">
                      Navigation
                    </div>

                    {/* 1. HOME */}
                    <MotionRouteLink route="home" onBeforeNavigate={closeMenus}
                      whileTap={{ scale: 0.98 }}
                      id="mobile-nav-home"
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        isHomeActive
                          ? 'bg-[#f1e9fb] dark:bg-[#261b3b] text-[#4b2e83] dark:text-[#f4eefb] shadow-2xs'
                          : 'text-[#2e2440] dark:text-[#f4eefb] hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isHomeActive ? 'bg-white dark:bg-[#341d5b] text-[#6d46b8]' : 'bg-slate-100 dark:bg-slate-800 text-[#726c85] dark:text-[#b5a9cd]'}`}>
                          <Home className="w-4 h-4" />
                        </div>
                        <span>{t.header?.home || 'Home'}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8b849c]" />
                    </MotionRouteLink>

                    {/* 2. VIDEO DOWNLOADER ACCORDION */}
                    <div className="rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] overflow-hidden bg-slate-50/50 dark:bg-[#1b1428]/60">
                      <button
                        type="button"
                        id="mobile-accordion-downloader-toggle"
                        onClick={() => setMobileDropdownOpen(prev => !prev)}
                        className="w-full flex items-center justify-between p-3 text-sm font-bold text-[#2e2440] dark:text-[#f4eefb] cursor-pointer"
                        aria-expanded={mobileDropdownOpen}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-[#341d5b] text-[#6d46b8] dark:text-[#d1b9f7]">
                            <DownloadCloud className="w-4 h-4" />
                          </div>
                          <span>{t.header?.videoDownloader || 'Video Downloader'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#6d46b8] text-white">
                            {downloaderOptions.length} Tools
                          </span>
                          <motion.span animate={{ rotate: mobileDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="w-4 h-4 text-[#726c85] dark:text-[#b5a9cd]" />
                          </motion.span>
                        </div>
                      </button>

                      {/* Sub-items for all platforms */}
                      <AnimatePresence initial={false}>
                        {mobileDropdownOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-[#eae3ee]/70 dark:border-[#2e1d4d]/70 max-h-64 overflow-y-auto">
                              {downloaderOptions.map((opt) => {
                                const Icon = opt.icon;
                                const isCurrentActive = isHomeActive && activeSocialPlatform === opt.platform;

                                return (
                                  <button
                                    key={opt.platform}
                                    id={`mobile-downloader-item-${opt.platform}`}
                                    onClick={() => handleSelectDownloader(opt.platform)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                      isCurrentActive
                                        ? 'bg-[#f1e9fb] dark:bg-[#261b3b] border border-[#6d46b8]/30 text-[#4b2e83] dark:text-[#f4eefb]'
                                        : 'bg-white dark:bg-[#1a1329] hover:bg-slate-100 dark:hover:bg-[#221935] text-[#2e2440] dark:text-[#f4eefb]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                      <div className={`p-1.5 rounded-lg ${opt.iconBg} ${opt.iconColor} shrink-0`}>
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="text-xs font-bold block truncate">
                                          {tr(opt).title}
                                        </span>
                                        <span className="text-[10px] text-[#726c85] dark:text-[#b5a9cd] block truncate">
                                          {tr(opt).badge}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-[#6d46b8] dark:text-[#a78bda] whitespace-nowrap">
                                      Load →
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* 3. BLOG */}
                    <MotionRouteLink route="public-blog" onBeforeNavigate={closeMenus}
                      whileTap={{ scale: 0.98 }}
                      id="mobile-nav-blog"
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        isBlogActive
                          ? 'bg-[#f1e9fb] dark:bg-[#261b3b] text-[#4b2e83] dark:text-[#f4eefb] shadow-2xs'
                          : 'text-[#2e2440] dark:text-[#f4eefb] hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isBlogActive ? 'bg-white dark:bg-[#341d5b] text-[#6d46b8]' : 'bg-slate-100 dark:bg-slate-800 text-[#726c85] dark:text-[#b5a9cd]'}`}>
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <span>{t.header?.blog || 'Blog'}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8b849c]" />
                    </MotionRouteLink>

                    {/* 4. CONTACT US */}
                    <MotionRouteLink route="about-us" onBeforeNavigate={closeMenus}
                      whileTap={{ scale: 0.98 }}
                      id="mobile-nav-about"
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        isAboutActive
                          ? 'bg-[#f1e9fb] dark:bg-[#261b3b] text-[#4b2e83] dark:text-[#f4eefb] shadow-2xs'
                          : 'text-[#2e2440] dark:text-[#f4eefb] hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isAboutActive ? 'bg-white dark:bg-[#341d5b] text-[#6d46b8]' : 'bg-slate-100 dark:bg-slate-800 text-[#726c85] dark:text-[#b5a9cd]'}`}>
                          <Info className="w-4 h-4" />
                        </div>
                        <span>{t.header?.about || 'About Us'}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8b849c]" />
                    </MotionRouteLink>

                    <MotionRouteLink route="contact" onBeforeNavigate={closeMenus}
                      whileTap={{ scale: 0.98 }}
                      id="mobile-nav-contact"
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        isContactActive
                          ? 'bg-[#f1e9fb] dark:bg-[#261b3b] text-[#4b2e83] dark:text-[#f4eefb] shadow-2xs'
                          : 'text-[#2e2440] dark:text-[#f4eefb] hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isContactActive ? 'bg-white dark:bg-[#341d5b] text-[#6d46b8]' : 'bg-slate-100 dark:bg-slate-800 text-[#726c85] dark:text-[#b5a9cd]'}`}>
                          <Mail className="w-4 h-4" />
                        </div>
                        <span>{t.header?.contact || 'Contact Us'}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8b849c]" />
                    </MotionRouteLink>
                  </motion.div>
                </motion.div>

                {/* Drawer Footer Actions */}
                <div className="relative p-4 sm:p-5 border-t border-[#eae3ee] dark:border-[#2e1d4d] bg-slate-50/80 dark:bg-[#160f22] space-y-3">
                  {/* Language Selection Chips in Drawer */}
                  <div>
                    <span className="block text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] mb-1.5">
                      {t.header?.languageSelect || 'Select Language'}
                    </span>
                    {/* Two columns, not three: native names like "Bahasa
                        Indonesia" have nowhere to go in a third of a phone. */}
                    <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pe-0.5">
                      {LANGUAGES.map((langItem) => (
                        <button
                          key={langItem.code}
                          type="button"
                          onClick={() => setLanguage(langItem.code)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-start gap-1.5 min-w-0 transition-all cursor-pointer ${
                            language === langItem.code
                              ? 'bg-[#6d46b8] text-white shadow-xs'
                              : 'bg-white dark:bg-[#201538] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="w-5 h-3.5 rounded-[2px] overflow-hidden ring-1 ring-black/10 dark:ring-white/15 shrink-0">
                            <FlagIcon code={langItem.code as BlogLanguage} className="w-full h-full block" />
                          </span>
                          <span className="truncate">{langItem.nativeName}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd]">
                      {t.ui.themeMode}
                    </span>
                    <ThemeToggle variant="pill" id="mobile-drawer-theme-toggle" />
                  </div>

                  {isAuthenticated && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setCurrentRoute('dashboard');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] hover:opacity-95 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#f0a8bf]" />
                      <span>{t.header.adminDashboard}</span>
                    </motion.button>
                  )}

                  <p className="text-[10px] text-center text-[#726c85] dark:text-[#887c9f]">
                    &copy; {new Date().getFullYear()} {siteSettings?.siteName || 'ASK Downloader'}. All rights reserved.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
