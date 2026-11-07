import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import type { Strings } from './i18n/index.ts';

type Props = {
  src: string;
  title: string;
  creator: string;
  t: Strings;
  /** Open the previous / next sound. A button is greyed out when its handler is missing. */
  onPrev?: () => void;
  onNext?: () => void;
  /** Start playing as soon as the page opens (the visitor just pressed Play in a list). */
  autoPlay?: boolean;
};

const BARS = [0.5, 0.8, 0.4, 0.9, 0.6, 1, 0.55, 0.85, 0.45, 0.75, 0.5];
const clock = (s: number) => {
  const n = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

/**
 * The player of a sound page: a dark card in the site's colours with a speaker that vibrates
 * lightly while the sound plays, waveform bars, a seek bar with the played / total time, and
 * Previous / Play-Pause / Next. The audio element itself is hidden; this card controls it.
 * (Media controls stay left-to-right in every language, as on a phone.)
 */
export const SoundPlayer: React.FC<Props> = ({ src, title, creator, t, onPrev, onNext, autoPlay }) => {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const a = audio.current;
    if (autoPlay) a?.play().catch(() => {}); // if the browser blocks it, the Play button is still there
    return () => { a?.pause(); };
  }, [autoPlay]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false)); else a.pause();
  };
  const seek = (v: number) => {
    if (audio.current) audio.current.currentTime = v;
    setNow(v);
  };
  const go = (fn?: () => void) => { audio.current?.pause(); fn?.(); };
  const pct = total > 0 ? Math.min(100, (now / total) * 100) : 0;

  const side = 'w-11 h-11 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5b84b] transition';

  return (
    <div className="mx-auto w-full max-w-sm rounded-[28px] p-[2px] bg-gradient-to-br from-[#e6799f] via-[#a78bda] to-[#f5b84b] shadow-xl shadow-[#341d5b]/30">
      <div className="rounded-[26px] bg-gradient-to-b from-[#3a2166] via-[#271349] to-[#150b2b] text-white px-6 pt-5 pb-6" dir="ltr">
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => setTotal(e.currentTarget.duration)}
          onDurationChange={(e) => setTotal(e.currentTarget.duration)}
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setNow(0); }}
          onError={() => setPlaying(false)}
        />

        {/* waveform */}
        <div className="flex items-end justify-center gap-1 h-7" aria-hidden="true">
          {BARS.map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full bg-[#f5b84b] ${playing ? 'sp-bar' : ''}`}
              style={{ height: `${h * 100}%`, animationDelay: `${(i % 5) * 0.12}s` }}
            />
          ))}
        </div>

        {/* speaker */}
        <div className="relative mx-auto my-5 w-28 h-28 flex items-center justify-center" aria-hidden="true">
          {playing && <span className="sp-ring absolute inset-2 rounded-full border-2 border-[#f5b84b]/60" />}
          <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br from-[#6d46b8] to-[#341d5b] border border-white/15 shadow-inner shadow-black/40 flex items-center justify-center ${playing ? 'sp-vibe' : ''}`}>
            <Volume2 className="w-11 h-11 text-[#f5b84b]" />
          </div>
        </div>

        {/* name */}
        <div className="text-center" dir="auto">
          <h1 className="font-heading text-xl font-bold leading-snug break-words">{title}</h1>
          <p className="text-sm text-white/60 mt-0.5 break-words">{creator}</p>
        </div>

        {/* seek bar and time */}
        <div className="mt-5">
          <input
            type="range"
            className="sp-range w-full"
            min={0}
            max={total || 0}
            step={0.1}
            value={Math.min(now, total || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label={t.seek}
            style={{ background: `linear-gradient(to right, #f5b84b ${pct}%, rgba(255,255,255,0.22) ${pct}%)` }}
          />
          <div className="mt-1.5 flex justify-between text-xs text-white/60 tabular-nums">
            <span>{clock(now)}</span>
            <span>{clock(total)}</span>
          </div>
        </div>

        {/* controls */}
        <div className="mt-3 flex items-center justify-center gap-6">
          <button type="button" className={side} onClick={() => go(onPrev)} disabled={!onPrev} aria-label={t.prev}>
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? t.pause : t.play}
            aria-pressed={playing}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f5b84b] to-[#e6799f] text-[#261447] flex items-center justify-center shadow-lg shadow-black/40 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-transform"
          >
            {playing ? <Pause className="w-7 h-7" fill="currentColor" /> : <Play className="w-7 h-7 translate-x-0.5" fill="currentColor" />}
          </button>
          <button type="button" className={side} onClick={() => go(onNext)} disabled={!onNext} aria-label={t.next}>
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
