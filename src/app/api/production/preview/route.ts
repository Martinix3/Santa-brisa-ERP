import { NextResponse } from "next/server";
import { previewPlanning } from "@/server/actions/production.actions";

export async function POST(req: Request) {
  try {
    const { bomId, plannedQty } = await req.json();
    const res = await previewPlanning({ bomId, plannedQty });
    return NextResponse.json(res);
  } catch (e:any) {
    return NextResponse.json({ ok:false, message:"Error en preview" }, { status: 500 });
  }
}
