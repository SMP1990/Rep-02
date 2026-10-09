// Step 1 check page: load the model, run one photo, show time and result.
// Temporary: replaced by the real tool UI in step 2.
import { useState } from 'react';
import { loadModel } from './lib/model';
import { computeMask, cutout } from './lib/removeBackground';

export default function ModelTest() {
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<string>('');
  const add = (s: string) => setLog((l) => [...l, s]);

  async function onFile(file: File) {
    try {
      let t = performance.now();
      const { backend } = await loadModel();
      add(`model ready on ${backend} in ${Math.round(performance.now() - t)}ms`);
      const img = await createImageBitmap(file);
      t = performance.now();
      const mask = await computeMask(img);
      add(`[${(await loadModel()).backend}] mask ${img.width}x${img.height} in ${Math.round(performance.now() - t)}ms`);
      const blob = await cutout(img, mask);
      setResult(URL.createObjectURL(blob));
      add('done');
    } catch (e) {
      add(`error: ${(e as Error).message}`);
    }
  }

  return (
    <main className="p-6 font-sans">
      <h1 className="text-xl font-bold mb-4">Model test</h1>
      <input
        data-testid="file"
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <pre data-testid="log" className="mt-4 text-sm">{log.join('\n')}</pre>
      {result && <img data-testid="out" src={result} className="mt-4 max-w-md bg-gray-200" alt="" />}
    </main>
  );
}
