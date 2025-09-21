
import * as functions from 'firebase-functions';
import { santaBrainRun } from './ai/santaBrain.js';

export const santaBrain = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    // CORS simple (ajusta origen en prod)
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).send('');

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
