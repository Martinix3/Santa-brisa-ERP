import { NextResponse } from "next/server";
import { planProduction } from "@/app/(app)/production/actions";

export async function POST(req: Request) {
  try {
    const { bomId, plannedQty, name } = await req.json();
    const res = await planProduction({ bomId, plannedQty, name });
    return NextResponse.json(res);
  } catch (e:any) {
    return NextResponse.json({ ok:false, message:"Error al planificar" }, { status: 500 });
  }
}
