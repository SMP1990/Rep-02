import type { BlogLanguage } from '../config/blogLanguages.ts';

export type RouteType = 
  | 'home'
  | 'contact'
  | 'login' 
  | 'dashboard' 
  | 'messages'
  | 'subscribers' 
  | 'downloads' 
  | 'visitors' 
  | 'admin-users' 
  | 'content-editor' 
  | 'blog-manager' 
  | 'settings' 
  | 'redirects'
  | 'tools-seo'
  | 'media'
  | 'public-blog' 
  | 'public-blog-language'
  | 'public-blog-post'
  | 'privacy-policy'
  | 'terms-of-use'
  | 'legal'
  | 'about-us'
  | 'background-remover'
  | 'password-generator'
  | 'not-found';

export type ContactMessageTopic = 
  | 'download-issue' 
  | 'feature-request' 
  | 'business' 
  | 'feedback' 
  | 'legal' 
  | 'other';

export type ContactMessageStatus = 'unread' | 'read' | 'replied' | 'archived';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  topic: ContactMessageTopic;
  topicLabel: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  readAt?: string;
  replyNotes?: string;
  repliedAt?: string;
  ipCountry?: string;
  userAgent?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  lastLogin: string;
}

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  status: 'pending_verification' | 'verified' | 'active' | 'unsubscribed';
  source: string;
}

export type VideoQuality = '1080p' | '720p' | '360p' | 'MP3';

export interface DownloadStat {
  id: string;
  videoTitle: string;
  videoUrl: string;
  quality: VideoQuality;
  downloadedAt: string;
  fileSize: string;
  duration: string;
  platform: 'Facebook' | 'Instagram' | 'TikTok' | 'Twitter' | 'X' | 'Pinterest';
  ipCountry?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: 'purple' | 'pink' | 'indigo' | 'emerald' | 'amber' | 'blue';
  createdAt?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  coverImage: string;
  /** ALT text for the cover image; the site falls back to the title. */
  coverImageAlt?: string;
  /** Language the post is written in. Posts saved before this field existed
   * are treated as English on read, so nothing breaks. */
  language?: BlogLanguage;
  status: 'published' | 'draft';
  publishedAt: string;
  updatedAt: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  authorBio?: string;
  views: number;
  readTime: string;
  // SEO Configuration
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  postTitle?: string;
  postSlug?: string;
  authorName: string;
  authorEmail: string;
  website?: string;
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface FeatureItem {
  id: string;
  iconName: 'Zap' | 'Shield' | 'Video' | 'Sparkles' | 'Smartphone' | 'Music' | 'Download' | 'Layers';
  title: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface PageHighlight {
  title: string;
  desc: string;
}

/** One block of a Privacy / Terms / Legal page written by the admin. */
export interface LegalSection {
  title: string;
  /** Paragraphs separated by a blank line; lines starting with "- " are bullets. */
  body: string;
}

/** An empty `sections` list means "show the built-in, translated text". */
export interface LegalPageContent {
  sections: LegalSection[];
}

/** Content of the standalone pages (About Us, Contact, Privacy, Terms,
 * Legal) so the admin can edit them from the dashboard instead of the text
 * living in the code. */
export interface SitePages {
  about: {
    heading: string;
    intro: string;
    highlights: PageHighlight[];
    ctaHeading: string;
    ctaText: string;
  };
  contact: {
    heading: string;
    intro: string;
    responseTime: string;
    officeNote: string;
  };
  privacy: LegalPageContent;
  terms: LegalPageContent;
  legal: LegalPageContent;
}

export interface LandingContent {
  hero: {
    heading: string;
    subtitle: string;
    ctaText: string;
    inputPlaceholder: string;
    trustBadge: string;
    noticeText: string;
  };
  features: FeatureItem[];
  faqs: FaqItem[];
}

export interface SiteSettings {
  siteName: string;
  /** Logo shown in the site header; blank falls back to the built-in mark. */
  logoUrl?: string;
  /** Browser tab icon; blank falls back to the bundled favicon. */
  faviconUrl?: string;
  siteTagline: string;
  contactEmail: string;
  metaDescription: string;
  maintenanceMode: boolean;
  allowPublicRegistrations: boolean;
  analyticsTrackingEnabled: boolean;
  // Centralized contact & social settings — used everywhere the site shows
  // a phone number, WhatsApp link, or social icon, so changing a value here
  // updates every page automatically. Leave any field blank to hide that
  // specific contact method / icon across the site.
  contactPhone: string;
  whatsappNumber: string;
  socialFacebook: string;
  socialInstagram: string;
  socialYoutube: string;
  socialTiktok: string;
  socialTwitter: string;
  socialLinkedin: string;
  // SEO: image shown when a page is shared on social media (Open Graph /
  // Twitter Card). Leave blank to omit an image from share previews.
  ogImage: string;
  // Search-engine ownership verification. Paste only the token from the
  // meta tag each service gives you — not the whole tag. Blank = not emitted.
  verifyGoogle?: string;
  /** GA4 Measurement ID, e.g. G-ABC123XYZ. Empty = analytics off. */
  googleAnalyticsId?: string;
  /** Date (YYYY-MM-DD) the Privacy/Terms/Legal text last changed. */
  legalUpdatedAt?: string;
  verifyBing?: string;
  verifyYandex?: string;
  verifyPinterest?: string;
  verifyFacebookDomain?: string;
}

export type ThemeMode = 'light' | 'dark';

export type RealtimeNotificationType = 'download' | 'comment' | 'success' | 'info' | 'error';

export interface AdminRealtimeToast {
  id: string;
  type: RealtimeNotificationType;
  title: string;
  message: string;
  timestamp: string;
  createdAtMs: number;
  read?: boolean;
  durationMs?: number;
  downloadData?: {
    videoTitle: string;
    videoUrl?: string;
    quality: VideoQuality;
    fileSize: string;
    duration?: string;
    platform: 'Facebook' | 'Instagram' | 'TikTok' | 'Twitter' | 'X' | 'Pinterest' | 'Reddit';
    ipCountry?: string;
  };
  commentData?: {
    commentId: string;
    postId: string;
    postTitle: string;
    postSlug?: string;
    authorName: string;
    authorEmail: string;
    content: string;
  };
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}
