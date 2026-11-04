/** Admin-only routes of the Trending Sounds collector. Nothing public. */
import type { Express, Request, RequestHandler, Response } from 'express';
import { runSoundsJob, setSoundStatus, setSoundsEnabled, setSoundsSettings, soundsList, soundsStatus } from './trendingSounds.ts';

export function registerSoundsRoutes(app: Express, canView: RequestHandler, canEdit: RequestHandler) {
  app.get('/api/admin/sounds', canView, (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store').json({ status: soundsStatus(), sounds: soundsList() });
  });

  app.post('/api/admin/sounds/enabled', canEdit, (req: Request, res: Response) => {
    setSoundsEnabled(req.body?.enabled === true);
    res.json({ success: true, status: soundsStatus() });
  });

  app.post('/api/admin/sounds/run', canEdit, (_req: Request, res: Response) => {
    void runSoundsJob();
    res.json({ success: true, status: soundsStatus() });
  });

  app.post('/api/admin/sounds/settings', canEdit, (req: Request, res: Response) => {
    setSoundsSettings(req.body);
    res.json({ success: true, status: soundsStatus(), sounds: soundsList() });
  });

  app.post('/api/admin/sounds/status', canEdit, (req: Request, res: Response) => {
    const ok = setSoundStatus(String(req.body?.id || ''), req.body?.status);
    res.status(ok ? 200 : 400).json({ success: ok, sounds: soundsList() });
  });
}
