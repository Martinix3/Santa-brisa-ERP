// This file is deprecated. The Traceability page has been moved to /quality/traceability.
// This file can be safely deleted.
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedTraceabilityPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/quality/traceability');
    }, [router]);
    return null;
}
