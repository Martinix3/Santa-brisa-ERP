// src/lib/useFlow.ts
"use client";

import { useSearchParams } from 'next/navigation';

export type Flow = "DIRECT" | "PLACEMENT";

export function useFlow(): Flow {
    const searchParams = useSearchParams();
    const flowParam = searchParams.get('flow')?.toUpperCase();
    return flowParam === 'DIRECT' ? 'DIRECT' : 'PLACEMENT';
}
