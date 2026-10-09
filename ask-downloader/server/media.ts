/**
 * Media Library: every image the site uses, with where it is used and its
 * ALT text, so ALT can be reviewed and fixed in bulk.
 *
 * ALT lives where the image is used:
 *  - cover image  -> post.coverImageAlt (falls back to the title on the site)
 *  - in-post image -> the ![alt](url) markdown inside post.content
 */
import * as fsSync from 'fs';
import * as path from 'path';

export type Usage = { postId: string; postTitle: string; kind: 'cover' | 'inline' | 'site'; alt: string };
export type MediaItem = {
  url: string; name: string; local: boolean; bytes: number;
  uploadedAt: string; month: string; usages: Usage[];
  /** From the upload record, when the file came through the Media Library. */
  category?: string; originalName?: string; mime?: string; width?: number; height?: number;
};

/** What the upload records add to a listed file. */
export type MediaRecord = { url: string; category: string; originalName: string; mime: string; width?: number; height?: number; uploadedAt: string };
export type AltChange = { url: string; postId: string; kind: 'cover' | 'inline'; alt: string };

// Same pattern the post renderer uses, one image per line.
const IMG = /^!\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?\)(?:\{[a-z|]*\})?)$/;
// Older uploads are /uploads/<name>; newer ones /uploads/<year>/<month>/<name>.
const UPLOAD_REF = /\/uploads\/(?:\d{4}\/\d{2}\/)?[A-Za-z0-9._-]+/g;

/** ALT text that can sit safely inside ![...]: one line, no brackets. */
export const cleanAlt = (a: string) => String(a || '').replace(/[\[\]\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

export function buildMediaList(uploadsDir: string, posts: any[], siteJson: string, records: MediaRecord[] = []): MediaItem[] {
  const items = new Map<string, MediaItem>();
  const item = (url: string, fallbackDate: string) => {
    if (!items.has(url)) {
      const local = url.startsWith('/uploads/');
      items.set(url, {
        url, name: local ? path.basename(url) : url.split('/').pop()?.split('?')[0] || url,
        local, bytes: 0, uploadedAt: fallbackDate, month: fallbackDate.slice(0, 7), usages: [],
      });
    }
    return items.get(url)!;
  };

  // Every uploaded file, used or not, dated by when it was saved: the plain
  // files of older uploads and the <year>/<month>/ folders of newer ones.
  const addFolder = (rel: string) => {
    let names: string[] = [];
    try { names = fsSync.readdirSync(path.join(uploadsDir, rel)); } catch { return; }
    for (const name of names) {
      if (name.startsWith('.')) continue; // .incoming: uploads in progress
      const relName = rel ? `${rel}/${name}` : name;
      const st = fsSync.statSync(path.join(uploadsDir, relName));
      if (st.isDirectory()) {
        if (/^\d{4}(\/\d{2})?$/.test(relName)) addFolder(relName);
        continue;
      }
      if (!st.isFile()) continue;
      const it = item(`/uploads/${relName}`, st.mtime.toISOString());
      it.bytes = st.size;
      it.uploadedAt = st.mtime.toISOString();
      it.month = it.uploadedAt.slice(0, 7);
    }
  };
  addFolder('');

  for (const p of posts) {
    const date = String(p.publishedAt || '');
    if (p.coverImage && !String(p.coverImage).startsWith('data:')) {
      item(p.coverImage, date).usages.push({ postId: p.id, postTitle: p.title, kind: 'cover', alt: p.coverImageAlt || '' });
    }
    for (const line of String(p.content || '').split('\n')) {
      const m = line.trim().match(IMG);
      if (m) item(m[2], date).usages.push({ postId: p.id, postTitle: p.title, kind: 'inline', alt: m[1] });
    }
  }

  // A post's other images (its author photo) are named after the post.
  for (const p of posts) {
    for (const u of new Set(JSON.stringify({ ...p, coverImage: '', content: '' }).match(UPLOAD_REF) || [])) {
      const it = items.get(u);
      if (it && !it.usages.some((x) => x.postId === p.id)) {
        it.usages.push({ postId: p.id, postTitle: `Author photo — ${p.title}`, kind: 'site', alt: '' });
      }
    }
  }

  // Logos, avatars, share images: in use, so never offered for deletion.
  const siteRefs = new Set(siteJson.match(UPLOAD_REF) || []);
  for (const u of siteRefs) {
    const it = items.get(u);
    if (it && !it.usages.length) it.usages.push({ postId: '', postTitle: 'Site setting / profile', kind: 'site', alt: '' });
  }

  // Files uploaded through the Media Library carry their original name,
  // type, size in pixels and exact upload time.
  for (const r of records) {
    const it = items.get(r.url);
    if (!it) continue;
    Object.assign(it, {
      category: r.category, originalName: r.originalName, mime: r.mime,
      ...(r.width ? { width: r.width, height: r.height } : {}),
      uploadedAt: r.uploadedAt, month: r.uploadedAt.slice(0, 7),
    });
  }

  return [...items.values()].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Applies ALT edits to the posts list in place. Returns how many changed. */
export function applyAltChanges(posts: any[], changes: AltChange[]): number {
  let n = 0;
  for (const c of changes) {
    const post = posts.find((p) => p.id === c.postId);
    if (!post) continue;
    const alt = cleanAlt(c.alt);
    if (c.kind === 'cover') {
      if (post.coverImage === c.url && (post.coverImageAlt || '') !== alt) {
        post.coverImageAlt = alt;
        n++;
      }
      continue;
    }
    const lines = String(post.content || '').split('\n');
    let touched = false;
    const next = lines.map((line) => {
      const m = line.trim().match(IMG);
      if (!m || m[2] !== c.url || m[1] === alt) return line;
      touched = true;
      return `![${alt}](${m[2]}${m[3]}`;
    });
    if (touched) {
      post.content = next.join('\n');
      n++;
    }
  }
  return n;
}
