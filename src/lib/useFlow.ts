
export type Flow = "DIRECT" | "PLACEMENT";

export function readFlowFrom(anyParams?: Record<string, any>): Flow {
  const f = (anyParams?.flow ?? "").toString().toUpperCase();
  return f === "PLACEMENT" ? "PLACEMENT" : "DIRECT";
}
