// src/app/api/firebase-config/route.ts

// This API route is no longer necessary as the Firebase configuration
// is now read directly from environment variables on the client.
// It is kept to prevent 404 errors from old client versions but can be
// safely removed in the future.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: false,
    error: "This endpoint is deprecated. Firebase config is now loaded directly on the client.",
  }, { status: 410 }); // 410 Gone
}
