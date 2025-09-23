import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG || "{}");
    if (!config.apiKey) {
      throw new Error("Firebase web config is not available in environment variables.");
    }
    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Error serving Firebase config:", error);
    return NextResponse.json({ error: "Could not load Firebase configuration." }, { status: 500 });
  }
}
