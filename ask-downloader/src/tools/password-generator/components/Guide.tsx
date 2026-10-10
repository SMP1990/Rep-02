// The Password Generator's "How to" steps and FAQ.
import { Copy, KeyRound, SlidersHorizontal } from 'lucide-react';
import ToolGuide from '../../shared/ToolGuide';
import type { Strings } from '../i18n/en';

export function faqItems(t: Strings) {
  return [1, 2, 3, 4, 5].map((n) => ({
    question: t[`faq${n}Q` as keyof Strings] as string,
    answer: t[`faq${n}A` as keyof Strings] as string,
  }));
}

export default function Guide({ t, faq = faqItems(t) }: { t: Strings; faq?: { question: string; answer: string }[] }) {
  return (
    <ToolGuide
      howTitle={t.howTitle}
      steps={[
        { icon: SlidersHorizontal, title: t.step1Title, desc: t.step1Desc },
        { icon: KeyRound, title: t.step2Title, desc: t.step2Desc },
        { icon: Copy, title: t.step3Title, desc: t.step3Desc },
      ]}
      faqTitle={t.faqTitle}
      faq={faq}
    />
  );
}
