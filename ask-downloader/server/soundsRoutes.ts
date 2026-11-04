/** Admin-only routes of the Trending Sounds collector (step A). Nothing public. */
import type { Express, Request, RequestHandler, Response } from 'express';
import { runSoundsJob, setSoundsEnabled, soundsList, soundsStatus } from './trendingSounds.ts';

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
}
