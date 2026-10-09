import React from 'react';
import type { BlogLanguage } from '../config/blogLanguages.ts';

/**
 * Flags drawn as inline SVG, one per blog language.
 *
 * Emoji flags (🇵🇰) are not an option: Windows ships no flag-emoji font, so
 * Chrome and Edge fall back to the bare region letters — "PK", "GB", "ES" —
 * which is exactly what a visitor on Windows would see. Drawing them means
 * every device shows a real flag, with no font, image request or CDN involved.
 *
 * Each flag uses a 3:2 viewBox so they all line up at any size.
 */

const Star = ({ cx, cy, r, fill = '#fff' }: { cx: number; cy: number; r: number; fill?: string }) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r / 2.4;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return <polygon points={pts.join(' ')} fill={fill} />;
};

/** India's Ashoka Chakra — a ring plus evenly spaced spokes. */
const Chakra = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <g stroke="#0A3D91" strokeWidth={0.7} fill="none">
    <circle cx={cx} cy={cy} r={r} />
    <circle cx={cx} cy={cy} r={r / 4} fill="#0A3D91" stroke="none" />
    {Array.from({ length: 12 }).map((_, i) => {
      const a = (Math.PI / 6) * i;
      return (
        <line
          key={i}
          x1={cx + (r / 4) * Math.cos(a)}
          y1={cy + (r / 4) * Math.sin(a)}
          x2={cx + r * Math.cos(a)}
          y2={cy + r * Math.sin(a)}
        />
      );
    })}
  </g>
);

const FLAGS: Record<BlogLanguage, React.ReactNode> = {
  // United Kingdom
  en: (
    <>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#C8102E" strokeWidth="3.5" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="7.5" />
    </>
  ),
  // Spain
  es: (
    <>
      <rect width="60" height="40" fill="#AA151B" />
      <rect y="10" width="60" height="20" fill="#F1BF00" />
    </>
  ),
  // Saudi Arabia
  ar: (
    <>
      <rect width="60" height="40" fill="#006C35" />
      <rect x="12" y="24" width="36" height="2.4" rx="1.2" fill="#fff" />
      <polygon points="12,25.2 8,22.6 8,27.8" fill="#fff" />
      <rect x="13" y="14" width="34" height="2.6" rx="1.3" fill="#fff" />
    </>
  ),
  // Portugal
  pt: (
    <>
      <rect width="60" height="40" fill="#DA291C" />
      <rect width="24" height="40" fill="#046A38" />
      <circle cx="24" cy="20" r="8" fill="#FFE900" stroke="#046A38" strokeWidth="0.8" />
      <circle cx="24" cy="20" r="5" fill="#DA291C" stroke="#fff" strokeWidth="0.8" />
    </>
  ),
  // Indonesia
  id: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect width="60" height="20" fill="#CE1126" />
    </>
  ),
  // Japan
  ja: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <circle cx="30" cy="20" r="11" fill="#BC002D" />
    </>
  ),
  // France
  fr: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect width="20" height="40" fill="#002395" />
      <rect x="40" width="20" height="40" fill="#ED2939" />
    </>
  ),
  // Russia
  ru: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect y="13.33" width="60" height="13.34" fill="#0039A6" />
      <rect y="26.67" width="60" height="13.33" fill="#D52B1E" />
    </>
  ),
  // Germany
  de: (
    <>
      <rect width="60" height="40" fill="#000" />
      <rect y="13.33" width="60" height="13.34" fill="#DD0000" />
      <rect y="26.67" width="60" height="13.33" fill="#FFCE00" />
    </>
  ),
  // Pakistan
  ur: (
    <>
      <rect width="60" height="40" fill="#01411C" />
      <rect width="15" height="40" fill="#fff" />
      <circle cx="38" cy="20" r="9.5" fill="#fff" />
      <circle cx="41.5" cy="17.5" r="8.5" fill="#01411C" />
      <Star cx={45} cy={12.5} r={4} />
    </>
  ),
  // India
  hi: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect width="60" height="13.33" fill="#FF9933" />
      <rect y="26.67" width="60" height="13.33" fill="#138808" />
      <Chakra cx={30} cy={20} r={5.6} />
    </>
  ),
};

interface FlagIconProps {
  code: BlogLanguage;
  /** Accessible label; omit for decorative use next to visible text. */
  title?: string;
  className?: string;
}

export const FlagIcon: React.FC<FlagIconProps> = ({ code, title, className = '' }) => (
  <svg
    viewBox="0 0 60 40"
    role={title ? 'img' : 'presentation'}
    aria-hidden={title ? undefined : true}
    className={className}
    preserveAspectRatio="none"
  >
    {title ? <title>{title}</title> : null}
    {FLAGS[code] ?? FLAGS.en}
  </svg>
);
