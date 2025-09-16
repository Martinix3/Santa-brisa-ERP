// src/app/api/pdf/route.ts
import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const runtime = 'nodejs'; // o 'edge' si no usas Playwright

export async function POST(req: Request) {
  const { html } = await req.json();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdf = await page.pdf();
  await browser.close();
  return new NextResponse(pdf, {
    headers: { 'Content-Type': 'application/pdf' }
  });
}
