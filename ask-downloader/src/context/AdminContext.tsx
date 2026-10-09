import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { confirmLeave } from '../utils/unsavedGuard';
import { 
  AdminUser, 
  Subscriber, 
  DownloadStat, 
  BlogPost, 
  LandingContent, 
  SiteSettings, 
  RouteType,
  BlogCategory,
  BlogComment,
  ThemeMode,
  AdminRealtimeToast,
  ContactMessage,
  ContactMessageTopic
} from '../types/admin';
import { SocialPlatform } from '../types';
import { 
  playVideoDownloadChime, 
  playNewCommentChime 
} from '../utils/audioChimes';
import { 
  INITIAL_ADMIN_USER, 
  INITIAL_SUBSCRIBERS, 
  INITIAL_DOWNLOAD_STATS, 
  INITIAL_LANDING_CONTENT, 
  INITIAL_SITE_SETTINGS,
  INITIAL_BLOG_CATEGORIES,
  INITIAL_BLOG_COMMENTS,
  INITIAL_CONTACT_MESSAGES,
  INITIAL_SITE_PAGES,
} from '../data/mockAdminData';
import { INITIAL_BLOG_POSTS } from '../data/blogSeed.ts';
import { isBlogLanguage, type BlogLanguage } from '../config/blogLanguages.ts';
import { setBrandName } from '../config/brand.ts';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface AdminContextType {
  // Auth & Navigation
  isAuthenticated: boolean;
  adminUser: AdminUser | null;
  currentRoute: RouteType;
  activePostSlug: string | null;
  activeBlogSlug: string | null;
  activeSocialPlatform: SocialPlatform;
  setActiveSocialPlatform: (platform: SocialPlatform) => void;
  navigateToDownloader: (platform?: SocialPlatform) => void;
  homeResetKey: number;
  resetHomeTool: () => void;
  login: (email: string, pass: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setCurrentRoute: (route: RouteType) => void;
  navigateToBlogPost: (slug: string) => void;
  navigateToBlogListing: () => void;
  navigateToBlogLanguage: (lang: BlogLanguage) => void;
  activeBlogLanguage: BlogLanguage | null;

  // Subscribers
  subscribers: Subscriber[];
  addSubscriber: (email: string, source?: string) => { success: boolean; error?: string };
  deleteSubscriber: (id: string) => void;
  exportSubscribersCsv: () => void;

  // Downloads
  downloadStats: DownloadStat[];
  deleteDownloadStat: (id: string) => void;
  downloadTotals: { total: number; byQuality: Record<string, number>; byPlatform: Record<string, number>; byDate: Record<string, number>; byDateQuality?: Record<string, Record<string, number>> };
  recordDownloadCompleted: (stat: Omit<DownloadStat, 'id' | 'downloadedAt'> & { id?: string; downloadedAt?: string }) => void;
  simulateLiveDownload: (custom?: Partial<DownloadStat>) => void;

  // Content Editor
  landingContent: LandingContent;
  updateHeroContent: (hero: LandingContent['hero']) => void;
  updateFeaturesContent: (features: LandingContent['features']) => void;
  updateFaqsContent: (faqs: LandingContent['faqs']) => void;
  resetLandingContent: () => void;

  // Blog Manager
  blogPosts: BlogPost[];
  /** True once the post list has come back from the server (or failed to).
   *  Until then an unknown slug may simply be a post that hasn't arrived. */
  blogLoaded: boolean;
  addBlogPost: (post: Omit<BlogPost, 'id' | 'views' | 'publishedAt' | 'updatedAt'>) => BlogPost;
  updateBlogPost: (id: string, updates: Partial<BlogPost>) => void;
  deleteBlogPost: (id: string) => void;
  togglePostStatus: (id: string) => void;
  /** Re-reads posts from the server (after edits made outside the editor). */
  reloadBlog: () => Promise<void>;
  getPostBySlug: (slug: string) => BlogPost | undefined;

  // Blog Categories
  blogCategories: BlogCategory[];
  addBlogCategory: (cat: Omit<BlogCategory, 'id' | 'createdAt'>) => { success: boolean; error?: string; category?: BlogCategory };
  updateBlogCategory: (id: string, updates: Partial<BlogCategory>) => { success: boolean; error?: string };
  deleteBlogCategory: (id: string, reassignCategoryId?: string) => { success: boolean; message?: string };

  // Blog Comments
  blogComments: BlogComment[];
  addBlogComment: (commentData: { postId: string; authorName: string; authorEmail: string; website?: string; content: string }) => { success: boolean; comment?: BlogComment; error?: string };
  approveBlogComment: (id: string) => void;
  rejectBlogComment: (id: string) => void;
  deleteBlogComment: (id: string) => void;
  toggleCommentStatus: (id: string) => void;
  getCommentsForPost: (postId: string, approvedOnly?: boolean) => BlogComment[];
  pendingCommentsCount: number;

  // Contact Inquiries & Messages
  contactMessages: ContactMessage[];
  addContactMessage: (msg: { name: string; email: string; topic: ContactMessageTopic; topicLabel?: string; message: string }) => { success: boolean; messageId: string };
  markMessageAsRead: (id: string) => void;
  markMessageAsUnread: (id: string) => void;
  markMessageAsReplied: (id: string, notes?: string) => void;
  archiveContactMessage: (id: string) => void;
  deleteContactMessage: (id: string) => void;
  exportMessagesCsv: () => void;
  unreadMessagesCount: number;

  // Settings
  siteSettings: SiteSettings;
  sitePages: any;
  updateSitePages: (pages: any) => void;
  /** Machine translations of the page text: { [text]: { [lang]: translation } }. */
  pageTranslations: Record<string, Record<string, string>>;
  /** Re-reads the translations after the admin corrects one. */
  refreshPageTranslations: () => void;
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;
  updateAdminProfile: (name: string, email: string, avatar: string) => void;
  changePassword: (oldPass: string, newPass: string) => { success: boolean; message: string };

  // Toast & Real-Time Notification System
  toast: ToastState;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  hideToast: () => void;
  activeToasts: AdminRealtimeToast[];
  notificationsHistory: AdminRealtimeToast[];
  unreadNotificationsCount: number;
  notificationSoundEnabled: boolean;
  toggleNotificationSound: () => void;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotificationsHistory: () => void;
  notifyVideoDownloadCompleted: (stat: DownloadStat | (Omit<DownloadStat, 'id' | 'downloadedAt'> & { id?: string; downloadedAt?: string })) => void;
  notifyNewCommentSubmitted: (comment: BlogComment) => void;
  simulateLiveComment: (custom?: Partial<BlogComment>) => void;

  // Global Theme (Lavender vs Deep Night)
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// URL Location Resolver
// (Admin credentials are never present in client-side code — they live only
// as server-side environment variables and are checked via /api/admin/login.)

export function parseCurrentLocation(
  isAuth: boolean
): { route: RouteType; slug: string | null; language: BlogLanguage | null } {
  if (typeof window === 'undefined') return { route: 'home', slug: null, language: null };
  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const rawHash = window.location.hash.replace('#', '').toLowerCase();

  // 1. Direct WordPress-style /admin or /wp-admin (or /login)
  if (
    rawPath === '/admin' || 
    rawPath === '/wp-admin' || 
    rawPath === '/login' || 
    rawHash === 'admin' || 
    rawHash === 'wp-admin' || 
    rawHash === 'login'
  ) {
    return { route: isAuth ? 'dashboard' : 'login', slug: null, language: null };
  }

  // 2. Direct blog routes
  if (rawPath === '/blog' || rawHash === 'public-blog' || rawHash === 'blog') {
    return { route: 'public-blog', slug: null, language: null };
  }
  // /blog/en, /blog/ur ... are language archives. Post slugs can never collide
  // with these: the editor refuses to save a slug that is a language code.
  if (rawPath.startsWith('/blog/')) {
    const segment = rawPath.replace('/blog/', '');
    if (isBlogLanguage(segment)) {
      return { route: 'public-blog-language', slug: null, language: segment };
    }
    return { route: 'public-blog-post', slug: segment || null, language: null };
  }
  if (rawHash.startsWith('blog/')) {
    const segment = rawHash.replace('blog/', '');
    if (isBlogLanguage(segment)) {
      return { route: 'public-blog-language', slug: null, language: segment };
    }
    return { route: 'public-blog-post', slug: segment || null, language: null };
  }

  // 3. Contact page
  if (rawPath === '/contact' || rawHash === 'contact') {
    return { route: 'contact', slug: null, language: null };
  }

  // 3b. Legal / about pages
  if (rawPath === '/privacy-policy' || rawHash === 'privacy-policy') {
    return { route: 'privacy-policy', slug: null, language: null };
  }
  if (rawPath === '/terms-of-use' || rawHash === 'terms-of-use') {
    return { route: 'terms-of-use', slug: null, language: null };
  }
  if (rawPath === '/legal' || rawHash === 'legal') {
    return { route: 'legal', slug: null, language: null };
  }
  if (rawPath === '/about-us' || rawHash === 'about-us') {
    return { route: 'about-us', slug: null, language: null };
  }

  // 4. Admin subroutes
  const adminRoutes: RouteType[] = ['dashboard', 'subscribers', 'downloads', 'visitors', 'admin-users', 'content-editor', 'blog-manager', 'settings', 'messages', 'redirects', 'media'];
  for (const r of adminRoutes) {
    if (rawPath === `/admin/${r}` || rawHash === r) {
      return { route: isAuth ? r : 'login', slug: null, language: null };
    }
  }

  // The home page, including home-page anchors like /#section-social-tools.
  if (rawPath === '') return { route: 'home', slug: null, language: null };

  // Any other path is not a page on this site. It used to show the home
  // page, so a mistyped link looked like it worked — and to a search engine
  // every made-up URL was a copy of the home page. The server answers these
  // with a 404 status; this shows the matching page.
  return { route: 'not-found', slug: null, language: null };
}

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state with localStorage persistence and system fallback
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('fdownloader_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('fdownloader_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      showToast(next === 'dark' ? 'Dark mode enabled' : 'Light mode enabled', 'info');
      return next;
    });
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    showToast(newTheme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled', 'info');
  };

  // Check auth from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('fdownloader_admin_auth') === 'true';
  });

  // Guards against a race condition: the mount-time session check below can
  // still be in flight when the admin submits the login form and succeeds
  // first. Without this flag, that check would land afterward and — since
  // it was sent before the cookie existed — incorrectly report "not logged
  // in" and bounce the freshly-authenticated admin back to the login page.
  const sessionCheckSupersededRef = useRef(false);

  // The localStorage flag above is only an optimistic UI hint (avoids a
  // flash of the login page for a probably-still-logged-in admin). The
  // server's httpOnly session cookie is the only real source of truth —
  // verify it here and correct the state immediately if it disagrees.
  useEffect(() => {
    fetch('/api/admin/verify-session', { method: 'POST', credentials: 'same-origin' })
      .then((res) => res.json())
      .then((data) => {
        if (sessionCheckSupersededRef.current) return; // a real login already happened — trust that instead
        if (!data.valid) {
          setIsAuthenticated(false);
          localStorage.removeItem('fdownloader_admin_auth');
          const adminRoutes: RouteType[] = ['dashboard', 'subscribers', 'downloads', 'visitors', 'admin-users', 'content-editor', 'blog-manager', 'settings', 'messages', 'redirects', 'media'];
          if (adminRoutes.includes(currentRoute)) {
            setCurrentRouteState('login');
          }
        } else {
          setIsAuthenticated(true);
          localStorage.setItem('fdownloader_admin_auth', 'true');
          if (currentRoute === 'login') {
            setCurrentRouteState('dashboard');
            if (typeof window !== 'undefined') {
              try {
                window.history.pushState(null, '', '/admin');
              } catch {
                window.location.hash = 'dashboard';
              }
            }
          }
        }
      })
      .catch(() => {
        if (sessionCheckSupersededRef.current) return;
        // Server unreachable — fail closed rather than trusting the local hint.
        setIsAuthenticated(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('fdownloader_admin_user');
    return saved ? JSON.parse(saved) : INITIAL_ADMIN_USER;
  });

  const [currentRoute, setCurrentRouteState] = useState<RouteType>(() => {
    const isAuth = localStorage.getItem('fdownloader_admin_auth') === 'true';
    return parseCurrentLocation(isAuth).route;
  });

  const [activeSocialPlatform, setActiveSocialPlatform] = useState<SocialPlatform>('universal');

  const [activePostSlug, setActivePostSlug] = useState<string | null>(() => {
    const isAuth = localStorage.getItem('fdownloader_admin_auth') === 'true';
    return parseCurrentLocation(isAuth).slug;
  });

  /** Which language archive is open, when the route is 'public-blog-language'. */
  const [activeBlogLanguage, setActiveBlogLanguage] = useState<BlogLanguage | null>(() => {
    const isAuth = localStorage.getItem('fdownloader_admin_auth') === 'true';
    return parseCurrentLocation(isAuth).language;
  });

  // Data states with localStorage persistence
  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    const saved = localStorage.getItem('fdownloader_subscribers');
    return saved ? JSON.parse(saved) : INITIAL_SUBSCRIBERS;
  });

  const [downloadStats, setDownloadStats] = useState<DownloadStat[]>(() => {
    const saved = localStorage.getItem('fdownloader_download_stats');
    return saved ? JSON.parse(saved) : INITIAL_DOWNLOAD_STATS;
  });

  const [landingContent, setLandingContent] = useState<LandingContent>(() => {
    const saved = localStorage.getItem('fdownloader_landing_content');
    return saved ? JSON.parse(saved) : INITIAL_LANDING_CONTENT;
  });

  const [blogLoaded, setBlogLoaded] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => {
    const saved = localStorage.getItem('fdownloader_blog_posts');
    if (!saved) return INITIAL_BLOG_POSTS;
    try {
      const parsed: BlogPost[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map(p => p.id));
      const missingDefaults = INITIAL_BLOG_POSTS.filter(p => !existingIds.has(p.id));
      const combined = [...parsed, ...missingDefaults];
      return combined.map(post => {
        const initialMatch = INITIAL_BLOG_POSTS.find(init => init.id === post.id);
        if (initialMatch && !post.metaTitle && initialMatch.metaTitle) {
          return {
            ...post,
            metaTitle: initialMatch.metaTitle,
            metaDescription: initialMatch.metaDescription,
            metaKeywords: initialMatch.metaKeywords,
            canonicalUrl: initialMatch.canonicalUrl,
          };
        }
        return post;
      });
    } catch {
      return INITIAL_BLOG_POSTS;
    }
  });

  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>(() => {
    const saved = localStorage.getItem('fdownloader_blog_categories');
    return saved ? JSON.parse(saved) : INITIAL_BLOG_CATEGORIES;
  });

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem('fdownloader_site_settings');
    const initial: SiteSettings = saved ? JSON.parse(saved) : INITIAL_SITE_SETTINGS;
    // Publish straight away so the very first render already shows the real
    // name instead of flashing the built-in default.
    setBrandName(initial.siteName);
    return initial;
  });

  // Keeps every `{brand}` in the interface in step with Settings → Site Name.
  useEffect(() => { setBrandName(siteSettings.siteName); }, [siteSettings.siteName]);

  const [blogComments, setBlogComments] = useState<BlogComment[]>(() => {
    const saved = localStorage.getItem('fdownloader_blog_comments');
    return saved ? JSON.parse(saved) : INITIAL_BLOG_COMMENTS;
  });

  const [contactMessages, setContactMessages] = useState<ContactMessage[]>(() => {
    const saved = localStorage.getItem('fdownloader_contact_messages');
    return saved ? JSON.parse(saved) : INITIAL_CONTACT_MESSAGES;
  });

  // Toast notification state
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success',
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('fdownloader_subscribers', JSON.stringify(subscribers));
  }, [subscribers]);

  useEffect(() => {
    localStorage.setItem('fdownloader_download_stats', JSON.stringify(downloadStats));
  }, [downloadStats]);

  useEffect(() => {
    localStorage.setItem('fdownloader_landing_content', JSON.stringify(landingContent));
  }, [landingContent]);

  useEffect(() => {
    localStorage.setItem('fdownloader_blog_posts', JSON.stringify(blogPosts));
  }, [blogPosts]);

  useEffect(() => {
    localStorage.setItem('fdownloader_blog_categories', JSON.stringify(blogCategories));
  }, [blogCategories]);

  useEffect(() => {
    localStorage.setItem('fdownloader_site_settings', JSON.stringify(siteSettings));
  }, [siteSettings]);

  useEffect(() => {
    localStorage.setItem('fdownloader_blog_comments', JSON.stringify(blogComments));
  }, [blogComments]);

  useEffect(() => {
    localStorage.setItem('fdownloader_contact_messages', JSON.stringify(contactMessages));
  }, [contactMessages]);

  useEffect(() => {
    if (adminUser) {
      localStorage.setItem('fdownloader_admin_user', JSON.stringify(adminUser));
    }
  }, [adminUser]);

  // Real-time Toasts & Notification System
  const [activeToasts, setActiveToasts] = useState<AdminRealtimeToast[]>([]);
  const [notificationsHistory, setNotificationsHistory] = useState<AdminRealtimeToast[]>(() => {
    try {
      const saved = localStorage.getItem('fdownloader_notifications_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fdownloader_notification_sound');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  const unreadNotificationsCount = notificationsHistory.filter(n => !n.read).length;

  useEffect(() => {
    try {
      // History lives on the server now; nothing to persist locally.
    } catch {}
  }, [notificationsHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('fdownloader_notification_sound', String(notificationSoundEnabled));
    } catch {}
  }, [notificationSoundEnabled]);

  const toggleNotificationSound = () => {
    setNotificationSoundEnabled(prev => !prev);
  };

  const dismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  const dismissAllToasts = () => {
    setActiveToasts([]);
  };

  // Notifications come from the SERVER (real messages, comments and
  // subscribers). Read state is stored there too, so the badge is the
  // same after a refresh and in another browser.
  const loadNotificationsFromServer = React.useCallback(() => {
    fetch('/api/admin/notifications', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !Array.isArray(d.notifications)) return;
        setNotificationsHistory(d.notifications as any);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotificationsFromServer();
    const t = setInterval(loadNotificationsFromServer, 45000);
    return () => clearInterval(t);
  }, [isAuthenticated, loadNotificationsFromServer]);

  const sendReadToServer = (body: any) => {
    fetch('/api/admin/notifications/read', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.notifications) setNotificationsHistory(d.notifications as any); })
      .catch(() => {});
  };

  const markNotificationAsRead = (id: string) => {
    setNotificationsHistory(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    sendReadToServer({ ids: [id] });
  };

  const markAllNotificationsAsRead = () => {
    setNotificationsHistory(prev => prev.map(n => ({ ...n, read: true })));
    sendReadToServer({ all: true });
  };

  const clearNotificationsHistory = () => {
    // "Clear" means: stop showing these as new. The underlying messages
    // and comments are not deleted.
    setNotificationsHistory(prev => prev.map(n => ({ ...n, read: true })));
    sendReadToServer({ all: true });
  };

  // Cross-tab broadcast dispatcher and listener
  const broadcastRealtimeEvent = (event: { type: 'VIDEO_DOWNLOAD' | 'NEW_COMMENT'; payload: any }) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('fdownloader_realtime_events');
        bc.postMessage(event);
        bc.close();
      }
      localStorage.setItem('fdownloader_cross_tab_event', JSON.stringify({ ...event, _t: Date.now() }));
    } catch {}
  };

  const handleIncomingDownload = (fullStat: DownloadStat, shouldBroadcast: boolean) => {
    setDownloadStats(prev => {
      if (prev.some(d => d.id === fullStat.id)) return prev;
      return [fullStat, ...prev];
    });

    const toastId = `dl_toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast: AdminRealtimeToast = {
      id: toastId,
      type: 'download',
      title: 'Video Download Completed',
      message: `${fullStat.videoTitle} (${fullStat.quality})`,
      timestamp: 'Just now',
      createdAtMs: Date.now(),
      read: false,
      durationMs: 7500,
      downloadData: {
        videoTitle: fullStat.videoTitle,
        videoUrl: fullStat.videoUrl,
        quality: fullStat.quality,
        fileSize: fullStat.fileSize,
        duration: fullStat.duration,
        platform: fullStat.platform,
        ipCountry: fullStat.ipCountry,
      },
      actionLabel: 'View Download Logs',
      onAction: () => {
        setCurrentRouteState('downloads');
        window.location.hash = 'downloads';
      },
    };

    setActiveToasts(prev => [newToast, ...prev.slice(0, 3)]);
    setNotificationsHistory(prev => [newToast, ...prev.slice(0, 49)]);

    if (notificationSoundEnabled) {
      playVideoDownloadChime();
    }

    if (shouldBroadcast) {
      broadcastRealtimeEvent({ type: 'VIDEO_DOWNLOAD', payload: fullStat });
    }
  };

  const handleIncomingComment = (comment: BlogComment, shouldBroadcast: boolean) => {
    // Moderation toasts are for the admin only. A visitor who posts a
    // comment must never be offered an "Approve Now" button on their own
    // comment — that used to happen because this ran in every browser.
    if (!isAuthenticated) return;

    const toastId = `comm_toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast: AdminRealtimeToast = {
      id: toastId,
      type: 'comment',
      title: 'New Comment Submitted',
      message: `${comment.authorName} commented on "${comment.postTitle || 'Blog Article'}"`,
      timestamp: 'Just now',
      createdAtMs: Date.now(),
      read: false,
      durationMs: 8500,
      commentData: {
        commentId: comment.id,
        postId: comment.postId,
        postTitle: comment.postTitle || '',
        postSlug: comment.postSlug,
        authorName: comment.authorName,
        authorEmail: comment.authorEmail,
        content: comment.content,
      },
      actionLabel: 'Moderate in Blog',
      onAction: () => {
        setCurrentRouteState('blog-manager');
        window.location.hash = 'blog-manager';
      },
      secondaryActionLabel: 'Approve Now',
      onSecondaryAction: () => {
        approveBlogComment(comment.id);
      },
    };

    setActiveToasts(prev => [newToast, ...prev.slice(0, 3)]);
    setNotificationsHistory(prev => [newToast, ...prev.slice(0, 49)]);

    if (notificationSoundEnabled) {
      playNewCommentChime();
    }

    if (shouldBroadcast) {
      broadcastRealtimeEvent({ type: 'NEW_COMMENT', payload: comment });
    }
  };

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('fdownloader_realtime_events');
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'VIDEO_DOWNLOAD') {
          handleIncomingDownload(ev.data.payload, false);
        } else if (ev.data?.type === 'NEW_COMMENT') {
          handleIncomingComment(ev.data.payload, false);
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fdownloader_cross_tab_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.type === 'VIDEO_DOWNLOAD') {
            handleIncomingDownload(parsed.payload, false);
          } else if (parsed.type === 'NEW_COMMENT') {
            handleIncomingComment(parsed.payload, false);
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [notificationSoundEnabled]);

  const notifyVideoDownloadCompleted = (stat: DownloadStat | (Omit<DownloadStat, 'id' | 'downloadedAt'> & { id?: string; downloadedAt?: string })) => {
    const fullStat: DownloadStat = {
      id: stat.id || `dl_${Date.now()}`,
      videoTitle: stat.videoTitle,
      videoUrl: stat.videoUrl || 'https://www.facebook.com/watch/?v=1092837465928174',
      quality: stat.quality,
      downloadedAt: stat.downloadedAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
      fileSize: stat.fileSize,
      duration: stat.duration || '03:15',
      platform: stat.platform || 'Facebook',
      ipCountry: stat.ipCountry || 'United States',
    };

    handleIncomingDownload(fullStat, true);
  };

  const recordDownloadCompleted = (stat: Omit<DownloadStat, 'id' | 'downloadedAt'> & { id?: string; downloadedAt?: string }) => {
    notifyVideoDownloadCompleted(stat);
    // Record it on the SERVER too, so the dashboard counts everyone's
    // downloads and not just this one browser's.
    fetch('/api/stats/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoTitle: stat.videoTitle,
        videoUrl: stat.videoUrl,
        platform: stat.platform,
        quality: stat.quality,
        fileSize: stat.fileSize,
        duration: stat.duration,
      }),
    }).catch(() => {});
  };

  const notifyNewCommentSubmitted = (comment: BlogComment) => {
    handleIncomingComment(comment, true);
  };

  const simulateLiveDownload = (custom?: Partial<DownloadStat>) => {
    const MOCK_VIDEOS = [
      {
        videoTitle: 'Grand Canyon Scenic 4K Drone Footage • Nature Documentary',
        platform: 'Facebook' as const,
        quality: '1080p' as const,
        fileSize: '54.6 MB',
        duration: '04:12',
        ipCountry: 'United States',
      },
      {
        videoTitle: 'Viral Dance Challenge Compilation 2026 • Trending Reels',
        platform: 'Instagram' as const,
        quality: '720p' as const,
        fileSize: '21.3 MB',
        duration: '01:05',
        ipCountry: 'Brazil',
      },
      {
        videoTitle: 'AI Tech Summit Keynote Address: Future of Web Infrastructure',
        platform: 'Facebook' as const,
        quality: 'MP3' as const,
        fileSize: '7.8 MB',
        duration: '18:40',
        ipCountry: 'Germany',
      },
      {
        videoTitle: 'Tokyo Street Food Tour: Authentic Ramen & Yakitori Night',
        platform: 'TikTok' as const,
        quality: '1080p' as const,
        fileSize: '68.4 MB',
        duration: '06:30',
        ipCountry: 'Japan',
      },
      {
        videoTitle: '10-Minute Morning HIIT Workout Routine for Beginners',
        platform: 'Facebook' as const,
        quality: '720p' as const,
        fileSize: '34.1 MB',
        duration: '10:00',
        ipCountry: 'United Kingdom',
      },
    ];

    const pick = MOCK_VIDEOS[Math.floor(Math.random() * MOCK_VIDEOS.length)];
    const simulatedStat: DownloadStat = {
      id: `dl_${Date.now()}`,
      videoTitle: custom?.videoTitle || pick.videoTitle,
      videoUrl: custom?.videoUrl || `https://www.facebook.com/reel/${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      quality: custom?.quality || pick.quality,
      downloadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      fileSize: custom?.fileSize || pick.fileSize,
      duration: custom?.duration || pick.duration,
      platform: custom?.platform || pick.platform,
      ipCountry: custom?.ipCountry || pick.ipCountry,
    };

    handleIncomingDownload(simulatedStat, true);
  };

  const simulateLiveComment = (custom?: Partial<BlogComment>) => {
    const MOCK_COMMENTERS = [
      { name: 'Jordan Hayes', email: 'jordan.h@example.com', text: 'This solved my exact issue with downloading Facebook reels! The 1080p quality is crystal clear. Thanks a bunch!' },
      { name: 'Elena Rostova', email: 'elena.rostova@designhub.co', text: 'Does this also extract the original audio bitrates for MP3? Super clean UI by the way!' },
      { name: 'Marcus Chen', email: 'marcus.chen@techreview.io', text: 'Just tested the batch extraction and it was blazingly fast. Keep up the awesome work!' },
      { name: 'Sophia Miller', email: 'sophia.m@creativespace.com', text: 'Loved the guide on iOS Shortcuts integration. Bookmarked for my whole media team!' },
    ];

    const pick = MOCK_COMMENTERS[Math.floor(Math.random() * MOCK_COMMENTERS.length)];
    const targetPost = blogPosts[Math.floor(Math.random() * blogPosts.length)] || blogPosts[0];

    const simulatedComment: BlogComment = {
      id: `comm_${Date.now()}`,
      postId: custom?.postId || (targetPost ? targetPost.id : 'post_1'),
      postTitle: custom?.postTitle || (targetPost ? targetPost.title : 'Guide to Facebook Video Downloads'),
      postSlug: custom?.postSlug || (targetPost ? targetPost.slug : 'facebook-reel-downloader-guide'),
      authorName: custom?.authorName || pick.name,
      authorEmail: custom?.authorEmail || pick.email,
      website: custom?.website || 'https://example.com',
      content: custom?.content || pick.text,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'pending',
    };

    setBlogComments(prev => [simulatedComment, ...prev]);
    handleIncomingComment(simulatedComment, true);
  };

  // Toast Helpers
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    const toastId = `sys_toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast: AdminRealtimeToast = {
      id: toastId,
      type,
      title: type === 'success' ? 'Success' : type === 'error' ? 'Notice' : 'Information',
      message,
      timestamp: 'Just now',
      createdAtMs: Date.now(),
      durationMs: 4000,
    };
    setActiveToasts(prev => [newToast, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3600);
  };

  const hideToast = () => setToast(prev => ({ ...prev, show: false }));

  // Navigation with Auth Guard and URL Path History
  const setCurrentRoute = (route: RouteType) => {
    // An editor with unsaved changes asks first (see utils/unsavedGuard).
    if (route !== currentRoute && !confirmLeave()) return;
    const adminRoutes: RouteType[] = ['dashboard', 'subscribers', 'downloads', 'visitors', 'admin-users', 'content-editor', 'blog-manager', 'settings', 'messages', 'redirects', 'media'];
    if (!isAuthenticated && adminRoutes.includes(route)) {
      setCurrentRouteState('login');
      if (typeof window !== 'undefined') {
        try {
          window.history.pushState(null, '', '/admin');
        } catch {
          window.location.hash = 'login';
        }
      }
      return;
    }

    setCurrentRouteState(route);
    if (route === 'home') {
      resetHomeTool();
    }
    if (typeof window !== 'undefined') {
      try {
        if (route === 'home') {
          window.history.pushState(null, '', '/');
        } else if (route === 'login') {
          window.history.pushState(null, '', '/admin');
        } else if (route === 'dashboard') {
          window.history.pushState(null, '', '/admin');
        } else if (adminRoutes.includes(route)) {
          window.history.pushState(null, '', `/admin#${route}`);
        } else if (route === 'public-blog') {
          window.history.pushState(null, '', '/blog');
        } else if (route === 'public-blog-language' && activeBlogLanguage) {
          window.history.pushState(null, '', `/blog/${activeBlogLanguage}`);
        } else if (route === 'public-blog-post' && activePostSlug) {
          window.history.pushState(null, '', `/blog/${activePostSlug}`);
        } else if (route === 'contact') {
          window.history.pushState(null, '', '/contact');
        } else if (route === 'privacy-policy') {
          window.history.pushState(null, '', '/privacy-policy');
        } else if (route === 'terms-of-use') {
          window.history.pushState(null, '', '/terms-of-use');
        } else if (route === 'legal') {
          window.history.pushState(null, '', '/legal');
        } else if (route === 'about-us') {
          window.history.pushState(null, '', '/about-us');
        }
      } catch {
        window.location.hash = route;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [homeResetKey, setHomeResetKey] = useState<number>(0);

  const resetHomeTool = () => {
    setHomeResetKey((prev) => prev + 1);
  };

  const navigateToDownloader = (platform?: SocialPlatform) => {
    if (platform) {
      setActiveSocialPlatform(platform);
    }
    setCurrentRouteState('home');
    resetHomeTool();
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', '/');
      } catch {
        window.location.hash = 'home';
      }
    }
    // Smooth scroll directly to the social downloader tools without leaving the page
    setTimeout(() => {
      const el = document.getElementById('section-social-tools') || document.getElementById('section-downloader');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Synchronize browser history, back/forward buttons, and URL changes
  useEffect(() => {
    const handleNavigation = () => {
      const { route, slug, language } = parseCurrentLocation(isAuthenticated);
      setCurrentRouteState(route);
      if (slug) {
        setActivePostSlug(slug);
      }
      // Back/forward between language archives has to move the archive too.
      setActiveBlogLanguage(language);
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, [isAuthenticated]);

  const navigateToBlogPost = (slug: string) => {
    setActivePostSlug(slug);
    setCurrentRouteState('public-blog-post');
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', `/blog/${slug}`);
      } catch {
        window.location.hash = `blog/${slug}`;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToBlogLanguage = (lang: BlogLanguage) => {
    setActivePostSlug(null);
    setActiveBlogLanguage(lang);
    setCurrentRouteState('public-blog-language');
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', `/blog/${lang}`);
      } catch {
        window.location.hash = `blog/${lang}`;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToBlogListing = () => {
    setActivePostSlug(null);
    setActiveBlogLanguage(null);
    setCurrentRouteState('public-blog');
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', '/blog');
      } catch {
        window.location.hash = 'public-blog';
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth methods
  const login = async (email: string, pass: string, remember: boolean = true) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !pass) {
      return { success: false, error: 'Email and password are required.' };
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: pass }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.message || 'Invalid email or password.' };
      }

      const updatedUser: AdminUser = {
        ...(adminUser || INITIAL_ADMIN_USER),
        email: trimmedEmail,
        lastLogin: 'Just now',
      };

      sessionCheckSupersededRef.current = true;
      setAdminUser(updatedUser);
      localStorage.setItem('fdownloader_admin_user', JSON.stringify(updatedUser));
      setIsAuthenticated(true);
      if (remember) {
        localStorage.setItem('fdownloader_admin_auth', 'true');
      }
      // Set the route directly rather than via setCurrentRoute(): that
      // wrapper guards admin routes using the *closure's* isAuthenticated
      // value, which — because setIsAuthenticated() above hasn't been
      // applied by React yet (state updates are async) — would still read
      // as false here and incorrectly bounce this freshly-authenticated
      // admin straight back to the login screen.
      setCurrentRouteState('dashboard');
      if (typeof window !== 'undefined') {
        try {
          window.history.pushState(null, '', '/admin');
        } catch {
          window.location.hash = 'dashboard';
        }
      }
      showToast(`Welcome back, ${updatedUser.name}!`, 'success');
      return { success: true };
    } catch {
      return { success: false, error: 'Could not reach the server. Please try again.' };
    }
  };

  const logout = () => {
    sessionCheckSupersededRef.current = true;
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    setIsAuthenticated(false);
    localStorage.removeItem('fdownloader_admin_auth');
    setCurrentRouteState('home');
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', '/');
      } catch {
        window.location.hash = 'home';
      }
    }
    showToast('Signed out. Redirected to live website.', 'info');
  };

  // Subscribers CRUD
  // Apply the branding the admin set: the browser-tab icon follows the
  // Favicon setting instead of staying on the bundled default forever.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const href = siteSettings?.faviconUrl;
    if (!href) return;
    for (const rel of ['icon', 'alternate icon', 'apple-touch-icon']) {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.removeAttribute('type');
      el.setAttribute('href', href);
    }
  }, [siteSettings?.faviconUrl]);

  // About Us / Contact page content, edited in Content Editor.
  const [sitePages, setSitePages] = useState<any>(INITIAL_SITE_PAGES);
  const [pageTranslations, setPageTranslations] = useState<Record<string, Record<string, string>>>({});

  const updateSitePages = (pages: any) => {
    setSitePages(pages);
    fetch('/api/admin/site-pages', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sitePages: pages }),
    }).catch(() => {});
    showToast('Page content updated!', 'success');
  };

  // Site settings and landing content come from the SERVER, so every
  // visitor sees the same site the admin configured.
  useEffect(() => {
    fetch('/api/site-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.siteSettings) setSiteSettings(d.siteSettings);
        if (d.landingContent) setLandingContent(d.landingContent);
        // Merged over the defaults: data saved before the Privacy / Terms /
        // Legal pages were editable has no entry for them.
        if (d.sitePages) setSitePages({ ...INITIAL_SITE_PAGES, ...d.sitePages });
        if (d.pageTranslations) setPageTranslations(d.pageTranslations);
      })
      .catch(() => {});
  }, []);

  const refreshPageTranslations = () => {
    fetch('/api/site-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.pageTranslations) setPageTranslations(d.pageTranslations); })
      .catch(() => {});
  };

  // Push admin edits back to the server (skipping the initial load).
  const settingsSynced = React.useRef(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!settingsSynced.current) { settingsSynced.current = true; return; }
    fetch('/api/admin/site-settings', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteSettings }),
    }).catch(() => {});
  }, [siteSettings, isAuthenticated]);

  const contentSynced = React.useRef(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!contentSynced.current) { contentSynced.current = true; return; }
    fetch('/api/admin/landing-content', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ landingContent }),
    }).catch(() => {});
  }, [landingContent, isAuthenticated]);

  // Subscribers live on the SERVER — one shared list, so a visitor who
  // subscribes actually appears in the admin's list.
  const loadSubscribersFromServer = React.useCallback(() => {
    fetch('/api/admin/subscribers', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.subscribers)) setSubscribers(d.subscribers); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadSubscribersFromServer();
  }, [isAuthenticated, loadSubscribersFromServer]);

  const addSubscriber = (email: string, source: string = 'Admin Panel Manual Entry') => {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { success: false, error: 'Please provide a valid email address.' };
    }

    if (subscribers.some(s => s.email.toLowerCase() === trimmed)) {
      return { success: false, error: 'This email is already subscribed.' };
    }

    // Show it straight away, then confirm with the server.
    const newSub: Subscriber = {
      id: `sub_${Date.now()}`,
      email: trimmed,
      subscribedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'active',
      source,
    };
    setSubscribers(prev => [newSub, ...prev]);

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed, source }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.subscriber) {
          setSubscribers(prev => prev.map(s => (s.id === newSub.id ? d.subscriber : s)));
        } else if (d && d.success === false) {
          // Already on the list, or rejected — undo the optimistic row.
          setSubscribers(prev => prev.filter(s => s.id !== newSub.id));
          showToast(d.error || 'Could not add this subscriber.', 'error');
        }
      })
      .catch(() => {});

    showToast(`Subscriber "${trimmed}" added successfully!`, 'success');
    return { success: true };
  };

  const deleteSubscriber = (id: string) => {
    setSubscribers(prev => prev.filter(s => s.id !== id));
    fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    showToast('Subscriber removed from list.', 'info');
  };

  const exportSubscribersCsv = () => {
    const headers = 'ID,Email,Subscribed Date,Status,Source\n';
    const rows = subscribers
      .map(s => `"${s.id}","${s.email}","${s.subscribedAt}","${s.status}","${s.source}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fdownloader-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Subscribers CSV exported successfully!', 'success');
  };

  // Downloads
  const deleteDownloadStat = (id: string) => {
    setDownloadStats(prev => prev.filter(d => d.id !== id));
    fetch(`/api/admin/stats/${id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    showToast('Download record deleted.', 'info');
  };

  // Content Editor Updates
  const updateHeroContent = (hero: LandingContent['hero']) => {
    setLandingContent(prev => ({ ...prev, hero }));
    showToast('Hero section content saved successfully!', 'success');
  };

  const updateFeaturesContent = (features: LandingContent['features']) => {
    setLandingContent(prev => ({ ...prev, features }));
    showToast('Features section updated successfully!', 'success');
  };

  const updateFaqsContent = (faqs: LandingContent['faqs']) => {
    setLandingContent(prev => ({ ...prev, faqs }));
    showToast('FAQ questions & answers saved!', 'success');
  };

  const resetLandingContent = () => {
    setLandingContent(INITIAL_LANDING_CONTENT);
    showToast('Landing content reset to factory defaults.', 'info');
  };

  // Blog CRUD
  // Real download numbers come from the server. "downloadTotals" stays
  // small however much traffic the site gets — it is a running count,
  // not one row per download.
  const [downloadTotals, setDownloadTotals] = useState<{ total: number; byQuality: Record<string, number>; byPlatform: Record<string, number>; byDate: Record<string, number>; byDateQuality?: Record<string, Record<string, number>> }>(
    { total: 0, byQuality: {}, byPlatform: {}, byDate: {} }
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = () => {
      fetch('/api/admin/stats', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          if (Array.isArray(d.recent)) setDownloadStats(d.recent);
          if (d.totals) setDownloadTotals(d.totals);
        })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [isAuthenticated]);

  // Blog lives on the SERVER so visitors and search engines see the same
  // posts the admin writes. Everyone loads the published list; the admin
  // additionally loads drafts.
  const loadBlogFromServer = React.useCallback(async (asAdmin: boolean) => {
    try {
      const res = await fetch(asAdmin ? '/api/admin/blog' : '/api/blog', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.posts)) setBlogPosts(data.posts);
      if (Array.isArray(data.categories)) setBlogCategories(data.categories);
    } catch {
      // Offline — keep showing whatever is already loaded.
    } finally {
      setBlogLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadBlogFromServer(isAuthenticated);
  }, [isAuthenticated, loadBlogFromServer]);

  // Categories are saved as one list whenever they change.
  const categoriesSynced = React.useRef(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!categoriesSynced.current) { categoriesSynced.current = true; return; }
    fetch('/api/admin/blog-categories', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: blogCategories }),
    }).catch(() => {});
  }, [blogCategories, isAuthenticated]);

  /** Renaming or deleting a category also changes the category stored on
   * each affected post. Those posts must be saved on the server as well,
   * otherwise the change disappears on the next page load. */
  const syncPostsCategoryOnServer = (fromName: string, toName: string) => {
    blogPosts
      .filter((p) => p.category === fromName)
      .forEach((p) => {
        fetch(`/api/admin/blog/${p.id}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: { category: toName } }),
        }).catch(() => {});
      });
  };

  const saveBlogToServer = (method: string, url: string, body?: any) => {
    fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => {});
  };

  const addBlogPost = (newPostData: Omit<BlogPost, 'id' | 'views' | 'publishedAt' | 'updatedAt'>) => {
    const now = new Date().toISOString().slice(0, 10);
    const post: BlogPost = {
      ...newPostData,
      id: `post_${Date.now()}`,
      publishedAt: now,
      updatedAt: now,
      views: 1,
    };
    setBlogPosts(prev => [post, ...prev]);
    saveBlogToServer('POST', '/api/admin/blog', { post });
    showToast(`Article "${post.title.slice(0, 30)}..." ${post.status === 'published' ? 'published' : 'saved as draft'}!`, 'success');
    return post;
  };

  const updateBlogPost = (id: string, updates: Partial<BlogPost>) => {
    // "Last updated" moves only when what readers see changes — a meta or
    // slug tweak is not new content, and Google distrusts dates that jump.
    const old = blogPosts.find((p) => p.id === id);
    const contentChanged =
      !old || (['title', 'content', 'excerpt', 'coverImage'] as const).some(
        (k) => updates[k] !== undefined && updates[k] !== old[k]
      );
    const stamped = contentChanged ? { ...updates, updatedAt: new Date().toISOString().slice(0, 10) } : updates;
    setBlogPosts(prev => prev.map(p => (p.id === id ? { ...p, ...stamped } : p)));
    saveBlogToServer('PATCH', `/api/admin/blog/${id}`, { updates: stamped });
    showToast('Article updated successfully!', 'success');
  };

  const deleteBlogPost = (id: string) => {
    setBlogPosts(prev => prev.filter(p => p.id !== id));
    setBlogComments(prev => prev.filter(c => c.postId !== id));
    saveBlogToServer('DELETE', `/api/admin/blog/${id}`);
    showToast('Article deleted.', 'info');
  };

  const togglePostStatus = (id: string) => {
    setBlogPosts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const nextStatus = p.status === 'published' ? 'draft' : 'published';
          // Publishing or unpublishing does not change the article itself.
          saveBlogToServer('PATCH', `/api/admin/blog/${id}`, { updates: { status: nextStatus } });
          showToast(`Post is now ${nextStatus.toUpperCase()}`, 'info');
          return { ...p, status: nextStatus };
        }
        return p;
      })
    );
  };

  const getPostBySlug = (slug: string) => {
    return blogPosts.find(p => p.slug === slug);
  };

  // Blog Categories CRUD
  const addBlogCategory = (catData: Omit<BlogCategory, 'id' | 'createdAt'>) => {
    const name = catData.name.trim();
    if (!name) {
      return { success: false, error: 'Category name is required.' };
    }

    const slug = (catData.slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));

    if (blogCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      return { success: false, error: `A category named "${name}" already exists.` };
    }
    if (blogCategories.some(c => c.slug.toLowerCase() === slug.toLowerCase())) {
      return { success: false, error: `A category with slug "${slug}" already exists.` };
    }

    const newCat: BlogCategory = {
      ...catData,
      id: `cat_${Date.now()}`,
      name,
      slug,
      color: catData.color || 'purple',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setBlogCategories(prev => [...prev, newCat]);
    showToast(`Category "${newCat.name}" added successfully!`, 'success');
    return { success: true, category: newCat };
  };

  const updateBlogCategory = (id: string, updates: Partial<BlogCategory>) => {
    const target = blogCategories.find(c => c.id === id);
    if (!target) {
      return { success: false, error: 'Category not found.' };
    }

    const newName = updates.name !== undefined ? updates.name.trim() : target.name;
    if (!newName) {
      return { success: false, error: 'Category name cannot be empty.' };
    }

    if (updates.name && blogCategories.some(c => c.id !== id && c.name.toLowerCase() === newName.toLowerCase())) {
      return { success: false, error: `Another category named "${newName}" already exists.` };
    }

    const oldName = target.name;

    setBlogCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates, name: newName } : c))
    );

    // If the category name changed, cascade update to existing blog posts
    if (oldName !== newName) {
      syncPostsCategoryOnServer(oldName, newName);
      setBlogPosts(prev =>
        prev.map(post => post.category === oldName ? { ...post, category: newName } : post)
      );
    }

    showToast(`Category "${newName}" updated!`, 'success');
    return { success: true };
  };

  const deleteBlogCategory = (id: string, reassignCategoryId?: string) => {
    if (blogCategories.length <= 1) {
      showToast('Cannot delete the last category.', 'error');
      return { success: false, message: 'You must maintain at least one category.' };
    }

    const categoryToDelete = blogCategories.find(c => c.id === id);
    if (!categoryToDelete) {
      return { success: false, message: 'Category not found.' };
    }

    const remaining = blogCategories.filter(c => c.id !== id);
    const targetReassignCat = remaining.find(c => c.id === reassignCategoryId) || remaining[0];

    // Reassign all posts that were in this category to targetReassignCat
    const affectedPosts = blogPosts.filter(p => p.category === categoryToDelete.name);
    if (affectedPosts.length > 0) {
      syncPostsCategoryOnServer(categoryToDelete.name, targetReassignCat.name);
      setBlogPosts(prev =>
        prev.map(post => post.category === categoryToDelete.name ? { ...post, category: targetReassignCat.name } : post)
      );
    }

    setBlogCategories(remaining);
    showToast(
      affectedPosts.length > 0
        ? `Category "${categoryToDelete.name}" deleted. ${affectedPosts.length} post(s) moved to "${targetReassignCat.name}".`
        : `Category "${categoryToDelete.name}" deleted.`,
      'info'
    );
    return { success: true };
  };

  // Settings
  const updateSiteSettings = (settingsUpdates: Partial<SiteSettings>) => {
    setSiteSettings(prev => ({ ...prev, ...settingsUpdates }));
    showToast('Site settings updated!', 'success');
  };

  const updateAdminProfile = (name: string, email: string, avatar: string) => {
    if (adminUser) {
      setAdminUser({ ...adminUser, name, email, avatar });
      // Persist on the server so the profile and avatar are not tied to
      // this one browser.
      fetch('/api/admin/profile', {
        method: 'PUT', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { name, email, avatar } }),
      }).catch(() => {});
      showToast('Admin profile details updated!', 'success');
    }
  };

  const changePassword = (oldPass: string, newPass: string) => {
    if (!oldPass || !newPass) {
      return { success: false, message: 'All password fields are required.' };
    }
    if (newPass.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }
    // Honest limitation: there is no database yet to persist a changed
    // password to, so this is not allowed to silently "succeed" without
    // actually saving anywhere. Update the ADMIN_PASSWORD environment
    // variable in Hostinger for now — this will be replaced with a real,
    // permanent change-password flow once the database is connected.
    return {
      success: false,
      message: 'Password changes aren’t available yet — they need the database connection to save permanently. For now, update the ADMIN_PASSWORD environment variable in Hostinger instead.',
    };
  };

  // Blog Comments Methods
  const addBlogComment = (commentData: { postId: string; authorName: string; authorEmail: string; website?: string; content: string }) => {
    const { postId, authorName, authorEmail, website, content } = commentData;
    const trimmedName = authorName.trim();
    const trimmedEmail = authorEmail.trim();
    const trimmedContent = content.trim();

    if (!trimmedName) {
      return { success: false, error: 'Please enter your name.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!trimmedContent) {
      return { success: false, error: 'Please enter your comment message.' };
    }

    const post = blogPosts.find(p => p.id === postId);
    const newComment: BlogComment = {
      id: `comm_${Date.now()}`,
      postId,
      postTitle: post ? post.title : 'Article',
      postSlug: post ? post.slug : '',
      authorName: trimmedName,
      authorEmail: trimmedEmail,
      website: website?.trim() || undefined,
      content: trimmedContent,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'pending', // Pending moderation until approved by admin
    };

    // Send to the SERVER so the admin actually receives it for moderation.
    fetch(`/api/blog/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName: trimmedName, authorEmail: trimmedEmail, website, content: trimmedContent }),
    })
      .then((r) => r.json())
      .then((d) => { if (d && d.success === false) showToast(d.error || 'Could not submit your comment.', 'error'); })
      .catch(() => showToast('Could not reach the server. Please try again.', 'error'));

    if (isAuthenticated) setBlogComments(prev => [newComment, ...prev]);
    handleIncomingComment(newComment, true);
    return { success: true, comment: newComment };
  };

  // Load the saved profile (name + avatar) once the admin is in.
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/admin/profile', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.profile?.name) setAdminUser((prev) => (prev ? { ...prev, ...d.profile } : prev));
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Comments live on the SERVER. The admin loads all of them (any
  // status); visitors only ever fetch approved ones, per post.
  const loadCommentsFromServer = React.useCallback(() => {
    fetch('/api/admin/comments', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.comments)) setBlogComments(d.comments); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadCommentsFromServer();
    const t = setInterval(loadCommentsFromServer, 60000);
    return () => clearInterval(t);
  }, [isAuthenticated, loadCommentsFromServer]);

  const setCommentStatusOnServer = (id: string, status: string) => {
    fetch(`/api/admin/comments/${id}`, {
      method: 'PATCH', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  };

  const approveBlogComment = (id: string) => {
    setBlogComments(prev =>
      prev.map(c => (c.id === id ? { ...c, status: 'approved' } : c))
    );
    setCommentStatusOnServer(id, 'approved');
    showToast('Comment approved! It is now visible on the blog post.', 'success');
  };

  const rejectBlogComment = (id: string) => {
    setBlogComments(prev => prev.map(c => (c.id === id ? { ...c, status: 'rejected' as const } : c)));
    setCommentStatusOnServer(id, 'rejected');
    showToast('Comment rejected. It will not appear on the blog.', 'info');
  };

  const deleteBlogComment = (id: string) => {
    setBlogComments(prev => prev.filter(c => c.id !== id));
    fetch(`/api/admin/comments/${id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    showToast('Comment removed.', 'info');
  };

  const toggleCommentStatus = (id: string) => {
    setBlogComments(prev =>
      prev.map(c => {
        if (c.id === id) {
          const nextStatus = c.status === 'approved' ? 'pending' : 'approved';
          setCommentStatusOnServer(id, nextStatus);
          showToast(`Comment status changed to ${nextStatus}.`, 'info');
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const getCommentsForPost = (postId: string, approvedOnly: boolean = true) => {
    return blogComments.filter(c => c.postId === postId && (!approvedOnly || c.status === 'approved'));
  };

  const pendingCommentsCount = blogComments.filter(c => c.status === 'pending').length;

  // Contact Messages & Direct Support Methods
  const addContactMessage = (msgData: { name: string; email: string; topic: ContactMessageTopic; topicLabel?: string; message: string }) => {
    const { name, email, topic, topicLabel, message } = msgData;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMsg = message.trim();

    const topicMap: Record<ContactMessageTopic, string> = {
      'download-issue': 'Video Download Issue (URL not parsing)',
      'feature-request': 'New Platform or Feature Request',
      'business': 'Business & Partnership Inquiries',
      'feedback': 'General Feedback or Compliment',
      'legal': 'Copyright / DMCA Takedown',
      'other': 'General Support',
    };

    const assignedTopicLabel = topicLabel || topicMap[topic] || 'Support Request';

    const newMessage: ContactMessage = {
      id: `msg_${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      topic,
      topicLabel: assignedTopicLabel,
      message: trimmedMsg,
      status: 'unread',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      ipCountry: 'United States',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser'
    };

    setContactMessages(prev => [newMessage, ...prev]);

    // Play chime sound if enabled
    if (notificationSoundEnabled) {
      playNewCommentChime();
    }

    // Trigger Admin Realtime Toast & History
    const newToast: AdminRealtimeToast = {
      id: `toast_${Date.now()}`,
      type: 'info',
      title: '📬 New Direct Message Received',
      message: `${trimmedName} sent a message regarding "${assignedTopicLabel}".`,
      timestamp: 'Just now',
      createdAtMs: Date.now(),
      actionLabel: 'View in Dashboard',
      onAction: () => setCurrentRoute('messages'),
    };

    setActiveToasts(prev => [newToast, ...prev].slice(0, 4));
    setNotificationsHistory(prev => [newToast, ...prev].slice(0, 50));

    return { success: true, messageId: newMessage.id };
  };

  // Messages live on the SERVER (a visitor's message must reach the
  // admin, so it cannot be kept in the visitor's own browser).
  const refreshMessagesFromServer = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/messages', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages)) setContactMessages(data.messages);
    } catch {
      // Offline or server busy — keep showing what we already have.
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshMessagesFromServer();
    const t = setInterval(refreshMessagesFromServer, 60000);
    return () => clearInterval(t);
  }, [isAuthenticated, refreshMessagesFromServer]);

  const updateMessageOnServer = async (id: string, body: any) => {
    try {
      await fetch(`/api/admin/messages/${id}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {}
  };

  const markMessageAsRead = (id: string) => {
    setContactMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, status: 'read', readAt: new Date().toISOString().slice(0, 16).replace('T', ' ') } : m))
    );
    updateMessageOnServer(id, { status: 'read' });
    showToast('Message marked as read.', 'info');
  };

  const markMessageAsUnread = (id: string) => {
    setContactMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, status: 'unread', readAt: undefined } : m))
    );
    updateMessageOnServer(id, { status: 'unread' });
    showToast('Message marked as unread.', 'info');
  };

  const markMessageAsReplied = (id: string, notes?: string) => {
    setContactMessages(prev =>
      prev.map(m => (m.id === id ? {
        ...m,
        status: 'replied',
        replyNotes: notes !== undefined ? notes : m.replyNotes,
        repliedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
      } : m))
    );
    updateMessageOnServer(id, { status: 'replied', replyNotes: notes });
    showToast('Message status updated to Replied.', 'success');
  };

  const archiveContactMessage = (id: string) => {
    setContactMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, status: 'archived' } : m))
    );
    updateMessageOnServer(id, { status: 'archived' });
    showToast('Message archived.', 'info');
  };

  const deleteContactMessage = (id: string) => {
    setContactMessages(prev => prev.filter(m => m.id !== id));
    fetch(`/api/admin/messages/${id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
    showToast('Message deleted.', 'info');
  };

  const exportMessagesCsv = () => {
    if (contactMessages.length === 0) {
      showToast('No messages available to export.', 'info');
      return;
    }
    const headers = ['ID', 'Date', 'Name', 'Email', 'Category', 'Status', 'Message', 'Reply Notes', 'Replied At'];
    const rows = contactMessages.map(m => [
      m.id,
      `"${m.createdAt}"`,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.email.replace(/"/g, '""')}"`,
      `"${(m.topicLabel || m.topic).replace(/"/g, '""')}"`,
      `"${m.status}"`,
      `"${m.message.replace(/"/g, '""')}"`,
      `"${(m.replyNotes || '').replace(/"/g, '""')}"`,
      `"${m.repliedAt || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fdownloader_messages_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Messages exported successfully to CSV!', 'success');
  };

  const unreadMessagesCount = contactMessages.filter(m => m.status === 'unread').length;

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        adminUser,
        currentRoute,
        activePostSlug,
        activeBlogSlug: activePostSlug,
        activeBlogLanguage,
        navigateToBlogLanguage,
        activeSocialPlatform,
        setActiveSocialPlatform,
        navigateToDownloader,
        homeResetKey,
        resetHomeTool,
        login,
        logout,
        setCurrentRoute,
        navigateToBlogPost,
        navigateToBlogListing,

        subscribers,
        addSubscriber,
        deleteSubscriber,
        exportSubscribersCsv,

        downloadStats,
        deleteDownloadStat,
        downloadTotals,
        recordDownloadCompleted,
        simulateLiveDownload,

        landingContent,
        updateHeroContent,
        updateFeaturesContent,
        updateFaqsContent,
        resetLandingContent,

        blogPosts,
        blogLoaded,
        addBlogPost,
        updateBlogPost,
        deleteBlogPost,
        togglePostStatus,
        reloadBlog: () => loadBlogFromServer(true),
        getPostBySlug,

        blogCategories,
        addBlogCategory,
        updateBlogCategory,
        deleteBlogCategory,

        blogComments,
        addBlogComment,
        approveBlogComment,
        rejectBlogComment,
        deleteBlogComment,
        toggleCommentStatus,
        getCommentsForPost,
        pendingCommentsCount,

        contactMessages,
        addContactMessage,
        markMessageAsRead,
        markMessageAsUnread,
        markMessageAsReplied,
        archiveContactMessage,
        deleteContactMessage,
        exportMessagesCsv,
        unreadMessagesCount,

        siteSettings,
        sitePages,
        updateSitePages,
        pageTranslations,
        refreshPageTranslations,
        updateSiteSettings,
        updateAdminProfile,
        changePassword,

        toast,
        showToast,
        hideToast,
        activeToasts,
        notificationsHistory,
        unreadNotificationsCount,
        notificationSoundEnabled,
        toggleNotificationSound,
        dismissToast,
        dismissAllToasts,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotificationsHistory,
        notifyVideoDownloadCompleted,
        notifyNewCommentSubmitted,
        simulateLiveComment,

        theme,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
