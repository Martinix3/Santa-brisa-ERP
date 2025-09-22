import { onRequest } from 'firebase-functions/v2/https';
import { santaBrainRun } from './ai/santaBrain';

export const santaBrain = onRequest(
  { region: 'europe-west1', cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const { userId, threadId, message } = req.body || {};
      if (!userId || !threadId || !message) {
        res.status(400).json({ ok: false, error: 'Missing userId/threadId/message' });
        return;
      }
      const out = await santaBrainRun({ userId, threadId, message });
      res.json({ ok: true, ...out });
    } catch (err: any) {
      console.error('[santaBrain] error', err);
      res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
  }
);
