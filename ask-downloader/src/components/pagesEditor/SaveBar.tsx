import React from 'react';
import { Save } from 'lucide-react';

interface Props {
  /** Names of the pages with unsaved changes. */
  dirtyNames: string[];
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Stays at the bottom of the screen while there is something to save. */
export const SaveBar: React.FC<Props> = ({ dirtyNames, saving, onSave, onDiscard }) => {
  const dirty = dirtyNames.length > 0;
  return (
    <div className={dirty ? 'sticky bottom-3 z-20 mt-5' : 'mt-5'}>
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        dirty
          ? 'border-[#d9cdea] dark:border-[#3a2860] bg-white/95 dark:bg-[#181224]/95 backdrop-blur shadow-lg'
          : 'border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224]'
      }`} role="status">
        <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] min-w-0">
          {dirty ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 align-middle" />
              <b className="text-[#2e2440] dark:text-white">{dirtyNames.length} page{dirtyNames.length > 1 ? 's' : ''} with unsaved changes</b>
              <span className="hidden sm:inline"> · {dirtyNames.join(', ')}</span>
            </>
          ) : 'All changes saved'}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onDiscard} disabled={!dirty || saving}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] text-[#2e2440] dark:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            Discard
          </button>
          <button type="button" onClick={onSave} disabled={!dirty || saving} title={`Save (${isMac ? '⌘' : 'Ctrl'}+S)`}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#4b2e83] to-[#6d46b8] rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-3.5 h-3.5" /> Save Pages
            <kbd className="hidden sm:inline ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-semibold">{isMac ? '⌘' : 'Ctrl'}+S</kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
