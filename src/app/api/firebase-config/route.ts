import { NextResponse } from 'next/server';
import { firebaseWebConfig } from '@/config/firebaseWebApp';

export async function GET() {
  try {
    if (!firebaseWebConfig.apiKey) {
      throw new Error("Firebase web config is not available in environment variables.");
    }
    return NextResponse.json(firebaseWebConfig);
  } catch (error: any) {
    console.error("Error serving Firebase config:", error);
    return NextResponse.json({ error: "Could not load Firebase configuration." }, { status: 500 });
  }
}
