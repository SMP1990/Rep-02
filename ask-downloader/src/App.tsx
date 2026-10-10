import React, { useState, Suspense, lazy } from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { LanguageProvider } from './context/LanguageContext';
import { Toast } from './components/Toast';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { Sidebar } from './components/Sidebar';

// Every page is loaded on demand (its own chunk) instead of all at once —
// most visitors only ever need the public downloader pages, so the heavy
// admin-dashboard pages (Blog Manager, Content Editor, etc.) no longer add
// to their initial download.
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardOverview = lazy(() => import('./pages/DashboardOverview').then((m) => ({ default: m.DashboardOverview })));
const SubscribersPage = lazy(() => import('./pages/SubscribersPage').then((m) => ({ default: m.SubscribersPage })));
const DownloadStatsPage = lazy(() => import('./pages/DownloadStatsPage').then((m) => ({ default: m.DownloadStatsPage })));
const VisitorsPage = lazy(() => import('./pages/VisitorsPage').then((m) => ({ default: m.VisitorsPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const ContentEditorPage = lazy(() => import('./pages/ContentEditorPage').then((m) => ({ default: m.ContentEditorPage })));
const BlogManagerPage = lazy(() => import('./pages/BlogManagerPage').then((m) => ({ default: m.BlogManagerPage })));
const MessagesPage = lazy(() => import('./pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const MediaLibraryPage = lazy(() => import('./pages/MediaLibraryPage').then((m) => ({ default: m.MediaLibraryPage })));
const RedirectsPage = lazy(() => import('./pages/RedirectsPage').then((m) => ({ default: m.RedirectsPage })));
const ToolsSeoPage = lazy(() => import('./pages/ToolsSeoPage').then((m) => ({ default: m.ToolsSeoPage })));
const PublicHomePage = lazy(() => import('./pages/PublicHomePage').then((m) => ({ default: m.PublicHomePage })));
const PublicContactPage = lazy(() => import('./pages/PublicContactPage').then((m) => ({ default: m.PublicContactPage })));
const PublicBlogListingPage = lazy(() => import('./pages/PublicBlogListingPage').then((m) => ({ default: m.PublicBlogListingPage })));
const PublicBlogPostPage = lazy(() => import('./pages/PublicBlogPostPage').then((m) => ({ default: m.PublicBlogPostPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsOfUsePage = lazy(() => import('./pages/TermsOfUsePage').then((m) => ({ default: m.TermsOfUsePage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage').then((m) => ({ default: m.AboutUsPage })));
const BackgroundRemoverPage = lazy(() => import('./pages/BackgroundRemoverPage').then((m) => ({ default: m.BackgroundRemoverPage })));
const PasswordGeneratorPage = lazy(() => import('./pages/PasswordGeneratorPage').then((m) => ({ default: m.PasswordGeneratorPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-3 border-[#6d46b8]/25 border-t-[#6d46b8] animate-spin" />
  </div>
);

const AppContent: React.FC = () => {
  const { currentRoute, isAuthenticated, activeBlogLanguage, siteSettings } = useAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 1. Public Home Downloader Page
  if (currentRoute === 'home') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <PublicHomePage />
      </div>
    );
  }

  // 2. Public Contact Us Page
  if (currentRoute === 'contact') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <PublicContactPage />
      </div>
    );
  }

  // 3. If viewing public blog listing
  if (currentRoute === 'public-blog') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <PublicBlogListingPage />
      </div>
    );
  }

  // 3b. Language-specific blog archive (/blog/en, /blog/ur, ...)
  if (currentRoute === 'public-blog-language') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <PublicBlogListingPage language={activeBlogLanguage} />
      </div>
    );
  }

  // 4. If viewing single public blog article
  if (currentRoute === 'public-blog-post') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <PublicBlogPostPage />
      </div>
    );
  }

  // 4b. Legal / about pages
  if (currentRoute === 'privacy-policy') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <PrivacyPolicyPage />
      </div>
    );
  }
  if (currentRoute === 'terms-of-use') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <TermsOfUsePage />
      </div>
    );
  }
  if (currentRoute === 'legal') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <LegalPage />
      </div>
    );
  }
  if (currentRoute === 'about-us') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <AboutUsPage />
      </div>
    );
  }

  if (currentRoute === 'background-remover') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <BackgroundRemoverPage />
      </div>
    );
  }

  if (currentRoute === 'password-generator') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <PasswordGeneratorPage />
      </div>
    );
  }

  // 4c. Any address that isn't a page on the site (the server sends 404).
  if (currentRoute === 'not-found') {
    return (
      <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased text-[#2e2440] dark:text-[#f1e9fb]">
        <NotFoundPage />
      </div>
    );
  }

  // 5. If user is on login page or not authenticated when trying to access admin pages
  if (!isAuthenticated || currentRoute === 'login') {
    return (
      <main className="min-h-screen font-sans antialiased">
        <LoginPage />
      </main>
    );
  }

  // 6. Authenticated Admin Dashboard Layout with Fixed Gradient Sidebar
  return (
    <div className="min-h-screen bg-[#f6f0f4] dark:bg-[#0e0a17] font-sans antialiased flex flex-col md:flex-row text-[#2e2440] dark:text-[#f1e9fb]">
      {/* Fixed Gradient Left Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area on the Right */}
      <div className="flex-1 md:ml-68 lg:ml-72 min-h-screen flex flex-col">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentRoute === 'dashboard' && (
            <DashboardOverview onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'messages' && (
            <MessagesPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'subscribers' && (
            <SubscribersPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'downloads' && (
            <DownloadStatsPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'admin-users' && (
            <AdminUsersPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'visitors' && (
            <VisitorsPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'content-editor' && (
            <ContentEditorPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'blog-manager' && (
            <BlogManagerPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'media' && (
            <MediaLibraryPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'redirects' && (
            <RedirectsPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'tools-seo' && (
            <ToolsSeoPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
          {currentRoute === 'settings' && (
            <SettingsPage onOpenMobileMenu={() => setMobileOpen(true)} />
          )}
        </main>

        {/* Admin Dashboard Footer */}
        <footer className="py-4 px-6 sm:px-8 border-t border-[#eae3ee] dark:border-[#2e1d4d] text-xs text-[#726c85] dark:text-[#b5a9cd] flex flex-col sm:flex-row items-center justify-between gap-2 bg-[#f6f0f4] dark:bg-[#120c1f]">
          <p>
            <strong className="text-[#4b2e83] dark:text-[#d1b9f7]">{siteSettings?.siteName}</strong> Back-Office Administration System &copy; 2026
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              All systems operational
            </span>
            <span>Version 2.4.0-stable</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AdminProvider>
        <Suspense fallback={<PageLoadingFallback />}>
          <AppContent />
        </Suspense>
        <Toast />
        <ScrollToTopButton />
      </AdminProvider>
    </LanguageProvider>
  );
}
