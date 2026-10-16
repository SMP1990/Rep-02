/**
 * Early download hints for the home page.
 *
 * The home page's code is loaded on demand, so the browser only learns about
 * it after the main script has downloaded and run — a second round trip on
 * a slow phone. These <link rel="modulepreload"> tags name those files in the
 * HTML itself, so both arrive together. They only change *when* files
 * download; if the build manifest is missing, no tags are added and the page
 * loads exactly as before.
 */
import * as fs from 'fs';
import * as path from 'path';

const HOME_PAGE_MODULE = 'src/pages/PublicHomePage.tsx';

let homeTags: string | null = null;

export function homePreloadTags(distPath: string): string {
  if (homeTags !== null) return homeTags;
  homeTags = '';
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(distPath, '.vite', 'manifest.json'), 'utf8'));
    const entry: any = Object.values(manifest).find((c: any) => c?.isEntry);
    // index.html already preloads the main script and its own imports.
    const alreadyLoaded = new Set<string>(entry?.imports || []);
    const seen = new Set<string>();
    const files: string[] = [];
    const walk = (key: string) => {
      const chunk = manifest[key];
      if (!chunk || seen.has(key) || chunk.isEntry) return;
      seen.add(key);
      if (!alreadyLoaded.has(key) && /\.js$/.test(chunk.file)) files.push(chunk.file);
      for (const dep of chunk.imports || []) walk(dep);
    };
    walk(HOME_PAGE_MODULE);
    homeTags = files.map((f) => `    <link rel="modulepreload" crossorigin href="/${f}">\n`).join('');
  } catch {
    // No manifest (e.g. dev mode): keep the page as it was.
  }
  return homeTags;
}
