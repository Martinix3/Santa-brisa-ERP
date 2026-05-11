/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// FILE: src/app/(app)/work/page.tsx
// ============================================================================
// WORK HUB - Página Principal del Sistema Unificado Tasks + Projects
// ============================================================================

import { Metadata } from 'next';
import { WorkHubClient } from './WorkHubClient';

export const metadata: Metadata = {
  title: 'Trabajo | Santa Brisa ERP',
  description: 'Sistema unificado de tareas y proyectos con Gemini Intelligence',
};

export default function WorkPage() {
  return <WorkHubClient />;
}
