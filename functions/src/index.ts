import * as functions from 'firebase-functions';
import { santaBrainRun } from './ai/santaBrain.js';

export const santaBrain = functions
  .region('europe-west1')
  .https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
    // CORS simple (ajusta origen en prod)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const { userId, threadId, message } = req.body || {};
      if (!userId || !threadId || !message) {
        return res.status(400).json({ ok: false, error: 'Missing userId/threadId/message' });
      }
      const out = await santaBrainRun({ userId, threadId, message });
      return res.json({ ok: true, ...out });
    } catch (err: any) {
      console.error('[santaBrain] error', err);
      return res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
  });
