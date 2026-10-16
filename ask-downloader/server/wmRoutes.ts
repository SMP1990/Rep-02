/**
 * Routes of the image watermark remover (see wmRemover.ts).
 * POST /api/tools/watermark/image, body (application/octet-stream):
 *   4 bytes: length N of the JPEG (big-endian), N bytes JPEG crop,
 *   then the mask: gzip of width*height bytes (255 = remove).
 * Reply: the JPEG crop with the watermark area filled in.
 *
 * Video (see wmVideo.ts): POST /api/tools/watermark/video?boxes=x,y,w,h;...&name=&size=
 * -> { id, chunk }; PUT .../video/:id?offset= with each 8 MB piece; POST
 * .../video/:id/start; GET .../video/:id -> state and progress;
 * GET .../video/:id/file -> the result; DELETE .../video/:id cancels.
 */
import express, { type Express, type Request, type Response } from 'express';
import * as zlib from 'zlib';
import { WmBadInput, WmBusy, prefetchWmModel, removeWatermarkOnServer, wmAvailable, wmQueue } from './wmRemover.ts';
import { CHUNK, VideoBad, addVideoChunk, cancelVideo, createVideoJob, startVideoJob, videoAvailable, videoFile, videoJob, type Box } from './wmVideo.ts';

const MAX_MASK = 1_200_000; // the crop is at most ~1 MP

export function registerWmRoutes(app: Express) {
  app.get('/api/tools/watermark/status', async (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store').json({ image: wmAvailable(), waiting: wmQueue(), video: await videoAvailable() });
  });

  app.post(
    '/api/tools/watermark/image',
    express.raw({ type: 'application/octet-stream', limit: '6mb' }),
    async (req: Request, res: Response): Promise<any> => {
      res.set('Cache-Control', 'no-store');
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length < 8) return res.status(400).json({ error: 'bad-request' });
      const n = body.readUInt32BE(0);
      if (n < 4 || 4 + n >= body.length) return res.status(400).json({ error: 'bad-request' });
      let mask: Buffer;
      try {
        mask = zlib.gunzipSync(body.subarray(4 + n), { maxOutputLength: MAX_MASK });
      } catch {
        return res.status(400).json({ error: 'bad-request' });
      }
      try {
        const out = await removeWatermarkOnServer(body.subarray(4, 4 + n), mask);
        res.set('Content-Type', 'image/jpeg').send(Buffer.from(out));
      } catch (err: any) {
        if (err instanceof WmBadInput) return res.status(400).json({ error: 'bad-image' });
        if (err instanceof WmBusy) return res.status(503).json({ error: wmAvailable() ? 'busy' : 'unavailable' });
        console.error('[wm-remover] failed:', err?.message);
        res.status(500).json({ error: 'failed' });
      }
    },
  );
  registerVideoRoutes(app);
}

function parseBoxes(v: unknown): Box[] | null {
  if (typeof v !== 'string' || v.length > 400) return null;
  const boxes = v.split(';').filter(Boolean).map((p) => {
    const [x, y, w, h] = p.split(',').map(Number);
    return { x, y, w, h };
  });
  const ok = boxes.length > 0 && boxes.length <= 20 && boxes.every((b) => [b.x, b.y, b.w, b.h].every((n) => Number.isFinite(n) && n >= 0 && n < 20000) && b.w >= 2 && b.h >= 2);
  return ok ? boxes : null;
}

const ID = /^[0-9a-f]{32}$/;

function registerVideoRoutes(app: Express) {
  const fail = (res: Response, err: any): any => {
    if (err instanceof VideoBad) {
      const code = err.message === 'too big' ? 'too-big' : err.message === 'not a video' ? 'bad-video' : 'bad-upload';
      return res.status(code === 'too-big' ? 413 : 400).json({ error: code });
    }
    if (err?.message === 'unavailable') return res.status(503).json({ error: 'unavailable' });
    console.error('[wm-video] failed:', err?.message);
    res.status(500).json({ error: 'failed' });
  };

  app.post('/api/tools/watermark/video', async (req: Request, res: Response): Promise<any> => {
    res.set('Cache-Control', 'no-store');
    const boxes = parseBoxes(req.query.boxes);
    if (!boxes) return res.status(400).json({ error: 'bad-boxes' });
    const name = String(req.query.name || 'video').replace(/\.[^.]*$/, '').replace(/[^\w\- ]+/g, '').slice(0, 60) || 'video';
    try {
      res.json({ id: await createVideoJob(name, boxes, Number(req.query.size)), chunk: CHUNK });
    } catch (err) { fail(res, err); }
  });

  app.put(
    '/api/tools/watermark/video/:id',
    express.raw({ type: 'application/octet-stream', limit: CHUNK + 1024 }),
    async (req: Request, res: Response): Promise<any> => {
      res.set('Cache-Control', 'no-store');
      if (!ID.test(req.params.id) || !Buffer.isBuffer(req.body)) return res.status(400).json({ error: 'bad-upload' });
      try {
        res.json({ received: await addVideoChunk(req.params.id, Number(req.query.offset), req.body) });
      } catch (err) { fail(res, err); }
    },
  );

  app.post('/api/tools/watermark/video/:id/start', async (req: Request, res: Response): Promise<any> => {
    res.set('Cache-Control', 'no-store');
    if (!ID.test(req.params.id)) return res.status(400).json({ error: 'bad-upload' });
    try {
      await startVideoJob(req.params.id);
      res.json(videoJob(req.params.id));
    } catch (err) { fail(res, err); }
  });

  app.get('/api/tools/watermark/video/:id', (req: Request, res: Response): any => {
    res.set('Cache-Control', 'no-store');
    const j = ID.test(req.params.id) ? videoJob(req.params.id) : null;
    return j ? res.json(j) : res.status(404).json({ error: 'not-found' });
  });

  app.get('/api/tools/watermark/video/:id/file', (req: Request, res: Response): any => {
    const f = ID.test(req.params.id) ? videoFile(req.params.id) : null;
    if (!f) return res.status(404).json({ error: 'not-found' });
    res.set({ 'Cache-Control': 'no-store', 'Content-Type': 'video/mp4' });
    res.download(f.path, `${f.name}-no-watermark.mp4`, (err) => { if (!err) f.done(); });
  });

  app.delete('/api/tools/watermark/video/:id', (req: Request, res: Response): any => {
    res.set('Cache-Control', 'no-store');
    return ID.test(req.params.id) && cancelVideo(req.params.id) ? res.json({ ok: true }) : res.status(404).json({ error: 'not-found' });
  });
}

export { prefetchWmModel };
