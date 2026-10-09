// The whole tool: upload -> (first time: model download) -> processing -> result.
// The fast model is fetched in the background as soon as the page has loaded.
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { en, type ErrorCode, type Strings } from '../i18n/en';
import { prepare, removeBackground, ToolError as EngineError } from '../lib/engine';
import { combineMasks } from '../lib/combine';
import { serverAvailable, serverMask } from '../lib/serverEngine';
import { openImage } from '../lib/image';
import type { ModelId } from '../lib/models';
import Dropzone from './Dropzone';
import ProgressCard from './ProgressCard';
import ResultView from './ResultView';
import ToolError from './ToolError';
import TestPanel from './TestPanel';
import { freezeMs, logMemory, resetFreeze, testLog, testMode } from '../lib/testMode';

type State =
  | { phase: 'idle' }
  | { phase: 'loading'; model: ModelId; preview: string; download: number }
  | { phase: 'processing'; model: ModelId; preview: string }
  | {
      phase: 'done';
      model: ModelId;
      preview: string;
      image: ImageBitmap;
      mask: Uint8ClampedArray;
      resized: boolean;
      /** Shown above the result, e.g. when "better results" failed. */
      notice?: ErrorCode;
    }
  | { phase: 'error'; code: ErrorCode };

const RETRY_SAME_FILE: ErrorCode[] = ['model-download-failed', 'processing-failed', 'out-of-memory'];

function outName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return `${base}-no-background`;
}

export default function BackgroundRemover({ t = en }: { t?: Strings }) {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const file = useRef<File | null>(null);
  const run = useRef(0); // ignores results of a run the user has left
  const urls = useRef<string[]>([]);
  const kept = useRef<ImageBitmap | null>(null); // the photo shown in the result
  const shown = useRef<{ preview: string; resized: boolean }>({ preview: '', resized: false });
  const fastMask = useRef<Uint8ClampedArray | null>(null); // base for the HD pass

  const freeImage = () => {
    kept.current?.close();
    kept.current = null;
  };

  const freeUrls = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
  };
  const makeUrl = (b: Blob) => {
    const u = URL.createObjectURL(b);
    urls.current.push(u);
    return u;
  };

  const fail = useCallback(
    (err: unknown) => {
      const code = err instanceof EngineError ? (err.message as ErrorCode) : 'processing-failed';
      setState({ phase: 'error', code: code in t.errors ? code : 'processing-failed' });
    },
    [t],
  );

  /** Model download (if needed) + mask for the kept photo. */
  const runModel = useCallback(async (model: ModelId, live: () => boolean) => {
    const bitmap = kept.current!;
    const { preview, resized } = shown.current;
    const started = performance.now();
    resetFreeze();
    let mask: Uint8ClampedArray | null = null;
    if (await serverAvailable()) {
      setState({ phase: 'processing', model, preview });
      mask = await serverMask(bitmap, model);
      if (!live()) return;
      testLog(mask ? `${model} done on the server` : `${model}: server could not, using the browser`);
    }
    if (!mask) {
      setState({ phase: 'loading', model, preview, download: 0 });
      await prepare(model, (p) => live() && setState({ phase: 'loading', model, preview, download: p }));
      if (!live()) return;
      setState({ phase: 'processing', model, preview });
      // The worker gets its own copy; this one stays for editing and export.
      mask = (await removeBackground(await createImageBitmap(bitmap), model)).mask;
      if (!live()) return;
    }
    if (model === 'fast') fastMask.current = mask;
    else if (fastMask.current) mask = combineMasks(fastMask.current, mask);
    setState({ phase: 'done', model, preview, image: bitmap, mask, resized });
    if (testMode) {
      testLog(`${model} result shown after ${((performance.now() - started) / 1000).toFixed(1)}s, longest freeze ${freezeMs()}ms`);
      logMemory();
    }
  }, []);

  const process = useCallback(async (f: File) => {
    const id = ++run.current;
    const live = () => id === run.current;
    freeUrls();
    freeImage();
    fastMask.current = null;
    file.current = f;
    const preview = makeUrl(f);
    testLog(`photo chosen (${(f.size / 1e6).toFixed(1)} MB)`);
    try {
      const { bitmap, resized } = await openImage(f);
      if (!live()) return bitmap.close();
      kept.current = bitmap; // closed by freeImage(), whatever happens next
      shown.current = { preview, resized };
      await runModel('fast', live);
    } catch (err) {
      if (live()) fail(err);
    }
  }, [fail, runModel]);

  // Start fetching the fast model while the user is still picking a photo.
  // (Only when the server cannot do the work: then the browser needs the model.)
  const warmed = useRef(false);
  const warmUp = useCallback(() => {
    serverAvailable().then((server) => {
      if (server) return;
      if (!warmed.current) testLog('download started');
      warmed.current = true;
      prepare('fast').catch(() => {}); // a real attempt will show any error
    });
  }, []);

  // Whoever opens this page has come to use it: fetch the fast model in the
  // background once the page has loaded, so the first photo waits less.
  // Not with Data Saver on or on a very slow connection: there it still
  // starts as soon as the user goes to pick a photo (warmUp above).
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType ?? '') || testMode === '2') return;
    let timer = 0;
    const later = () => {
      timer = window.setTimeout(warmUp, 1500);
    };
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later, { once: true });
    return () => {
      window.removeEventListener('load', later);
      clearTimeout(timer);
    };
  }, [warmUp]);

  /** "Need better results?": same photo through the stronger model. */
  const improve = useCallback(async () => {
    const image = kept.current;
    const mask = fastMask.current;
    if (!image || !mask) return;
    const id = ++run.current;
    const live = () => id === run.current;
    try {
      await runModel('hd', live);
    } catch (err) {
      if (!live()) return;
      // Keep the first result on screen and say what went wrong.
      const code = err instanceof EngineError ? (err.message as ErrorCode) : 'processing-failed';
      const { preview, resized } = shown.current;
      setState({
        phase: 'done', model: 'fast', preview, image, mask, resized,
        notice: code in t.errors ? code : 'processing-failed',
      });
    }
  }, [runModel, t]);

  const reset = () => {
    run.current++;
    freeUrls();
    freeImage();
    fastMask.current = null;
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

  useEffect(
    () => () => {
      freeUrls();
      freeImage();
    },
    [],
  );

  return (
    <section className="mx-auto w-full max-w-3xl px-4" aria-label={t.title}>
      {state.phase === 'idle' && <Dropzone t={t} onFile={process} onWarmUp={warmUp} />}
      {(state.phase === 'loading' || state.phase === 'processing') && (
        // One card from download to result, so the bar never jumps back.
        <Fragment key={state.model}>
          <ProgressCard
            t={t}
            model={state.model}
            download={state.phase === 'loading' ? state.download : null}
            preview={state.preview}
          />
        </Fragment>
      )}
      {state.phase === 'done' && (
        // A new key when the HD result arrives: the result view starts fresh.
        <Fragment key={state.model}>
          <ResultView
            t={t}
            hd={state.model === 'hd'}
            notice={state.notice}
            onImprove={improve}
            image={state.image}
            mask={state.mask}
            before={state.preview}
            resized={state.resized}
            fileName={outName(file.current!)}
            onReset={reset}
          />
        </Fragment>
      )}
      {state.phase === 'error' && (
        <ToolError
          t={t}
          code={state.code}
          onRetry={() => {
            if (!file.current || !RETRY_SAME_FILE.includes(state.code)) reset();
            else process(file.current);
          }}
        />
      )}
      {testMode && <TestPanel />}
    </section>
  );
}
