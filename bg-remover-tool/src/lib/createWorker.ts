// The model worker as a separate file (normal build and the site).
export default function createWorker(): Worker {
  return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
}
