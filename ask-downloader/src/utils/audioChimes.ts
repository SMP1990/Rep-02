/**
 * Web Audio API Synthesizers for Real-Time Admin Alerts
 * Generates pleasant, latency-free acoustic chimes without external sound assets.
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Play a bright, crisp two-tone ascending chime for Video Download completion
 * (F#5 ~739.99 Hz -> C#6 ~1108.73 Hz with soft marimba envelope)
 */
export function playVideoDownloadChime(volume = 0.16): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(volume, now);
    master.connect(ctx.destination);

    // Note 1: F#5 (739.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(739.99, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.7, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc1.connect(gain1);
    gain1.connect(master);
    osc1.start(now);
    osc1.stop(now + 0.27);

    // Note 2: C#6 (1108.73 Hz) - Crisp high resolution
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1108.73, now + 0.09);

    gain2.gain.setValueAtTime(0, now + 0.09);
    gain2.gain.linearRampToValueAtTime(0.85, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(master);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.46);

    // Overtone sparkle (2217.46 Hz)
    const sparkle = ctx.createOscillator();
    const sparkGain = ctx.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(2217.46, now + 0.09);

    sparkGain.gain.setValueAtTime(0, now + 0.09);
    sparkGain.gain.linearRampToValueAtTime(0.2, now + 0.11);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    sparkle.connect(sparkGain);
    sparkGain.connect(master);
    sparkle.start(now + 0.09);
    sparkle.stop(now + 0.36);
  } catch {
    // Gracefully ignore audio synthesis errors
  }
}

/**
 * Play a warm, mellow three-tone chime for New Comment Submission
 * (A4 ~440 Hz -> C#5 ~554.37 Hz -> E5 ~659.25 Hz with acoustic bell warmth)
 */
export function playNewCommentChime(volume = 0.16): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(volume, now);
    master.connect(ctx.destination);

    // Note 1: A4 (440 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle'; // warmer timbre
    osc1.frequency.setValueAtTime(440, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.6, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(master);
    osc1.start(now);
    osc1.stop(now + 0.26);

    // Note 2: C#5 (554.37 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(554.37, now + 0.08);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.65, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc2.connect(gain2);
    gain2.connect(master);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.36);

    // Note 3: E5 (659.25 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(659.25, now + 0.16);

    gain3.gain.setValueAtTime(0, now + 0.16);
    gain3.gain.linearRampToValueAtTime(0.8, now + 0.18);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

    osc3.connect(gain3);
    gain3.connect(master);
    osc3.start(now + 0.16);
    osc3.stop(now + 0.53);
  } catch {
    // Gracefully ignore audio synthesis errors
  }
}
