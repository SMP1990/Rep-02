// Single-file preview build only: the worker is embedded in the HTML page.
import InlineWorker from './worker.ts?worker&inline';

export default function createWorker(): Worker {
  return new InlineWorker();
}
