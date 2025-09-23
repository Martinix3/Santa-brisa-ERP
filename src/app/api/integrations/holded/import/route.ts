import { NextResponse } from 'next/server';
import { enqueue } from '@/server/queue/queue';

export async function POST(req: Request) {
  const { scope = ['contacts','purchases'], dryRun = false } = await req.json().catch(() => ({}));

  // encolamos primera página de cada scope
  const jobs = [];
  if (scope.includes('contacts'))  jobs.push(enqueue({ kind:'SYNC_HOLDED_CONTACTS',  payload:{ page:1, dryRun }, maxAttempts:3 }));
  if (scope.includes('purchases')) jobs.push(enqueue({ kind:'SYNC_HOLDED_PURCHASES', payload:{ page:1, dryRun }, maxAttempts:3 }));
  if (scope.includes('products'))  jobs.push(enqueue({ kind:'SYNC_HOLDED_PRODUCTS',  payload:{ page:1, dryRun }, maxAttempts:3 }));

  await Promise.all(jobs);
  return NextResponse.json({ ok:true, enqueued: scope, dryRun });
}
