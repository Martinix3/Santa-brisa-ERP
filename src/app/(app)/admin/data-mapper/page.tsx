// src/app/(app)/admin/data-mapper/page.tsx
'use client';

import { PageShell } from '@/components/shared/PageShell';
import { DataMapperFlow } from '@/features/admin/components/DataMapperFlow';

export default function DataMapperPage() {
  return (
    <PageShell
      title="Mapeador de Datos"
      description="Conecta visualmente users, parties y accounts"
    >
      <DataMapperFlow />
    </PageShell>
  );
}
