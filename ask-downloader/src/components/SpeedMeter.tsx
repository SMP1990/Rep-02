import React, { useEffect, useState, useMemo } from 'react';
import { Gauge, Zap, Activity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface SpeedMeterProps {
  speedBytesPerSec: number;
  bytesLoaded: number;
  totalBytes: number;
  etaSeconds: number | null;
  status: 'idle' | 'connecting' | 'downloading' | 'assembling' | 'completed' | 'error';
  isAudio?: boolean;
}

export const SpeedMeter: React.FC<SpeedMeterProps> = ({
  speedBytesPerSec,
  status,
}) => {
  const { t } = useLanguage();
  const [peakSpeedMBps, setPeakSpeedMBps] = useState<number>(0);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);

  // Calculate current speed in MegaBytes per second (MB/s)
  const currentSpeedMBps = useMemo(() => {
    if (!speedBytesPerSec || speedBytesPerSec <= 0 || status === 'connecting') {
      return 0;
    }
    return speedBytesPerSec / (1024 * 1024);
  }, [speedBytesPerSec, status]);

  const currentSpeedKBps = useMemo(() => {
    if (!speedBytesPerSec || speedBytesPerSec <= 0) return 0;
    return speedBytesPerSec / 1024;
  }, [speedBytesPerSec]);

  // Track peak speed and live speed history points
  useEffect(() => {
    if (status === 'connecting' || status === 'idle') {
      setPeakSpeedMBps(0);
      setSpeedHistory([]);
      return;
    }

    if (currentSpeedMBps > 0) {
      setPeakSpeedMBps((prev) => Math.max(prev, currentSpeedMBps));
      setSpeedHistory((prev) => {
        const next = [...prev, currentSpeedMBps];
        return next.length > 14 ? next.slice(next.length - 14) : next;
      });
    }
  }, [currentSpeedMBps, status]);

  // Dynamic maximum speed scale (auto-adjusts to user's bandwidth)
  const maxScale = useMemo(() => {
    const highest = Math.max(peakSpeedMBps, currentSpeedMBps);
    if (highest <= 3) return 5;
    if (highest <= 8) return 10;
    if (highest <= 18) return 20;
    if (highest <= 35) return 40;
    return Math.ceil(highest / 20) * 20;
  }, [peakSpeedMBps, currentSpeedMBps]);

  // Normalized speed ratio (0 to 1)
  const speedRatio = Math.min(1, Math.max(0, currentSpeedMBps / maxScale));

  // Gauge needle rotation angle from -90° (0 MB/s) to +90° (maxScale MB/s)
  const needleAngle = -90 + speedRatio * 180;

  // Active LED segments count (0 to 10)
  const activeSegments = Math.min(10, Math.ceil(speedRatio * 10));

  // Determine speed tier status
  const speedTier = useMemo(() => {
    if (status === 'connecting') {
      return { label: t.speedMeter?.connecting || 'Connecting to CDN...', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' };
    }
    if (status === 'assembling') {
      return { label: t.speedMeter?.assembling || 'Assembling file...', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
    }
    if (status === 'completed') {
      return { label: 'Complete', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    }
    if (currentSpeedMBps >= 6.0) {
      return { label: t.speedMeter?.speedRatingTurbo || 'Turbo Speed', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
    }
    if (currentSpeedMBps >= 1.5) {
      return { label: t.speedMeter?.speedRatingFast || 'High Speed', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
    }
    return { label: t.speedMeter?.speedRatingOptimal || 'Optimal Speed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  }, [currentSpeedMBps, status, t]);

  // Average speed calculated from recorded history
  const averageSpeedMBps = useMemo(() => {
    if (speedHistory.length === 0) return 0;
    const sum = speedHistory.reduce((acc, val) => acc + val, 0);
    return sum / speedHistory.length;
  }, [speedHistory]);

  return (
    <div 
      id="visual-speed-meter"
      className="bg-gradient-to-b from-slate-50/90 via-blue-50/20 to-slate-50/90 rounded-xl p-3 border border-slate-200/90 shadow-2xs space-y-2.5 transition-all"
    >
      {/* Top Header of Speed Meter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center text-blue-600">
            <Gauge className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>{t.speedMeter?.title || 'Download Speed Meter'}</span>
            {status === 'downloading' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            )}
          </span>
        </div>

        {/* Speed Tier & Peak Telemetry */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${speedTier.bg} ${speedTier.color} ${speedTier.border} flex items-center gap-1`}>
            <Zap className="w-2.5 h-2.5" />
            <span>{speedTier.label}</span>
          </span>

          {peakSpeedMBps > 0 && (
            <span className="hidden sm:inline-flex text-[10px] font-semibold text-slate-500 bg-white dark:bg-[#181224] px-1.5 py-0.5 rounded border border-slate-200">
              {t.speedMeter?.peak || 'Peak'}: <strong className="text-slate-800 ml-0.5 font-mono">{peakSpeedMBps.toFixed(1)}</strong> {t.speedMeter?.mbps || 'MB/s'}
            </span>
          )}
        </div>
      </div>

      {/* Main Gauge & Big Digital Readout Area */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Left: Semicircular Speedometer Dial */}
        <div className="sm:col-span-6 flex flex-col items-center justify-center relative pt-1">
          <div className="relative w-36 h-20 flex items-end justify-center overflow-hidden">
            {/* SVG Speedometer Gauge */}
            <svg 
              viewBox="0 0 120 70" 
              className="w-full h-full drop-shadow-xs"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="speedMeterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="45%" stopColor="#06b6d4" />
                  <stop offset="80%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>

              {/* Background Arc Track (180 degrees) */}
              <path
                d="M 15 65 A 45 45 0 0 1 105 65"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="9"
                strokeLinecap="round"
              />

              {/* Foreground Colored Active Arc */}
              <path
                d="M 15 65 A 45 45 0 0 1 105 65"
                fill="none"
                stroke="url(#speedMeterGradient)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray="141.37"
                strokeDashoffset={141.37 * (1 - speedRatio)}
                className="transition-all duration-300 ease-out"
              />

              {/* Scale Tick Labels */}
              <text x="14" y="69" fontSize="6.5" fill="#64748b" fontWeight="600" textAnchor="middle">0</text>
              <text x="60" y="24" fontSize="6" fill="#94a3b8" fontWeight="600" textAnchor="middle">{(maxScale / 2).toFixed(0)}</text>
              <text x="106" y="69" fontSize="6.5" fill="#64748b" fontWeight="600" textAnchor="middle">{maxScale}</text>
            </svg>

            {/* Needle Pivot & Indicator Line */}
            <div 
              className="absolute bottom-0 w-1 h-12 origin-bottom transition-transform duration-300 ease-out z-10"
              style={{
                transform: `rotate(${needleAngle}deg)`,
                left: 'calc(50% - 2px)',
              }}
            >
              <div className="w-1 h-10 bg-slate-800 rounded-t-full shadow-md relative">
                {/* Needle accent tip */}
                <div className="w-1 h-3 bg-red-500 rounded-t-full" />
              </div>
            </div>

            {/* Central Pivot Cap */}
            <div className="absolute bottom-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-md z-20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            </div>
          </div>

          {/* Scale range subtitle */}
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            0 - {maxScale} {t.speedMeter?.mbps || 'MB/s'}
          </div>
        </div>

        {/* Right: Big Numeric Speed Value & Telemetry */}
        <div className="sm:col-span-6 flex flex-col justify-center space-y-1.5 bg-white/80 p-2.5 rounded-lg border border-slate-200/80">
          <div className="flex items-baseline gap-1.5">
            <span 
              id="download-speed-value"
              className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-slate-900"
            >
              {currentSpeedMBps.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              {t.speedMeter?.mbps || 'MB/s'}
            </span>
          </div>

          {/* KB/s secondary helper if low speed */}
          {currentSpeedMBps > 0 && currentSpeedMBps < 1.0 && (
            <div className="text-[10px] text-slate-500 font-medium">
              ~{Math.round(currentSpeedKBps)} KB/s
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 text-[10px]">
            <div className="text-slate-500">
              <span className="block text-[9px] uppercase font-semibold text-slate-400">{t.speedMeter?.peak || 'Peak'}</span>
              <span className="font-bold text-slate-700 font-mono">
                {peakSpeedMBps > 0 ? `${peakSpeedMBps.toFixed(2)} ${t.speedMeter?.mbps || 'MB/s'}` : '--'}
              </span>
            </div>
            <div className="text-slate-500">
              <span className="block text-[9px] uppercase font-semibold text-slate-400">{t.speedMeter?.average || 'Average'}</span>
              <span className="font-bold text-slate-700 font-mono">
                {averageSpeedMBps > 0 ? `${averageSpeedMBps.toFixed(2)} ${t.speedMeter?.mbps || 'MB/s'}` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Multi-Segment LED VU Speed Intensity Bar */}
      <div className="space-y-1 pt-0.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-blue-500" />
            <span>{t.ui.intensity}</span>
          </span>
          <span className="font-mono text-slate-600">
            {activeSegments} / 10
          </span>
        </div>

        {/* 10 Gradient Segment Blocks */}
        <div className="grid grid-cols-10 gap-1 h-2">
          {Array.from({ length: 10 }).map((_, index) => {
            const isLit = index < activeSegments;
            let segmentColor = 'bg-slate-200';
            if (isLit) {
              if (index < 4) segmentColor = 'bg-blue-500 shadow-xs shadow-blue-500/40';
              else if (index < 7) segmentColor = 'bg-cyan-500 shadow-xs shadow-cyan-500/40';
              else if (index < 9) segmentColor = 'bg-emerald-500 shadow-xs shadow-emerald-500/40';
              else segmentColor = 'bg-amber-500 shadow-xs shadow-amber-500/50';
            }
            return (
              <div
                key={index}
                className={`h-full rounded-sm transition-all duration-200 ${segmentColor}`}
              />
            );
          })}
        </div>
      </div>

      {/* Live Sparkline History Wave (if active samples exist) */}
      {speedHistory.length > 2 && status === 'downloading' && (
        <div className="pt-1 flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            {t.ui.liveStream}
          </span>
          <div className="flex-1 h-3 flex items-end gap-0.5">
            {speedHistory.map((speed, i) => {
              const heightPercent = Math.min(100, Math.max(15, Math.round((speed / maxScale) * 100)));
              return (
                <div
                  key={i}
                  style={{ height: `${heightPercent}%` }}
                  className="flex-1 bg-blue-400/80 hover:bg-blue-500 rounded-t-xs transition-all duration-150"
                  title={`${speed.toFixed(2)} MB/s`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
