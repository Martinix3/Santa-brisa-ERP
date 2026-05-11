/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { PipelineClient } from './PipelineClient';

export const metadata = {
  title: 'Pipeline de Ventas | Santa Brisa ERP',
  description: 'Gestión de oportunidades y seguimiento de cuentas',
};

export default function PipelinePage() {
  return <PipelineClient />;
}
