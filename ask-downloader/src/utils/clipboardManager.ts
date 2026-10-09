import { 
  validateFacebookUrl, 
  validateInstagramUrl,
  validateTikTokUrl,
  validateTwitterUrl,
  validatePinterestUrl,
  validateRedditUrl,
  validateThreadsUrl,
  validateDailymotionUrl,
  extractFacebookUrlFromText, 
  extractInstagramUrlFromText,
  extractTikTokUrlFromText,
  extractTwitterUrlFromText,
  extractPinterestUrlFromText,
  extractRedditUrlFromText,
  extractThreadsUrlFromText,
  extractDailymotionUrlFromText,
  getFacebookTypeLabel,
  getInstagramTypeLabel,
  getTikTokTypeLabel,
  getTwitterTypeLabel,
  getPinterestTypeLabel,
  getRedditTypeLabel,
  getThreadsTypeLabel,
  getDailymotionTypeLabel
} from './validation.ts';
import { SocialPlatform } from '../types.ts';

export type ClipboardPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';
export type AutoDetectPref = 'enabled' | 'disabled' | 'unset';

export interface ClipboardDetectResult {
  hasValidUrl: boolean;
  platform?: SocialPlatform;
  url?: string;
  typeLabel?: string;
  rawText?: string;
  error?: string;
}

const STORAGE_KEY_PREF = 'fdown_clipboard_autodetect';
const STORAGE_KEY_DISMISSED = 'fdown_clipboard_prompt_dismissed';

/**
 * Check if the browser supports clipboard reading
 */
export function isClipboardSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.clipboard && typeof navigator.clipboard.readText === 'function';
}

/**
 * Query current browser clipboard-read permission status
 */
export async function queryClipboardPermission(): Promise<ClipboardPermissionState> {
  if (!isClipboardSupported()) {
    return 'unsupported';
  }

  try {
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
      return permission.state as ClipboardPermissionState;
    }
  } catch {
    // Some browsers throw or don't support 'clipboard-read' in permissions.query
  }

  return 'prompt';
}

/**
 * Get user's saved auto-detection preference from localStorage
 */
export function getAutoDetectPreference(): AutoDetectPref {
  try {
    const val = localStorage.getItem(STORAGE_KEY_PREF);
    if (val === 'enabled') return 'enabled';
    if (val === 'disabled') return 'disabled';
  } catch {
    // localStorage might be unavailable
  }
  return 'unset';
}

/**
 * Save user's auto-detection preference to localStorage
 */
export function setAutoDetectPreference(pref: 'enabled' | 'disabled'): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREF, pref);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if user dismissed the permission banner in this session or previously
 */
export function isPromptDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark permission banner as dismissed
 */
export function setPromptDismissed(dismissed: boolean): void {
  try {
    if (dismissed) {
      localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_DISMISSED);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Safely inspect clipboard text for a Facebook or Instagram video URL
 */
export async function detectSocialUrlInClipboard(preferredPlatform?: SocialPlatform): Promise<ClipboardDetectResult> {
  if (!isClipboardSupported()) {
    return { hasValidUrl: false, error: 'Clipboard API unsupported' };
  }

  try {
    const text = await navigator.clipboard.readText();
    const trimmed = (text || '').trim();

    if (!trimmed) {
      return { hasValidUrl: false, rawText: '' };
    }

    // Check preferred platform first, or auto-detect
    const allPlatforms: SocialPlatform[] = ['facebook', 'instagram', 'tiktok', 'twitter', 'pinterest', 'reddit', 'threads', 'dailymotion'];
    const platformsToCheck: SocialPlatform[] = preferredPlatform
      ? [preferredPlatform, ...allPlatforms.filter((p) => p !== preferredPlatform)]
      : allPlatforms;

    for (const p of platformsToCheck) {
      let extracted = '';
      let validation: any = { isValid: false };
      let typeLabel = '';

      if (p === 'facebook') {
        extracted = extractFacebookUrlFromText(trimmed);
        validation = validateFacebookUrl(extracted);
        typeLabel = getFacebookTypeLabel(validation.type);
      } else if (p === 'instagram') {
        extracted = extractInstagramUrlFromText(trimmed);
        validation = validateInstagramUrl(extracted);
        typeLabel = getInstagramTypeLabel(validation.type);
      } else if (p === 'tiktok') {
        extracted = extractTikTokUrlFromText(trimmed);
        validation = validateTikTokUrl(extracted);
        typeLabel = getTikTokTypeLabel(validation.type);
      } else if (p === 'twitter') {
        extracted = extractTwitterUrlFromText(trimmed);
        validation = validateTwitterUrl(extracted);
        typeLabel = getTwitterTypeLabel(validation.type);
      } else if (p === 'pinterest') {
        extracted = extractPinterestUrlFromText(trimmed);
        validation = validatePinterestUrl(extracted);
        typeLabel = getPinterestTypeLabel(validation.type);
      } else if (p === 'reddit') {
        extracted = extractRedditUrlFromText(trimmed);
        validation = validateRedditUrl(extracted);
        typeLabel = getRedditTypeLabel(validation.type);
      } else if (p === 'threads') {
        extracted = extractThreadsUrlFromText(trimmed);
        validation = validateThreadsUrl(extracted);
        typeLabel = getThreadsTypeLabel(validation.type);
      } else if (p === 'dailymotion') {
        extracted = extractDailymotionUrlFromText(trimmed);
        validation = validateDailymotionUrl(extracted);
        typeLabel = getDailymotionTypeLabel(validation.type);
      }

      if (validation.isValid && extracted) {
        return {
          hasValidUrl: true,
          platform: p,
          url: extracted,
          typeLabel,
          rawText: trimmed,
        };
      }
    }

    return {
      hasValidUrl: false,
      rawText: trimmed,
    };
  } catch (err: any) {
    return {
      hasValidUrl: false,
      error: err?.name || 'ClipboardReadError',
    };
  }
}

/**
 * Backward compatibility helper for Facebook detection
 */
export async function detectFacebookUrlInClipboard(): Promise<ClipboardDetectResult> {
  return detectSocialUrlInClipboard('facebook');
}

/**
 * Backward compatibility helper for Twitter / X detection
 */
export async function detectTwitterUrlInClipboard(): Promise<ClipboardDetectResult> {
  return detectSocialUrlInClipboard('twitter');
}

/**
 * Backward compatibility helper for Pinterest detection
 */
export async function detectPinterestUrlInClipboard(): Promise<ClipboardDetectResult> {
  return detectSocialUrlInClipboard('pinterest');
}

/**
 * Backward compatibility helper for Reddit detection
 */
export async function detectRedditUrlInClipboard(): Promise<ClipboardDetectResult> {
  return detectSocialUrlInClipboard('reddit');
}

/**
 * Backward compatibility helper for Threads detection
 */
export async function detectThreadsUrlInClipboard(): Promise<ClipboardDetectResult> {
  return detectSocialUrlInClipboard('threads');
}

