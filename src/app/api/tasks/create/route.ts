// app/api/tasks/create/route.ts
import { NextResponse } from 'next/server';
import { createTask } from '@/features/tasks/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createTask(body);
    return NextResponse.json({ success: result.ok, task: result.task, error: result.error }, { status: result.ok ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error' }, { status: 500 });
  }
}

