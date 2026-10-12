// Runs images through a small pool of workers. Phones get ONE at a time:
// a 12 MP photo needs ~100 MB while it is decoded and drawn, and cheap
// Android phones (4 GB) already struggled with heavy browser work on this site.
import type { Settings, WorkerReply } from './types';

const isPhone = () =>
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024));

export const PARALLEL = isPhone() ? 1 : Math.min(2, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));

type Task = { id: number; file: File; settings: Settings; onStart: () => void; resolve: (r: WorkerReply) => void };

export function createQueue() {
  const idle: Worker[] = [];
  const waiting: Task[] = [];
  let busy = 0;
  let nextId = 1;

  const spawn = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  const pump = () => {
    while (busy < PARALLEL && waiting.length) {
      const task = waiting.shift()!;
      const worker = idle.pop() || spawn();
      busy++;
      const finish = (reply: WorkerReply, broken = false) => {
        busy--;
        if (broken) worker.terminate();
        else idle.push(worker);
        task.resolve(reply);
        pump();
      };
      worker.onmessage = (e: MessageEvent<WorkerReply>) => finish(e.data);
      worker.onerror = () => finish({ id: task.id, ok: false, code: 'failed' }, true); // e.g. out of memory
      task.onStart();
      worker.postMessage({ id: task.id, file: task.file, settings: task.settings });
    }
  };

  return {
    run(file: File, settings: Settings, onStart: () => void = () => {}): Promise<WorkerReply> {
      return new Promise((resolve) => {
        waiting.push({ id: nextId++, file, settings, onStart, resolve });
        pump();
      });
    },
    /** Drops everything not started yet (Clear all). */
    clear() {
      waiting.length = 0;
    },
    dispose() {
      waiting.length = 0;
      idle.forEach((w) => w.terminate());
      idle.length = 0;
    },
  };
}
