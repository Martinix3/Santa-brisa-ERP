// src/features/bom/useBomForm.ts
"use client";
import { useState, useMemo } from "react";
import type { FieldErrors } from "@/lib/result";

export function useBomForm(initial: any) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors|undefined>();
  const [lastError, setLastError] = useState<string|undefined>();
  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initial), [values, initial]);

  function set<K extends string>(path: K, value: any) {
    setValues((v: any) => {
      const copy = structuredClone(v);
      // soporta paths como "items[0].quantity"
      const segs = path.replace(/\]/g,"").split(/[.[]/g);
      let cur: any = copy;
      for (let i=0;i<segs.length-1;i++) cur = cur[segs[i]];
      cur[segs[segs.length-1]] = value;
      return copy;
    });
    setFieldErrors(e => {
      if (!e) return e;
      const copy = { ...e }; delete copy[path]; return copy;
    });
  }

  return { values, set, saving, setSaving, fieldErrors, setFieldErrors, lastError, setLastError, dirty };
}
