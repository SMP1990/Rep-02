import { EXTRA_TRANSLATIONS } from '../translations/extra/index.ts';
import { fill } from './i18n.ts';
/**
 * Browser-Based Push Notification & Alert Manager for Media Downloads
 * Supports Web Notifications API, background tab alerts, and audio chimes.
 */

export interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  largeThresholdMB: number; // default 8 MB threshold for "large" files
}

const STORAGE_KEY = 'fdown_notification_preferences';

export function getStoredPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return { enabled: true, soundEnabled: true, largeThresholdMB: 8 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore storage parse errors
  }
  return { enabled: true, soundEnabled: true, largeThresholdMB: 8 };
}

export function saveStoredPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  const current = getStoredPreferences();
  const updated = { ...current, ...prefs };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage write errors
  }
  return updated;
}

/**
 * Checks if Web Notifications API is supported in the current environment
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets the current Notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/**
 * Requests browser push notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Browser rejected notification permission request:', err);
    return 'denied';
  }
}

let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Generates a subtle, pleasant, short two-tone chime (celesta/soft bell timbre)
 * when a media download successfully completes.
 */
export function playCompletionChime(customVolume = 0.15): void {
  try {
    const prefs = getStoredPreferences();
    if (!prefs.soundEnabled) return;

    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(customVolume, now);
    masterGain.connect(ctx.destination);

    // Tone 1: Gentle ascending pitch (E5: ~659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    // Smooth bell-like envelope: instant soft attack, gentle exponential decay
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.7, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Tone 2: Bright, uplifting resolution (B5: ~987.77 Hz), starting 100ms later
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.10);
    gain2.gain.setValueAtTime(0, now + 0.10);
    gain2.gain.linearRampToValueAtTime(0.85, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.10);
    osc2.stop(now + 0.48);

    // Subtle harmonic overtone (sparkle: 1975.5 Hz at very low volume) for acoustic warmth
    const oscHarmonic = ctx.createOscillator();
    const gainHarmonic = ctx.createGain();
    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(1975.5, now + 0.10);
    gainHarmonic.gain.setValueAtTime(0, now + 0.10);
    gainHarmonic.gain.linearRampToValueAtTime(0.12, now + 0.12);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    oscHarmonic.connect(gainHarmonic);
    gainHarmonic.connect(masterGain);
    oscHarmonic.start(now + 0.10);
    oscHarmonic.stop(now + 0.35);
  } catch (e) {
    console.debug('Audio chime playback omitted:', e);
  }
}

let titleIntervalId: number | null = null;
let originalDocumentTitle = '';

/**
 * Alternates the document title to attract user attention if they switched tabs
 */
export function flashTabTitle(alertTitle: string, durationMs = 8000): void {
  if (typeof document === 'undefined') return;

  if (titleIntervalId !== null) {
    clearInterval(titleIntervalId);
    titleIntervalId = null;
  }

  if (!originalDocumentTitle) {
    originalDocumentTitle = document.title;
  }

  let isAlert = true;
  document.title = `🔔 ${alertTitle}`;

  titleIntervalId = window.setInterval(() => {
    isAlert = !isAlert;
    document.title = isAlert ? `🔔 ${alertTitle}` : originalDocumentTitle;
  }, 1200);

  const cleanup = () => {
    if (titleIntervalId !== null) {
      clearInterval(titleIntervalId);
      titleIntervalId = null;
      if (originalDocumentTitle) {
        document.title = originalDocumentTitle;
      }
    }
    window.removeEventListener('focus', cleanup);
    document.removeEventListener('visibilitychange', cleanup);
  };

  window.addEventListener('focus', cleanup, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) cleanup();
  }, { once: true });

  setTimeout(cleanup, durationMs);
}

export interface DownloadCompletionAlertParams {
  title: string;
  filename: string;
  quality?: string;
  fileSize?: string;
  bytesTotal?: number;
  thumbnailUrl?: string;
}

export interface NotificationResult {
  sentNative: boolean;
  permission: NotificationPermission | 'unsupported';
  isLarge: boolean;
  message: string;
}

/**
 * Checks if a download qualifies as a "large video download"
 * (e.g. >= 8 MB or HD video)
 */
export function isLargeVideo(bytesTotal?: number): boolean {
  const prefs = getStoredPreferences();
  const thresholdBytes = prefs.largeThresholdMB * 1024 * 1024;
  if (bytesTotal && bytesTotal >= thresholdBytes) {
    return true;
  }
  return false;
}

/**
 * Dispatches a native browser push notification when a download completes
 */
/** Notification words in the reader's chosen language (no React here). */
function uiWords() {
  let lang = 'en';
  try { lang = localStorage.getItem('fdownloader_lang') || 'en'; } catch {}
  return (EXTRA_TRANSLATIONS[lang] || EXTRA_TRANSLATIONS.en).ui;
}

export function sendDownloadCompleteNotification(
  params: DownloadCompletionAlertParams
): NotificationResult {
  const { title, quality, fileSize, bytesTotal, thumbnailUrl } = params;
  const prefs = getStoredPreferences();
  const isLarge = isLargeVideo(bytesTotal);
  const permission = getNotificationPermission();

  const w = uiWords();
  const formattedTitle = isLarge ? w.notifLargeTitle : w.notifTitle;

  const formattedBody = fill(w.notifBody, {
    title,
    quality: quality ? `(${quality})` : '',
    size: fileSize ? `(${fileSize})` : '',
  }).replace(/\s+/g, ' ').trim();

  // 1. Play audio chime if sound is enabled
  if (prefs.soundEnabled) {
    playCompletionChime();
  }

  // 2. Flash tab title if user switched to another tab
  if (typeof document !== 'undefined' && document.hidden) {
    flashTabTitle(isLarge ? w.tabLarge : w.tabDone);
  }

  // 3. Send system browser push notification
  let sentNative = false;
  if (prefs.enabled && permission === 'granted' && isNotificationSupported()) {
    try {
      const notification = new Notification(formattedTitle, {
        body: formattedBody,
        icon: thumbnailUrl || '/favicon.ico',
        tag: `fdown-${Date.now()}`,
        requireInteraction: isLarge, // Large downloads can stay until clicked
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      sentNative = true;
    } catch (err) {
      console.warn('Native notification invocation failed:', err);
    }
  }

  return {
    sentNative,
    permission,
    isLarge,
    message: formattedBody,
  };
}
