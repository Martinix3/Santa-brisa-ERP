
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const mem:any = globalThis as any;
  mem._secrets ??= {};
  delete mem._secrets[provider];
  // TODO: en Firestore elimina integrationCredentials y marca integrations.status='disconnected'
  return NextResponse.json({ ok:true });
}
