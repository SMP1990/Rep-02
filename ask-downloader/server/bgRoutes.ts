/** Routes of the server-side Background Remover (see bgRemover.ts). */
import express, { type Express, type Request, type Response } from 'express';
import { BgBadInput, BgBusy, bgAvailable, bgSizes, isBgModel, prefetchBgModels, removeBgOnServer } from './bgRemover.ts';

export function registerBgRoutes(app: Express) {
  app.get('/api/tools/remove-bg/status', (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store').json({ available: bgAvailable(), sizes: bgSizes() });
  });

  app.post(
    '/api/tools/remove-bg',
    express.raw({ type: 'image/jpeg', limit: '3mb' }),
    async (req: Request, res: Response): Promise<any> => {
      const model = req.query.model;
      if (!isBgModel(model) || !Buffer.isBuffer(req.body) || !req.body.length) {
        return res.status(400).json({ error: 'bad-request' });
      }
      try {
        const mask = await removeBgOnServer(model, req.body);
        res.set({ 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'gzip', 'Cache-Control': 'no-store' });
        res.send(mask);
      } catch (err: any) {
        if (err instanceof BgBadInput) return res.status(400).json({ error: 'bad-image' });
        if (err instanceof BgBusy) return res.status(503).json({ error: 'busy' });
        console.error('[bg-remover] failed:', err?.message);
        res.status(500).json({ error: 'failed' });
      }
    },
  );
}

export { prefetchBgModels };
