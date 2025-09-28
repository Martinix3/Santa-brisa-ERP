// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // If the request is for the root path, redirect to the personal dashboard.
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard-personal', request.url));
  }

  // Allow other requests to proceed.
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/',
};
