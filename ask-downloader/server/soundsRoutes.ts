/** Admin-only routes of the Trending Sounds collector. Nothing public. */
import type { Express, Request, RequestHandler, Response } from 'express';
import { fetchMp3, mp3Status, runSoundsJob, setSoundStatus, setSoundsEnabled, setSoundsSettings, soundsList, soundsStatus } from './trendingSounds.ts';

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

  /** Small status of the approved sounds' MP3s (the admin page asks this every second or two while one is saving). */
  app.get('/api/admin/sounds/mp3status', canView, (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store').json({ mp3: mp3Status() });
  });

  /** "Try again" for the MP3 of one approved sound; answers at once, the download runs in the background. */
  app.post('/api/admin/sounds/mp3', canEdit, (req: Request, res: Response) => {
    const id = String(req.body?.id || '');
    const s = soundsList().find((x) => x.id === id);
    if (!s || s.status !== 'approved') return void res.status(400).json({ success: false, sounds: soundsList() });
    if (!s.file && !s.mp3Busy) void fetchMp3(id);
    res.json({ success: true, sounds: soundsList() });
  });

  app.post('/api/admin/sounds/status', canEdit, (req: Request, res: Response) => {
    const ok = setSoundStatus(String(req.body?.id || ''), req.body?.status);
    res.status(ok ? 200 : 400).json({ success: ok, sounds: soundsList() });
  });
}
