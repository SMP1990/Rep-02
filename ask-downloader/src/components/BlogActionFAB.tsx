import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Sparkles, FileText } from 'lucide-react';

interface BlogActionFABProps {
  onNewPost: () => void;
  onNewDraft: () => void;
}

export const BlogActionFAB: React.FC<BlogActionFABProps> = ({ onNewPost, onNewDraft }) => {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div ref={fabRef} className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 flex flex-col items-end">
      {/* Click-outside backdrop when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-[#2e2440]/30 backdrop-blur-[2px] z-30"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Speed Dial Menu Items */}
      <div className="relative z-40 flex flex-col items-end gap-3 mb-3">
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Option 1: New Post (Published) */}
              <motion.div
                key="fab-new-post"
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ duration: 0.18, delay: 0.04 }}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => handleSelect(onNewPost)}
              >
                <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-[0_6px_20px_rgba(75,46,131,0.15)] border border-[#eae3ee] dark:border-[#2e1d4d] text-right pointer-events-auto transition-transform group-hover:-translate-x-1">
                  <p className="text-xs font-bold text-[#2e2440] dark:text-white group-hover:text-[#6d46b8] transition-colors">
                    New Post
                  </p>
                  <p className="text-[10px] text-[#726c85] dark:text-[#b5a9cd]">Publish immediately</p>
                </div>
                <button
                  id="fab-action-new-post"
                  type="button"
                  aria-label="Create New Post"
                  className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#4b2e83] to-[#7c4fd1] text-white flex items-center justify-center shadow-[0_6px_20px_rgba(75,46,131,0.35)] group-hover:scale-110 group-hover:shadow-[0_8px_25px_rgba(75,46,131,0.5)] transition-all cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-amber-200" />
                </button>
              </motion.div>

              {/* Option 2: Draft */}
              <motion.div
                key="fab-new-draft"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => handleSelect(onNewDraft)}
              >
                <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-[0_6px_20px_rgba(75,46,131,0.15)] border border-[#eae3ee] dark:border-[#2e1d4d] text-right pointer-events-auto transition-transform group-hover:-translate-x-1">
                  <p className="text-xs font-bold text-[#2e2440] dark:text-white group-hover:text-[#e6799f] transition-colors">
                    New Draft
                  </p>
                  <p className="text-[10px] text-[#726c85] dark:text-[#b5a9cd]">Save internal draft</p>
                </div>
                <button
                  id="fab-action-new-draft"
                  type="button"
                  aria-label="Create New Draft"
                  className="w-12 h-12 rounded-full bg-white dark:bg-[#181224] text-amber-600 border border-amber-200 flex items-center justify-center shadow-[0_6px_20px_rgba(217,119,6,0.18)] group-hover:scale-110 group-hover:bg-amber-50 transition-all cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-amber-600" />
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Main Trigger Floating Action Button */}
      <div className="relative z-40 flex items-center">
        {!isOpen && (
          <span className="hidden sm:inline-block mr-3 px-3 py-1 bg-white/90 backdrop-blur-md text-xs font-bold text-[#4b2e83] rounded-full shadow-[0_4px_14px_rgba(109,70,184,0.15)] border border-[#e6799f]/20 pointer-events-none select-none">
            Quick Actions
          </span>
        )}
        <button
          id="blog-fab-main-trigger"
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close speed dial" : "Open quick post actions"}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-300 shadow-[0_8px_28px_rgba(109,70,184,0.45)] hover:shadow-[0_12px_36px_rgba(109,70,184,0.6)] ${
            isOpen
              ? 'bg-[#2e2440] rotate-45 scale-95'
              : 'bg-gradient-to-r from-[#6d46b8] to-[#e6799f] hover:scale-105 active:scale-95'
          }`}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
