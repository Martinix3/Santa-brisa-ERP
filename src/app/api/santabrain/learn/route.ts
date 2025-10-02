// src/app/api/santabrain/learn/route.ts
import { NextResponse } from 'next/server';
import { learnCorrection } from '@/features/santabrain/lib/knowledge';

export async function POST(req: Request) {
  const body = await req.json();
  const saved = await learnCorrection(body);
  return NextResponse.json(saved);
}
