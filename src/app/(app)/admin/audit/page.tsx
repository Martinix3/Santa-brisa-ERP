// src/app/(app)/admin/audit/page.tsx
import { Metadata } from 'next';
import { DataAuditDashboard } from '@/features/admin/components/DataAuditDashboard';

export const metadata: Metadata = {
  title: 'Auditoría de Datos | Santa Brisa ERP',
  description: 'Dashboard de auditoría de integridad y calidad de datos'
};

export default function AuditPage() {
  return <DataAuditDashboard />;
}
