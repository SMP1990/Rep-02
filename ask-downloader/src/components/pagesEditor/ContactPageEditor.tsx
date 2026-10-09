import React from 'react';

const field = 'w-full px-3 py-2 text-xs rounded-xl border border-[#eae3ee] dark:border-[#2e1d4d] bg-white dark:bg-[#181224] text-[#2e2440] dark:text-white outline-hidden focus:border-[#7c4fd1]';

const FIELDS = [
  { k: 'heading', label: 'Page heading', area: false },
  { k: 'intro', label: 'Intro paragraph', area: true },
  { k: 'responseTime', label: 'Response time note', area: false },
  { k: 'officeNote', label: 'Extra note (optional)', area: false },
];

/** Content Editor -> Pages -> Contact. The email, phone and social links come from Settings. */
export const ContactPageEditor: React.FC<{ value: any; onChange: (next: any) => void }> = ({ value, onChange }) => (
  <div>
    {FIELDS.map((f) => (
      <div key={f.k} className="mb-3">
        <label htmlFor={`contact-${f.k}`} className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1">{f.label}</label>
        {f.area ? (
          <textarea id={`contact-${f.k}`} rows={3} value={value[f.k]} onChange={(e) => onChange({ ...value, [f.k]: e.target.value })} className={field} />
        ) : (
          <input id={`contact-${f.k}`} value={value[f.k]} onChange={(e) => onChange({ ...value, [f.k]: e.target.value })} className={field} />
        )}
      </div>
    ))}
    <p className="text-[11px] text-[#726c85] dark:text-[#b5a9cd]">The email, phone and social links come from Settings.</p>
  </div>
);
