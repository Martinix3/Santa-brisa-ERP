import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { 
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
  try {
    // In a real app, this would write to a database.
    // For now, we just log it to the server console.
    console.log("Received data to persist from Santa Brain:");
    console.log(JSON.stringify(req.body, null, 2));
    
    // Simulate a successful save
    res.status(200).json({ ok: true, message: 'Entities saved (logged to server console).' });
  } catch (e:any) {
    console.error('Error in brain-persist API:', e);
    res.status(500).json({ ok:false, error: e?.message || 'Unknown server error.' });
  }
}
