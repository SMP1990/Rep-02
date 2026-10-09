import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

/**
 * Floating "back to top" button. Appears once the user has scrolled down a
 * bit, and smooth-scrolls back to the top of the page when clicked.
 *
 * Placed at bottom-LEFT (not bottom-right) because DownloadProgressBar
 * already occupies the bottom-right corner while a download is active —
 * this avoids the two ever overlapping. Hidden entirely on admin dashboard
 * routes, since the fixed sidebar there occupies the same left edge.
 */
const ADMIN_ROUTES = ['dashboard', 'subscribers', 'downloads', 'content-editor', 'blog-manager', 'settings', 'messages', 'login'];

export const ScrollToTopButton: React.FC = () => {
  const { currentRoute } = useAdmin();
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 420);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (ADMIN_ROUTES.includes(currentRoute)) return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          aria-label={t.ui.scrollTop}
          title={t.ui.backToTop}
          initial={{ opacity: 0, y: 12, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.85 }}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#4b2e83] via-[#6d46b8] to-[#e6799f] text-white shadow-lg shadow-[#6d46b8]/30 flex items-center justify-center cursor-pointer"
        >
          <ArrowUp className="w-5 h-5 sm:w-5.5 sm:h-5.5" strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
