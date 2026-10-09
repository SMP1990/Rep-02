import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  /** e.g. "Highlight 1" */
  label: string;
  /** The item's own title, shown next to the label while it is closed. */
  preview?: string;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}

/** One repeating item (a highlight, a policy section) that opens and closes. */
export const AccordionItem: React.FC<Props> = ({ label, preview, open, onToggle, onRemove, children }) => {
  const bodyId = useId();
  return (
    <div className={`rounded-xl border mb-2 transition-colors ${open ? 'border-[#d9cdea] dark:border-[#3a2860]' : 'border-[#eae3ee] dark:border-[#2e1d4d]'}`}>
      <div className="flex items-center gap-2 pr-2">
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}
          className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#6d46b8]/50">
          <ChevronDown className={`w-4 h-4 shrink-0 text-[#a29cb2] transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#a29cb2] shrink-0">{label}</span>
          <span className={`text-xs truncate ${preview ? 'text-[#2e2440] dark:text-white font-semibold' : 'text-[#a29cb2] italic'}`}>
            {preview || 'Untitled'}
          </span>
        </button>
        <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="text-[11px] font-bold text-rose-600 cursor-pointer px-1.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60">
          Remove
        </button>
      </div>
      {open && <div id={bodyId} className="px-3 pb-3">{children}</div>}
    </div>
  );
};

/** Which items of a list are open, kept in step when items are added or removed. */
export function useOpenItems(initial: number[] = []) {
  const [open, setOpen] = React.useState<Set<number>>(() => new Set(initial));
  return {
    isOpen: (i: number) => open.has(i),
    toggle: (i: number) => setOpen((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; }),
    show: (i: number) => setOpen((s) => new Set(s).add(i)),
    all: (count: number) => setOpen(new Set(Array.from({ length: count }, (_, i) => i))),
    none: () => setOpen(new Set()),
    /** After item `i` is removed, later items move up one place. */
    removed: (i: number) => setOpen((s) => new Set([...s].filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)))),
    count: open.size,
  };
}

/** "Expand all / Collapse all" above a list of accordion items. */
export const ExpandAll: React.FC<{ anyOpen: boolean; onExpand: () => void; onCollapse: () => void }> = ({ anyOpen, onExpand, onCollapse }) => (
  <button type="button" onClick={anyOpen ? onCollapse : onExpand}
    className="text-[11px] font-bold text-[#6d46b8] dark:text-[#d1b9f7] hover:underline cursor-pointer">
    {anyOpen ? 'Collapse all' : 'Expand all'}
  </button>
);
