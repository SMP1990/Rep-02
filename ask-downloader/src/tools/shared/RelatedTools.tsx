// "More free tools": real <a href> links from a tool page to the site's other
// live tools (internal links for visitors and search engines). The list,
// icons and names come from the home tiles (config/tools.ts, t.toolsHub), so
// a new tool shows up here on its own.
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAdmin } from '../../context/AdminContext';
import { TOOL_TILES } from '../../config/tools';
import { PageLink, ROUTE_PATHS } from '../../components/PageLink';

export default function RelatedTools({ current, title }: { current: string; title: string }) {
  const { t, currentLangInfo } = useLanguage();
  const { setCurrentRoute } = useAdmin();
  const words = t.toolsHub;
  const rtl = currentLangInfo?.dir === 'rtl';
  const tools = TOOL_TILES.filter((tool) => tool.route && tool.id !== current);
  if (!tools.length) return null;

  return (
    <section className="mx-auto mt-14 w-full max-w-5xl px-4 sm:mt-20">
      <h2 className="mb-6 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {tools.map(({ id, icon: Icon, route, fullLoad, titleKey, descKey }) => (
          <li key={id}>
            <PageLink
              href={ROUTE_PATHS[route!]}
              onNavigate={() => (fullLoad ? window.location.assign(ROUTE_PATHS[route!]) : setCurrentRoute(route!))}
              className="group flex h-full items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a78bda] hover:shadow-lg dark:border-slate-800/80 dark:bg-[#181224] dark:hover:border-[#6d46b8]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6d46b8] to-[#e6799f] text-white shadow-md shadow-[#6d46b8]/25">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900 group-hover:text-[#6d46b8] dark:text-white dark:group-hover:text-[#d1b9f7]">{words[titleKey!]}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-400">{words[descKey!]}</span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 text-[#6d46b8] transition-transform dark:text-[#d1b9f7] ${rtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}
              />
            </PageLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
