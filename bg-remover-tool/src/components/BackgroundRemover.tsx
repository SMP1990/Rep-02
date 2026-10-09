// The whole tool: upload -> (first time: model download) -> processing -> result.
import { useCallback, useEffect, useRef, useState } from 'react';
import { en, type ErrorCode, type Strings } from '../i18n/en';
import { prepare, removeBackground, ToolError as EngineError } from '../lib/engine';
import { openImage } from '../lib/image';
import Dropzone from './Dropzone';
import ProgressCard from './ProgressCard';
import ResultView from './ResultView';
import ToolError from './ToolError';

type State =
  | { phase: 'idle' }
  | { phase: 'loading'; preview: string; download: number }
  | { phase: 'processing'; preview: string }
  | { phase: 'done'; preview: string; result: string; width: number; height: number; resized: boolean }
  | { phase: 'error'; code: ErrorCode };

const RETRY_SAME_FILE: ErrorCode[] = ['model-download-failed', 'processing-failed', 'out-of-memory'];

function outName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return `${base}-no-background.png`;
}

export default function BackgroundRemover({ t = en }: { t?: Strings }) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const file = useRef<File | null>(null);
  const run = useRef(0); // ignores results of a run the user has left
  const urls = useRef<string[]>([]);

  const freeUrls = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
  };
  const makeUrl = (b: Blob) => {
    const u = URL.createObjectURL(b);
    urls.current.push(u);
    return u;
  };

  const process = useCallback(async (f: File) => {
    const id = ++run.current;
    const live = () => id === run.current;
    freeUrls();
    file.current = f;
    const preview = makeUrl(f);
    try {
      const { bitmap, resized } = await openImage(f);
      setState({ phase: 'loading', preview, download: 0 });
      await prepare((p) => live() && setState({ phase: 'loading', preview, download: p }));
      if (!live()) return bitmap.close();
      setState({ phase: 'processing', preview });
      const { width, height } = bitmap;
      const res = await removeBackground(bitmap);
      if (!live()) return;
      setState({ phase: 'done', preview, result: makeUrl(res.png), width, height, resized });
    } catch (err) {
      if (!live()) return;
      const code = err instanceof EngineError ? (err.message as ErrorCode) : 'processing-failed';
      setState({ phase: 'error', code: code in t.errors ? code : 'processing-failed' });
    }
  }, [t]);

  const reset = () => {
    run.current++;
    freeUrls();
    file.current = null;
    setState({ phase: 'idle' });
  };

  // Paste an image from the clipboard while the upload box or a result shows.
  useEffect(() => {
    if (state.phase !== 'idle' && state.phase !== 'done') return;
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (item) process(item);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [state.phase, process]);

  useEffect(() => () => freeUrls(), []);

  return (
    <section className="mx-auto w-full max-w-3xl px-4" aria-label={t.title}>
      {state.phase === 'idle' && <Dropzone t={t} onFile={process} />}
      {state.phase === 'loading' && <ProgressCard t={t} download={state.download} preview={state.preview} />}
      {state.phase === 'processing' && <ProgressCard t={t} download={null} preview={state.preview} />}
      {state.phase === 'done' && (
        <ResultView
          t={t}
          before={state.preview}
          after={state.result}
          width={state.width}
          height={state.height}
          resized={state.resized}
          fileName={outName(file.current!)}
          onReset={reset}
        />
      )}
      {state.phase === 'error' && (
        <ToolError
          t={t}
          code={state.code}
          onRetry={() =>
            file.current && RETRY_SAME_FILE.includes(state.code) ? process(file.current) : reset()
          }
        />
      )}
    </section>
  );
}
