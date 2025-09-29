
"use client";
import { use } from 'react';

export type Flow = "DIRECT" | "PLACEMENT";

/**
 * Reads the 'flow' parameter from searchParams using React.use() to be compliant with Next.js App Router.
 * Defaults to "DIRECT" if the flow parameter is not "PLACEMENT".
 * @param anyParams The searchParams object from a page component.
 * @returns The resolved flow: "DIRECT" or "PLACEMENT".
 */
export function readFlowFrom(anyParams?: Record<string, any>): Flow {
  const unwrappedParams = anyParams ? use(Promise.resolve(anyParams)) : {};
  const f = (unwrappedParams?.flow ?? "").toString().toUpperCase();
  return f === "PLACEMENT" ? "PLACEMENT" : "DIRECT";
}
