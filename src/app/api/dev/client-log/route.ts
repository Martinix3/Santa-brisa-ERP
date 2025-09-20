import { NextResponse } from 'next/server';
import { appendFile } from 'node:fs/promises';

const LOGFILE = '/tmp/sb-client-logs.ndjson';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const line = JSON.stringify({
      ts: Date.now(),
      path: body?.path || null,
      level: body?.level || 'error',
      type: body?.type || 'console.error',
      message: body?.message || '',
      stack: body?.stack || '',
      componentStack: body?.componentStack || ''
    }) + '\n';
    await appendFile(LOGFILE, line);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
