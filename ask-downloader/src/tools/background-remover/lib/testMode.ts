// Hidden test mode for checking the tool on a real phone: open the page with
// ?test=1 (normal) or ?test=2 (no background download when the page opens).
// It only shows numbers under the tool; without ?test nothing here runs.
import { inputSize, MODELS } from './models';

export const testMode: string | null = (() => {
  try {
    return new URLSearchParams(window.location.search).get('test');
  } catch {
    return null;
  }
})();

const opened = performance.now();
const lines: string[] = [];
let listener: ((lines: string[]) => void) | null = null;

export function testLog(text: string) {
  if (!testMode) return;
  lines.push(`${((performance.now() - opened) / 1000).toFixed(1)}s  ${text}`);
  listener?.([...lines]);
}

export function onTestLog(f: (lines: string[]) => void): () => void {
  listener = f;
  f([...lines]);
  return () => {
    listener = null;
  };
}

// Longest time the page did not draw a frame (= how long the screen froze).
let last = 0;
let maxGap = 0;
function frame(t: number) {
  if (last && t - last > maxGap) maxGap = t - last;
  last = t;
  requestAnimationFrame(frame);
}
export function resetFreeze() {
  maxGap = 0;
  last = 0;
}
export const freezeMs = () => Math.round(maxGap);

/** Whole page memory incl. the worker (Chrome, cross-origin isolated only). */
export async function logMemory() {
  const perf = performance as Performance & { measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }> };
  if (!perf.measureUserAgentSpecificMemory || !self.crossOriginIsolated) return testLog('memory: not available');
  try {
    const { bytes } = await perf.measureUserAgentSpecificMemory();
    testLog(`memory used by this page: ${Math.round(bytes / 1e6)} MB`);
  } catch {
    testLog('memory: not available');
  }
}

if (testMode) {
  requestAnimationFrame(frame);
  let loads = 1;
  try {
    loads = Number(sessionStorage.getItem('bgr-test-loads') || 0) + 1;
    sessionStorage.setItem('bgr-test-loads', String(loads));
  } catch {
    // no storage: count stays 1
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    gpu?: unknown;
    connection?: { effectiveType?: string; saveData?: boolean };
  };
  const navType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
  testLog(`test mode ${testMode}${testMode === '2' ? ' (no download on page open)' : ''}`);
  testLog(`page loads in this tab: ${loads} (${navType ?? '?'})`);
  testLog(`RAM ${nav.deviceMemory ?? '?'} GB, ${navigator.hardwareConcurrency} cores, GPU API ${nav.gpu ? 'yes' : 'no'}`);
  testLog(`isolated ${self.crossOriginIsolated}, net ${nav.connection?.effectiveType ?? '?'}${nav.connection?.saveData ? ' data-saver' : ''}, size ${inputSize(MODELS.fast)}`);
  testLog(navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 120));
}
