
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedIntegrationsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/integrations');
    }, [router]);

    return (
        <div className="p-6">
            <p>Esta página ha sido movida. Redirigiendo a /admin/integrations...</p>
        </div>
    );
}
