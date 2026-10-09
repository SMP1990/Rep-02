import { useEffect } from 'react';

/**
 * "You have unsaved changes" for dashboard editors.
 *
 * The browser asks by itself when the tab is closed or reloaded
 * (beforeunload). Moving to another dashboard page happens inside the app,
 * so AdminContext's route change calls `confirmLeave()` first.
 */
let activeMessage: string | null = null;

/** True when it is fine to leave the current page (nothing unsaved, or the admin agreed). */
export function confirmLeave(): boolean {
  if (!activeMessage) return true;
  const ok = window.confirm(activeMessage);
  if (ok) activeMessage = null;
  return ok;
}

export function useUnsavedGuard(dirty: boolean, message = 'You have unsaved changes. Leave without saving?'): void {
  useEffect(() => {
    if (!dirty) return;
    activeMessage = message;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (activeMessage === message) activeMessage = null;
    };
  }, [dirty, message]);
}
