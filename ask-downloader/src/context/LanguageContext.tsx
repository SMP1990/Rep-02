import React, { createContext, useContext, useState, useEffect, useSyncExternalStore, useMemo } from 'react';
import { applyBrand, getBrandName, subscribeBrand } from '../config/brand.ts';
import { hiTranslation } from '../translations/hi.ts';
import { jaTranslation } from '../translations/ja.ts';
import { urTranslation } from '../translations/ur.ts';
import { esTranslation } from '../translations/es.ts';
import { arTranslation } from '../translations/ar.ts';
import { ptTranslation } from '../translations/pt.ts';
import { idTranslation } from '../translations/id.ts';
import { frTranslation } from '../translations/fr.ts';
import { ruTranslation } from '../translations/ru.ts';
import { deTranslation } from '../translations/de.ts';
import { LEGAL_PAGE_TRANSLATIONS } from '../translations/legalPages.ts';
import { EXTRA_TRANSLATIONS } from '../translations/extra/index.ts';

export type Language =
  | 'en' | 'es' | 'ar' | 'pt' | 'id'
  | 'ja' | 'fr' | 'ru' | 'de' | 'ur' | 'hi';
export type LanguageCode = Language;

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
];

export const enTranslation = {
  header: {
    about: 'About Us',
    home: 'Home',
    videoDownloader: 'Video Downloader',
    blog: 'Blog',
    contact: 'Contact',
    selectDownloader: 'Select Downloader Tool',
    instantSwitch: 'Instant Switch',
    searchPlaceholder: 'Search tools or paste link...',
    allInOne: 'All-in-One Downloader',
    admin: 'Admin',
    adminDashboard: 'Admin Dashboard',
    rightsReserved: 'All rights reserved.',
    subtitle: 'Fast & Free Social Video Downloader',
    history: 'History',
    signInGoogle: 'Sign in with Google',
    signOut: 'Sign Out',
    languageSelect: 'Select Language',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    toggleTheme: 'Toggle theme (Dark / Light)',
  },
  hero: {
    badge: 'High-Speed Social Media Video Downloader',
    titlePrefix: 'Download videos of',
    titleHighlight: 'Videos in 1080p Full HD',
    subtitle: 'Paste any link below to save Reels, Stories, Tweets, Pins, and videos without watermarks. Free, safe, and works in any browser.',
    allPlatforms: 'All Platforms',
  },
  tools: {
    noticeText: 'No Watermark • Original Audio Quality',
    universal: 'All Platforms',
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    twitter: 'Twitter / X',
    pinterest: 'Pinterest',
    reddit: 'Reddit',
    threads: 'Threads',
    dailymotion: 'Dailymotion',
    universalSubtitle: 'Paste any social video link for auto-detection',
    facebookSubtitle: 'Reels, Watch, Video Posts & Stories',
    instagramSubtitle: 'Reels, Video Posts, IGTV & Audio',
    tiktokSubtitle: 'Videos, Shorts & Sounds (Without Watermark)',
    twitterSubtitle: 'Tweets, Video Clips, Spaces & Audio',
    pinterestSubtitle: 'Video Pins, Idea Pins, Shorts & Tutorials',
    redditSubtitle: 'Reddit Video Posts, Audio, v.redd.it Clips & GIFs',
    threadsSubtitle: 'Threads Video Posts, Carousels & Audio',
    dailymotionSubtitle: 'HD Streams, Videos, Shorts & MP3 Audio',
    universalPlaceholder: 'Paste any video link here (Facebook, TikTok, Instagram, Twitter...)',
    facebookPlaceholder: 'Paste Facebook video URL (facebook.com/reel/... or fb.watch/...)',
    instagramPlaceholder: 'Paste Instagram Reel or Post link (instagram.com/reel/...)',
    tiktokPlaceholder: 'Paste TikTok video link (tiktok.com/@user/video/... or vt.tiktok.com/...)',
    twitterPlaceholder: 'Paste Twitter or X post link (x.com/user/status/... or twitter.com/...)',
    pinterestPlaceholder: 'Paste Pinterest Pin link (pinterest.com/pin/... or pin.it/...)',
    redditPlaceholder: 'Paste Reddit post or video link (reddit.com/r/... or v.redd.it/...)',
    threadsPlaceholder: 'Paste Threads post URL (threads.net/@user/post/... or threads.net/t/...)',
    dailymotionPlaceholder: 'Paste Dailymotion video URL (dailymotion.com/video/... or dai.ly/...)',
    getButton: 'Get {platform} Video',
    extracting: 'Extracting Video Streams...',
    paste: 'Paste',
    quickTest: 'Quick Test Links:',
    hdVideo: 'HD Video',
    viralReel: 'Viral Reel',
    audioTrack: 'Audio MP3',
    switchTab: 'Switch Tab',
    detectedLink: 'Detected {target} link. Switch to {target} tab?',
    autoDetect: 'Auto-detect link from clipboard',
  },
  input: {
    title: 'Social Video Downloader',
    subtitleHighlight: '1080p Full HD, 720p HD & MP3 Audio',
    subtitlePrefix: 'Download social media videos online for free ',
    subtitleSuffix: '. Fast, high quality and without watermarks.',
    placeholder: 'Paste video link here (Facebook, TikTok, Instagram, Twitter...)',
    paste: 'Paste',
    pasteFromClipboard: 'Paste from Clipboard',
    autoValidate: 'Auto Validate',
    download: 'Download',
    processing: 'Processing...',
    clear: 'Clear',
    clearTooltip: 'Clear input and results (Esc)',
    samplesLabel: 'Samples:',
    sampleWatch: '1080p Watch Video',
    sampleReel: 'Viral Reel Video',
    samplePrivate: 'Error Handling Test',
    shortcutsTitle: 'Shortcuts:',
    shortcutSubmit: 'Submit URL',
    shortcutClear: 'Clear / Reset',
    shortcutFocus: 'Focus Input',
    domainNotice: 'Notice: Please ensure this is a valid social media video, reel, or story URL.',
    downloadEnter: '↵ Enter',
    clipboardEmpty: 'Your clipboard is empty. Please copy a video link first.',
    validDetected: 'Valid {type} detected and verified!',
    validHint: 'URL format confirmed. Click download to fetch available qualities.',
    readingClipboard: 'Reading clipboard and searching for video link...',
    clipboardBlocked: 'Clipboard permission blocked. Please paste directly into the input box (Ctrl+V / ⌘+V).',
    noFbLink: 'No video link found in clipboard.',
    autoDetectTitle: 'Auto-detect Copied Links',
    autoDetectPrompt: 'Allow {brand} to automatically fill copied links when you visit the page?',
    autoDetectEnable: 'Enable Auto-detect',
    autoDetectDismiss: 'Not Now',
    autoDetectOn: 'Auto-detect: ON',
    autoDetectOff: 'Auto-detect: OFF',
    autoDetectDetected: 'Video link auto-detected and entered from clipboard!',
    autoDetectTooltipOn: 'Clipboard auto-detect is ON. Click to disable.',
    autoDetectTooltipOff: 'Click to enable automatic detection of copied video links on page load.',
  },
  videoResult: {
    hdBadge: 'HD',
    previewButton: 'Video Player Preview',
    shareVideo: 'Share Video',
    linkCopied: 'Link Copied!',
    reset: 'Reset',
    resetTooltip: 'Reset and clear results (Esc)',
    downloadOptionsTitle: 'Download Options',
    availableQualities: 'Available Video & Audio Qualities',
    colFormat: 'Format',
    colQuality: 'Quality',
    colSize: 'Size',
    colAction: 'Action',
    btnDownload: 'Download',
    btnDownloading: 'Saving...',
    btnPreview: 'View',
    featureAudio: 'Original Audio Track Synchronized',
    featureWatermark: 'No Watermark or Logos',
    featureSafe: 'Direct CDN Link',
    authorLabel: 'Author:',
    durationLabel: 'Duration:',
    viewsLabel: 'Views:',
  },
  howTo: {
    badge: '3-Step Quick Tutorial',
    title: 'How to Download Videos with {brand}',
    subtitle: 'Our online video downloader lets you download any public video in 3 easy steps.',
    step1Badge: 'Step 1',
    step1Title: 'Copy Video Link',
    step1Desc: 'Open the platform, go to the video, reel, or story, click "Share" and select "Copy Link".',
    step2Badge: 'Step 2',
    step2Title: 'Paste Link in Search Box',
    step2Desc: 'Paste the copied URL into the search box above and press the "Download" button.',
    step3Badge: 'Step 3',
    step3Title: 'Choose Quality & Save',
    step3Desc: 'Select from available resolutions (1080p Full HD, 720p HD, 360p SD or MP3 Audio) to save directly.',
  },
  features: {
    badge: 'Industry-Grade Features',
    title: 'Why Choose {brand}?',
    subtitle: 'Crafted for simplicity, speed, and reliability across all modern devices and browsers.',
    f1Title: 'Full HD & 1080p Quality',
    f1Desc: 'Get original source quality 1080p Full HD and crystal clear audio without compression loss.',
    f2Title: 'High-Speed Processing',
    f2Desc: 'Video extraction completes in seconds, providing you with lightning fast download speeds.',
    f3Title: 'Mobile & Tablet Friendly',
    f3Desc: 'Fully optimized for Android, iPhone (iOS Safari), iPad, Mac, and Windows PCs.',
    f4Title: 'Audio (MP3) Extraction',
    f4Desc: 'Extract background music, speech, or audio tracks as high-quality 320kbps MP3 audio.',
    f5Title: '100% Free & No Watermarks',
    f5Desc: 'Enjoy unlimited downloads with zero fees, subscriptions, or intrusive watermarks.',
    f6Title: 'Secure & Direct CDN Links',
    f6Desc: 'Directly streams and downloads safely via official platform CDNs without intermediary tracking.',
  },
  homeBlog: {
    trendingNow: 'Trending now',
    badge: 'Latest Articles & Guides',
    title: 'Trending Stories & Media Tips',
    subtitle: 'Stay updated with social video archiving tips, creator tutorials, and trending industry news.',
    viewAll: 'View All',
    adminBlog: 'Admin Blog',
    play: 'Play',
    pause: 'Pause',
    readGuide: 'Read Guide',
    minRead: 'min read',
  },
  faq: {
    badge: 'Instant Answers',
    title: 'Frequently Asked Questions',
    subtitle: 'Everything you need to know about downloading social media videos with {brand}.',
    q1: 'Where are downloaded videos saved on my device?',
    a1: 'Videos are typically saved in your browser\'s default "Downloads" folder on Windows, Mac, Android, and iOS. On iPhone/iPad, you can tap the Downloads icon in Safari\'s URL bar and save directly to Photos.',
    q2: 'Can I download private videos or stories?',
    a2: 'No, private videos require account login and private credentials that our server does not access. Our tool works with all public videos, reels, shorts, and stories across supported platforms.',
    q3: 'Is {brand} completely free to use?',
    a3: 'Yes, {brand} is 100% free with unlimited downloads. There are no subscriptions, registration requirements, or hidden paywalls.',
    q4: 'Why did my video download fail or show an error?',
    a4: 'Common reasons include: the video was deleted or set to private, the link was incomplete, or the platform changed its security tokens. Please verify the URL works in an incognito window and try again.',
    q5: 'Can I extract high-quality audio (MP3) from videos?',
    a5: 'Yes! After submitting the video link, simply select the MP3 Audio option from the available quality list to save crystal clear 320kbps audio.',
  },
  footer: {
    blogTutorials: 'Blog & Tutorials',
    newsletterTitle: 'Subscribe to our newsletter to get updates to our latest collections',
    newsletterSubtitle: 'Get 20% off formatting guides and tips just by subscribing to our newsletter',
    enterEmail: 'Enter your email',
    subscribe: 'Subscribe',
    subscribed: 'Thank you! Your email is now registered for newsletter updates.',
    privacyNotice: 'You will be able to unsubscribe at any time.',
    readPrivacy: 'Read our privacy policy',
    bio: 'High-speed, clean, and watermark-free video & audio extraction for Facebook, TikTok, Instagram, and Twitter / X.',
    colCompany: 'Company',
    colServices: 'Services',
    colCommunity: 'Community',
    colLegal: 'Legal & Policy',
    colSupport: 'Support',
    aboutUs: 'About Us',
    services: 'Downloaders',
    community: 'Community',
    testimonials: 'Testimonials',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    cookies: 'Cookie Settings',
    disclaimer: 'Disclaimer',
    contactUs: 'Contact Us',
    helpCenter: 'Help Center',
    faqLink: 'FAQ',
    status: 'System Status',
    copyright: 'All rights reserved.',
  },
  blogLanguages: {
    badge: 'Multilingual',
    title: 'Browse blogs by language',
    subtitle: 'Every guide is written by hand in its own language — not machine translated.',
    footnote: 'Pick a language to open its full archive.',
    postSingular: 'post',
    postPlural: 'posts',
  },
  blog: {
    title: 'Blog & Video Guides',
    subtitle: 'Read the latest guides, format tutorials, and social media downloading tips.',
    searchPlaceholder: 'Search articles, tutorials, formats...',
    allCategories: 'All Articles',
    languageLabel: 'Language',
    allLanguages: 'All Languages',
    readTime: 'min read',
    readArticle: 'Read Guide',
    noPostsFound: 'No articles found matching your search.',
    tryDifferentSearch: 'Try different search keywords or select another category.',
    newsletterTitle: 'Get Video Downloading Tips & Updates',
    newsletterDesc: 'Subscribe to our newsletter for exclusive format tutorials, resolution cheat sheets, and tool updates.',
    subscribe: 'Subscribe',
    subscribed: 'Subscribed Successfully!',
    enterEmail: 'Enter your email address',
    backToHome: 'Back to Home',
  },
  blogPost: {
    breadcrumbHome: 'Home',
    breadcrumbBlog: 'Blog',
    share: 'Share',
    copied: 'Link Copied!',
    copyLink: 'Copy Link',
    comments: 'Comments',
    leaveReply: 'Leave a Reply',
    leaveReplySubtitle: 'Your email address will not be published. Required fields are marked *',
    name: 'Your Name *',
    email: 'Your Email * (will not be published)',
    comment: 'Your Comment *',
    postComment: 'Submit Comment',
    submitting: 'Submitting...',
    commentPending: 'Thank you! Your comment has been submitted and is pending moderation.',
    noCommentsYet: 'No comments yet. Be the first to join the discussion!',
    recentPosts: 'Recent Articles',
    categories: 'Categories',
    followUs: 'Follow Us',
    author: 'Author',
    publishedOn: 'Published on',
    focusTopics: 'Focus Topics:',
    freeExtractor: 'Free Video Extractor',
    promoTitle: 'Download Any Public Facebook Video or Reel in 1080p',
    promoSubtitle: 'No software installation required. Fast, lossless, and converted directly to MP4 or MP3.',
    tryNow: 'Try {brand} Now',
    moderatedDiscussion: 'Moderated discussion',
    noCommentsDesc: 'Be the first to share your thoughts, tips, or questions about this article below.',
    suiteBadge: '#1 Social Downloader',
    suiteTitle: '{brand} Tool Suite',
    suiteSubtitle: 'Save reels, videos, and stories from your favorite social platforms in 1080p Full HD with zero audio sync lag.',
    launchDownloader: 'Launch Downloader',
    followUsDesc: 'Connect with our editorial creators across global social networks.',
  },
  contact: {
    title: 'Contact Support & Help',
    subtitle: 'Have questions, feedback, or need assistance? Reach out to our technical team and we will respond promptly.',
    name: 'Your Full Name',
    email: 'Your Email Address',
    topic: 'Support Topic',
    topicGeneral: 'General Inquiry',
    topicDownload: 'Download Issue',
    topicFeature: 'Feature Request',
    topicBusiness: 'Business & Partnership',
    topicBug: 'Bug Report',
    message: 'Detailed Message',
    messagePlaceholder: 'Please describe your inquiry, platform URL, or feedback...',
    sendMessage: 'Send Message',
    sending: 'Sending message...',
    successTitle: 'Message Received!',
    successDesc: 'Thank you for reaching out. A support ticket has been created and we will respond to your email shortly.',
    sendAnother: 'Send Another Message',
    supportNotice: 'Our team typically responds within 12-24 hours.',
    faqNoticeTitle: 'Need Immediate Help?',
    faqNoticeDesc: 'Check out our FAQ section for quick answers to the most common video downloading questions.',
    viewFaq: 'View FAQ Section',
    badge: 'We are here to assist you',
    cardSupportTitle: 'Customer Support',
    cardSupportDesc: 'Having trouble downloading a Facebook, TikTok, Instagram, or Twitter / X video?',
    cardSupportBadge: '24/7 Monitored',
    cardLegalTitle: 'Legal & DMCA',
    cardLegalDesc: 'Copyright notices, terms of service clarification, and takedowns.',
    cardLegalBadge: 'Fast Review',
    cardPartnersTitle: 'Partnerships & Press',
    cardPartnersDesc: 'Advertising, API licensing inquiries, and media partnerships.',
    cardPartnersBadge: 'Business Ops',
    formTitle: 'Send Us a Direct Message',
    formSubtitle: 'Fill in the form below and we will respond directly to your email address.',
    topicLegal: 'Copyright / DMCA Takedown',
    namePlaceholder: 'e.g. Alex Miller',
    emailPlaceholder: 'alex@example.com',
    charsLabel: 'chars',
    charsMin: '(min 10)',
    successBadge: 'Submission Received',
    successHeading: 'Thank You! Your Message Was Sent',
    successBody: 'Our support specialists have received your inquiry and will review it. You will receive a direct reply at your provided email address.',
    ticketIdLabel: 'Ticket ID:',
    copyId: 'Copy ID',
    copyIdTitle: 'Copy Reference Ticket ID',
    copied: 'Copied',
    recapTopic: 'Recipient / Topic:',
    recapContact: 'Contact:',
    recapTurnaround: 'Estimated Turnaround:',
    turnaroundValue: 'Within 4–24 hours',
    useDownloader: 'Use Video Downloader',
    errName: 'Please enter your name.',
    errNameShort: 'Name must be at least 2 characters.',
    errEmail: 'Email address is required.',
    errEmailInvalid: 'Please enter a valid email address (e.g. name@domain.com).',
    errMessage: 'Please enter your message or question.',
    errMessageShort: 'Message is too short ({count}/10 chars minimum).',
    errFix: 'Please fix the highlighted errors before submitting.',
    errSendFail: 'Could not send your message. Please try again.',
    errNetwork: 'Could not reach the server. Please check your connection and try again.',
    toastSuccess: 'Your message has been sent successfully! Our support team will reply within 24 hours.',
    toastCopied: 'Reference ID copied to clipboard!',
    faqBoxTitle: 'Common Questions Answered',
    faqQ1: 'Why did my video download fail?',
    faqA1: 'Most download failures occur if the video was set to Private, deleted by the author, or geo-restricted. Ensure the link opens in an incognito window.',
    faqQ2: 'Does {brand} store my downloaded videos?',
    faqA2: 'Never. Videos are streamed directly from official CDN nodes straight to your browser storage. We do not host, store, or copy user videos.',
    faqQ3: 'Is there any charge or subscription?',
    faqA3: '{brand} is 100% free with no hidden charges, trial periods, or credit card requirements.',
    ctaBadge: 'Ready to save a video?',
    ctaHeading: 'Jump Straight to the Downloader Tool',
    ctaText: 'Switch instantly to Facebook, TikTok, Instagram, or Twitter / X downloader directly on the Home page.',
    ctaButton: 'Open Downloader Now',
    cmsHeading: 'Contact Support & Help',
    cmsIntro: 'Questions, feedback, a bug to report, or a business enquiry? Send us a message and the support team will get back to you.',
    cmsResponseTime: 'We usually reply within 24 hours.',
  },
  legalCommon: {
    lastUpdated: 'Last updated',
  },
  privacyPage: {
    title: 'Privacy Policy',
    metaDescription: 'Privacy Policy for {brand} — what data we collect, what we don’t store, and how your information is handled.',
    s1Title: 'What We Collect',
    s1p1: 'When you submit a video link, our server temporarily processes the URL, your IP address, browser/user-agent, and the platform involved, in order to fetch the video and to keep basic operational logs (for example, to detect abuse and measure reliability). We do not require an account or personal details to use the downloader.',
    s1p2: 'If you subscribe to our newsletter or contact support, we store the email address (and message, for support requests) you provide, only to respond to you or send the updates you asked for.',
    s2Title: 'What We Don’t Store',
    s2p1: 'We do not host, cache, or keep a copy of the videos or audio files you download. Media is streamed directly from the original platform’s own content delivery network (CDN) to your device — our server only relays the connection.',
    s2p2: 'We never sell or share your personal information with advertisers or data brokers.',
    s3Title: 'Cookies & Local Storage',
    s3p1: 'The public downloader tool does not use tracking cookies. The only cookie this site sets is a secure, httpOnly session cookie used solely to keep an administrator signed in to the admin dashboard — it is not used to track visitors.',
    s3p2: 'Your language preference, theme (light/dark), and download history are kept in your browser’s local storage on your own device, not on our servers.',
    s4Title: 'Your Rights',
    s4p1: 'You can unsubscribe from the newsletter at any time using the link in any email we send. Since downloads don’t require an account, there is no profile data to request or delete beyond what’s described above.',
    contactNote: 'Questions about this policy? Contact us at',
  },
  termsPage: {
    title: 'Terms of Use',
    metaDescription: 'Terms of Use for {brand} — acceptable use, restrictions, and service availability for our free video downloader.',
    intro: 'By using {brand}, you agree to these terms. This service lets you fetch and save publicly accessible videos, reels, and audio from supported social platforms directly from their own servers to your device. It is provided for personal, fair-use purposes.',
    allowedTitle: 'Acceptable Use',
    allowed1: 'Downloading publicly available videos, reels, and audio for personal, offline viewing or archiving.',
    allowed2: 'Saving your own content, or content you have permission to download, from supported platforms.',
    allowed3: 'Using the MP3 audio extraction for personal, non-commercial listening.',
    notAllowedTitle: 'Not Allowed',
    notAllowed1: 'Downloading and redistributing copyrighted content without the rights holder’s permission.',
    notAllowed2: 'Automated, bulk, or scripted scraping of the service (this tool is for individual, manual use).',
    notAllowed3: 'Using downloaded content for any illegal purpose, or in a way that violates the original platform’s own terms.',
    availabilityTitle: 'Service Availability',
    availabilityBody: 'Supported platforms can change their websites at any time, which may temporarily break extraction for that platform until we update our end. The service is provided “as is,” without guarantees of uninterrupted availability, and we may update or discontinue individual platform support as needed.',
    contactNote: 'Questions about these terms? Contact us at',
  },
  legalPage: {
    title: 'Legal & DMCA',
    metaDescription: 'Legal information and DMCA policy for {brand} — platform affiliation, how downloads work, and copyright takedown process.',
    affiliationTitle: 'Not Affiliated With Any Platform',
    affiliationBody: '{brand} is an independent tool and is not affiliated with, endorsed by, or sponsored by Meta/Facebook, Instagram, TikTok (ByteDance), X (Twitter), Pinterest, Reddit, or any other platform it supports. All product names, logos, and trademarks referenced belong to their respective owners.',
    downloadsTitle: 'How Downloads Work',
    downloadsBody: 'We do not host, cache, or archive any video or audio files. When you request a download, our server locates the direct media link on the source platform and streams it straight from that platform’s own CDN to your device. Responsibility for how downloaded content is used rests with the person downloading it — please respect copyright and only save content you own or have permission to use.',
    dmcaTitle: 'DMCA / Copyright Takedown Requests',
    dmcaBody: 'If you believe content accessible through {brand} infringes your copyright, please email us at the address below with (1) a description of the copyrighted work, (2) the URL(s) involved, and (3) a statement that you own the rights or are authorized to act on the owner’s behalf. We will review and respond promptly.',
    inquiries: 'Legal & DMCA inquiries:',
  },
  notFound: {
    title: 'Page Not Found',
    badge: 'Error 404',
    heading: 'This page doesn\u2019t exist',
    body: 'The link may be broken, or the page may have been moved or removed. Here are some good places to go instead.',
    postHeading: 'This article isn\u2019t available',
    postBody: 'It may have been moved, renamed or taken down. Try one of our latest guides below.',
    homeBtn: 'Go to Home',
    blogBtn: 'Browse the Blog',
    contactBtn: 'Report a broken link',
    latestTitle: 'Latest guides',
    loading: 'Loading article\u2026',
  },
  aboutPage: {
    title: 'About Us',
    metaDescription: 'Learn about {brand} — a free, fast, watermark-free video and audio downloader supporting Facebook, Instagram, TikTok, X (Twitter), Pinterest, Reddit, Threads, Dailymotion.',
    heading: 'About Us',
    /** Languages that put the qualifier after the name (Japanese) set this
     *  instead of `heading`, so the h1 reads naturally in every language. */
    headingSuffix: '',
    intro: 'We build a simple, fast way to save public videos from the social platforms you already use — without accounts, watermarks or software installs.',
    h1Title: 'Fast, No Account Needed',
    h1Desc: 'Paste a public video link and get download-ready HD (and MP3 audio) options in seconds — no sign-up, no app install.',
    h2Title: 'Nothing Stored on Our Side',
    h2Desc: 'We never host or archive your videos. Files stream directly from the platform’s own servers straight to your device.',
    h3Title: 'HD Video & Clean Audio',
    h3Desc: 'Choose the quality that fits your need — up to Full HD video, or extract just the audio as MP3.',
    ctaHeading: 'Ready to try it?',
    ctaText: 'Paste any public video link and download it in seconds — free, and with no watermark.',
    ctaButton: 'Start Downloading',
  },
  speedMeter: {
    title: 'Download Speed Meter',
    connecting: 'Connecting to CDN...',
    assembling: 'Assembling file...',
    mbps: 'MB/s',
    peak: 'Peak',
    average: 'Average',
    speedRatingTurbo: 'Turbo Speed',
    speedRatingFast: 'High Speed',
    speedRatingOptimal: 'Optimal Speed',
  }
};

const translations: Record<Language, any> = {
  en: enTranslation,
  es: esTranslation,
  ar: arTranslation,
  pt: ptTranslation,
  id: idTranslation,
  fr: frTranslation,
  ru: ruTranslation,
  de: deTranslation,
  hi: hiTranslation,
  ja: jaTranslation,
  ur: urTranslation,
};

export interface LanguageContextType {
  language: Language;
  currentLang: Language;
  setLanguage: (lang: Language) => void;
  currentLangInfo: LanguageInfo;
  /** Declare the language of the main content on this page (e.g. a blog post),
   *  or null to fall back to the interface language. */
  setContentLanguage: (code: string | null) => void;
  /** The site's name as the admin has it saved — already substituted into `t`. */
  brand: string;
  t: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('fdownloader_lang') as Language) || 'en';
  });

  const currentLangInfo = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  /**
   * When a page's main content is written in a different language from the
   * interface — an Arabic blog post read on an English site — that page
   * registers its language here. <html lang> then describes the content,
   * which is what search engines index, while <html dir> keeps following the
   * interface so the layout never flips under the reader.
   *
   * Routing it through this provider matters: it is the only writer of those
   * two attributes, so a page and the language switcher can never overwrite
   * each other.
   */
  const [contentLanguage, setContentLanguage] = useState<string | null>(null);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('fdownloader_lang', lang);
  };

  useEffect(() => {
    const info = LANGUAGES.find(l => l.code === language);
    document.documentElement.dir = info?.dir || 'ltr';
    document.documentElement.lang = contentLanguage || language;
  }, [language, contentLanguage]);

  const currentDict = translations[language] || translations['en'];

  // The About/Contact/Privacy/Terms/Legal copy for the ten non-English
  // languages lives in its own module, so adding a language means adding one
  // entry there rather than editing ten large dictionary files.
  const pageDict = LEGAL_PAGE_TRANSLATIONS[language] || {};

  // Deep-merge English defaults with current language dictionary so missing keys never render empty
  const mergedDict = {
    ...translations['en'],
    ...currentDict,
    header: { ...translations['en'].header, ...(currentDict?.header || {}) },
    hero: { ...translations['en'].hero, ...(currentDict?.hero || {}) },
    tools: { ...translations['en'].tools, ...(currentDict?.tools || {}) },
    input: { ...translations['en'].input, ...(currentDict?.input || {}) },
    videoResult: { ...translations['en'].videoResult, ...(currentDict?.videoResult || {}) },
    howTo: { ...translations['en'].howTo, ...(currentDict?.howTo || {}) },
    features: { ...translations['en'].features, ...(currentDict?.features || {}) },
    homeBlog: { ...translations['en'].homeBlog, ...(currentDict?.homeBlog || {}) },
    faq: { ...translations['en'].faq, ...(currentDict?.faq || {}) },
    footer: { ...translations['en'].footer, ...(currentDict?.footer || {}) },
    blogLanguages: { ...translations['en'].blogLanguages, ...(currentDict?.blogLanguages || {}) },
    blog: { ...translations['en'].blog, ...(currentDict?.blog || {}) },
    blogPost: { ...translations['en'].blogPost, ...(currentDict?.blogPost || {}) },
    contact: { ...translations['en'].contact, ...(currentDict?.contact || {}), ...(pageDict.contact || {}) },
    speedMeter: { ...translations['en'].speedMeter, ...(currentDict?.speedMeter || {}) },
    legalCommon: { ...translations['en'].legalCommon, ...(pageDict.legalCommon || {}) },
    privacyPage: { ...translations['en'].privacyPage, ...(pageDict.privacyPage || {}) },
    termsPage: { ...translations['en'].termsPage, ...(pageDict.termsPage || {}) },
    legalPage: { ...translations['en'].legalPage, ...(pageDict.legalPage || {}) },
    aboutPage: { ...translations['en'].aboutPage, ...(pageDict.aboutPage || {}) },
    notFound: { ...translations['en'].notFound, ...(pageDict.notFound || {}) },
  };

  // Every `{brand}` in the dictionary becomes the admin's saved site name.
  // useSyncExternalStore re-renders the whole tree the moment that name
  // changes, so a rename in Settings shows up everywhere without a reload.
  const brand = useSyncExternalStore(subscribeBrand, getBrandName, getBrandName);
  // Words that used to be hard-coded English: English first, then this
  // language's own wording on top, section by section.
  const extraEn: any = EXTRA_TRANSLATIONS.en;
  const extraCur: any = EXTRA_TRANSLATIONS[language] || {};
  for (const section of Object.keys(extraEn)) {
    (mergedDict as any)[section] = { ...extraEn[section], ...((mergedDict as any)[section] || {}), ...(extraCur[section] || {}) };
  }

  const brandedDict = useMemo(() => applyBrand(mergedDict, brand), [language, brand]);

  // Robust hybrid translation object/function supporting both t.features.f1Title and t('features.f1Title')
  const t = (keyOrPath: string): string => {
    const parts = keyOrPath.split('.');
    let curr: any = brandedDict;
    for (const p of parts) {
      if (curr && curr[p] !== undefined) {
        curr = curr[p];
      } else {
        return keyOrPath;
      }
    }
    return typeof curr === 'string' ? curr : keyOrPath;
  };

  // Attach all section objects to t so object property access (t.faq.q1, t.blog.title) works instantly
  Object.assign(t, brandedDict);

  return (
    <LanguageContext.Provider value={{ language, currentLang: language, setLanguage, currentLangInfo, setContentLanguage, brand, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
