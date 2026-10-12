// The list of images and their state. No thumbnails are kept: 20 decoded
// 12 MP photos would need gigabytes on a phone; the compare view decodes
// one image at a time.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createQueue } from './queue';
import { MAX_FILE_MB, MAX_FILES } from './files';
import type { Done, ErrorCode, Settings } from './types';

export type ItemError = ErrorCode | 'fileSize' | 'notImage';
export interface Item {
  key: number;
  file: File;
  status: 'waiting' | 'working' | 'done' | 'error';
  error?: ItemError;
  done?: Done;
  /** Settings this result was made with ("Compress again" when they change). */
  used: Settings;
}

const isImage = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name);

export function useCompressor(settings: Settings) {
  const [items, setItems] = useState<Item[]>([]);
  const [overLimit, setOverLimit] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const queue = useRef<ReturnType<typeof createQueue> | null>(null);
  const version = useRef(new Map<number, number>()); // drops results of removed/restarted jobs
  const nextKey = useRef(1);
  const count = useRef(0);

  useEffect(() => () => queue.current?.dispose(), []);

  const patch = (key: number, change: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...change } : it)));

  const start = useCallback((key: number, file: File, s: Settings) => {
    const v = (version.current.get(key) || 0) + 1;
    version.current.set(key, v);
    const live = () => version.current.get(key) === v;
    queue.current ??= createQueue();
    queue.current
      .run(file, s, () => live() && patch(key, { status: 'working' }))
      .then((r) => {
        if (!live()) return;
        if (r.ok) patch(key, { status: 'done', done: r.done, error: undefined });
        else patch(key, { status: 'error', error: r.code });
      });
  }, []);

  const add = useCallback((files: File[]) => {
    const room = MAX_FILES - count.current;
    setOverLimit(files.length > room);
    const fresh: Item[] = files.slice(0, Math.max(0, room)).map((file) => {
      const key = nextKey.current++;
      const error: ItemError | undefined = !isImage(file) ? 'notImage' : file.size > MAX_FILE_MB * 1024 * 1024 ? 'fileSize' : undefined;
      return { key, file, status: error ? 'error' : 'waiting', error, used: settings };
    });
    count.current += fresh.length;
    setItems((list) => [...list, ...fresh]);
    fresh.filter((it) => !it.error).forEach((it) => start(it.key, it.file, settings));
  }, [settings, start]);

  const remove = useCallback((key: number) => {
    version.current.delete(key);
    count.current--;
    setItems((list) => list.filter((it) => it.key !== key));
  }, []);

  const clear = useCallback(() => {
    queue.current?.clear();
    version.current.clear();
    count.current = 0;
    setOverLimit(false);
    setItems([]);
  }, []);

  /** Runs every compressible image again with the current settings. */
  const again = useCallback(() => {
    const redo = (it: Item) => it.error !== 'notImage' && it.error !== 'fileSize';
    itemsRef.current.filter(redo).forEach((it) => start(it.key, it.file, settings));
    setItems((list) =>
      list.map((it) => (redo(it) ? { ...it, status: 'waiting', done: undefined, error: undefined, used: settings } : it))
    );
  }, [settings, start]);

  return { items, overLimit, add, remove, clear, again };
}
