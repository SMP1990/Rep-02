/**
 * Facebook Video Extraction Patterns
 * ------------------------------------------------------------
 * This is the ONE file to edit when Facebook changes its page
 * format and video downloads stop working. Facebook does not
 * offer an official API for this tool, so the extractor reads
 * these patterns out of Facebook's raw page HTML — and Facebook
 * can change that HTML at any time without notice.
 *
 * How to fix a broken extraction:
 * 1. Open a public Facebook video/reel URL in an incognito browser.
 * 2. View the page source (Ctrl+U / Cmd+Option+U) and search for
 *    terms like "hd_src", "playable_url", or "video_url".
 * 3. Note the new key name and the URL pattern that surrounds it.
 * 4. Add a new regex to HD_VIDEO_PATTERNS or SD_VIDEO_PATTERNS
 *    below, following the same format as the existing entries.
 *    Put the newest/most likely pattern first in the list.
 * 5. Rebuild and test with a real public video URL before deploying.
 *
 * Patterns are tried top to bottom, and the extractor stops at the
 * first one that matches — so old patterns are safe to leave in
 * place even after new ones are added, in case Facebook serves a
 * different page version to different users or regions.
 * ------------------------------------------------------------
 */

// Patterns that indicate a full HD (1080p) direct video stream URL
export const HD_VIDEO_PATTERNS: RegExp[] = [
  /"browser_native_hd_url":"(https:[^"]+)"/,
  /"playable_url_quality_hd":"(https:[^"]+)"/,
  /hd_src:"(https:[^"]+)"/,
  /"hd_src":"(https:[^"]+)"/,
  /hd_src_no_ratelimit:"(https:[^"]+)"/,
  /"hd_src_no_ratelimit":"(https:[^"]+)"/,
  /"video_url_hd":"(https:[^"]+)"/,
];

// Patterns that indicate a standard-definition direct video stream URL
export const SD_VIDEO_PATTERNS: RegExp[] = [
  /"browser_native_sd_url":"(https:[^"]+)"/,
  /"playable_url":"(https:[^"]+)"/,
  /sd_src:"(https:[^"]+)"/,
  /"sd_src":"(https:[^"]+)"/,
  /sd_src_no_ratelimit:"(https:[^"]+)"/,
  /"sd_src_no_ratelimit":"(https:[^"]+)"/,
  /"video_url":"(https:[^"]+)"/,
];

// Text fragments Facebook shows when a video is private, restricted,
// removed, or requires login. If Facebook changes this wording,
// add the new phrase here (as a plain, case-sensitive substring).
export const PRIVATE_OR_UNAVAILABLE_INDICATORS: string[] = [
  'You must log in to continue',
  "This content isn't available right now",
  'This video has been removed',
  'The link you followed may be broken',
];
