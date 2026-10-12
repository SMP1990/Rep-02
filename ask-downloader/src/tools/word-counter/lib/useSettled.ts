// The text to count. Normal text: React's deferred value, so typing always
// renders first. Very long text (measured: ~50-130 ms per full count on a
// laptop, several times that on a cheap phone): counted only once typing
// pauses, so the box never lags.
import { useDeferredValue, useEffect, useState } from 'react';

export const LONG_TEXT = 20000;
const PAUSE_MS = 250;

export function useSettled(text: string): string {
  const deferred = useDeferredValue(text);
  const [paused, setPaused] = useState(text);
  const long = text.length >= LONG_TEXT;

  useEffect(() => {
    if (!long) return;
    const timer = setTimeout(() => setPaused(text), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [text, long]);

  return long ? paused : deferred;
}
