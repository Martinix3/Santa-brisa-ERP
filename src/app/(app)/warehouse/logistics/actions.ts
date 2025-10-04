'use server';
export type ActionResult<T=unknown> = { ok: true; data?: T; message?: string } | { ok: false; message: string };
export async function createManualShipment(..._a:any[]): Promise<ActionResult<{ id:string }>>{ 
  return { ok:true, data:{ id:'stub-shipment' } }; 
}
export async function validateShipment(..._a:any[]): Promise<ActionResult>{ 
  return { ok:true, message:'stub' }; 
}
