// The compression thread: the page never freezes while an image is encoded.
// Named worker.ts on purpose: the built file (assets/worker-*.js) gets the
// server's tool-worker headers, which allow WebAssembly (server.ts).
import { compress, Fail } from './encode';
import type { Settings, WorkerReply } from './types';

self.onmessage = async (e: MessageEvent<{ id: number; file: File; settings: Settings }>) => {
  const { id, file, settings } = e.data;
  let reply: WorkerReply;
  try {
    reply = { id, ok: true, done: await compress(file, settings) };
  } catch (err) {
    reply = { id, ok: false, code: err instanceof Fail ? err.code : 'failed' };
  }
  (self as unknown as Worker).postMessage(reply);
};
