/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/features/bom/useBomForm.ts
"use client";
import { useEffect, useMemo, useState, useRef } from "react";

type FieldErrors = Record<string, string>;

function toDotPath(p: string) {
  // "items[0].quantity" -> "items.0.quantity"
  return p.replace(/\[(\d+)\]/g, ".$1");
}

function setByPath(obj: any, path: string, value: any) {
  const segs = path.replace(/\]/g, "").split(/[.[]/g);
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const key = segs[i];
    const nextKey = segs[i + 1];
    const isNextIndex = /^\d+$/.test(nextKey);
    if (cur[key] == null) cur[key] = isNextIndex ? [] : {};
    cur = cur[key];
  }
  cur[segs[segs.length - 1]] = value;
}

export function useBomForm<T = any>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors | undefined>();
  const [lastError, setLastError] = useState<string | undefined>();
  const [initialSnapshot, setInitialSnapshot] = useState<T>(initial);
  
  // ✅ Usar ref para detectar cambios reales en el ID, no en la referencia del objeto
  const prevIdRef = useRef<string | undefined>(undefined);
  const currentId = (initial as any)?.id;

  // if initialValues changes (opening a different recipe), reset the form
  useEffect(() => {
    // Solo resetear si el ID realmente cambió
    if (currentId !== prevIdRef.current) {
      setValues(initial);
      setInitialSnapshot(initial);
      setFieldErrors(undefined);
      setLastError(undefined);
      prevIdRef.current = currentId;
    }
  }, [initial, currentId]);

  function set<K extends string>(path: K, value: any) {
    setValues((v: any) => {
      const copy = structuredClone ? structuredClone(v) : JSON.parse(JSON.stringify(v));
      setByPath(copy, path as string, value);
      return copy;
    });
    setFieldErrors(e => {
      if (!e) return e;
      const copy = { ...e };
      delete copy[toDotPath(path)]; // clear error associated with this field
      return copy;
    });
  }

  const reset = () => {
    setValues(initialSnapshot);
    setFieldErrors(undefined);
    setLastError(undefined);
  };

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialSnapshot),
    [values, initialSnapshot]
  );

  return { values, set, saving, setSaving, fieldErrors, setFieldErrors, lastError, setLastError, dirty, reset };
}
