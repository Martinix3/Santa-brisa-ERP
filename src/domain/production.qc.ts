// domain/production.qc.ts - QC specs + helpers
import { FlaskConical, Thermometer, TestTube2, Beaker } from 'lucide-react';
import type { QCResult } from './ssot.core';

type QCParam = {
  label: string;
  icon: React.ElementType;
  min: number;
  max: number;
  unit?: string;
} | {
  label: string;
  icon: React.ElementType;
  unit?: 'desc';
};

type QCSpec = Record<string, QCParam>;

export const QC_PARAMS: Record<string, QCSpec> = {
  'SB-750': {
    ph: { label: 'pH', min: 3.2, max: 3.8, icon: TestTube2, unit: '' },
    density: { label: 'Densidad', min: 1.04, max: 1.06, icon: FlaskConical, unit: 'g/L' },
    temperature: { label: 'Temperatura', min: 18, max: 22, icon: Thermometer, unit: '°C' },
    organoleptic: { label: 'Cata Organoléptica', icon: Beaker, unit: 'desc' },
  },
  'MERCH-VAS': {
    visual_check: { label: 'Inspección Visual', min: 1, max: 1, icon: TestTube2, unit: 'ok/ko' },
  }
};

export type QCKey = keyof typeof QC_PARAMS['SB-750'];

// Helpers para validar resultados contra especificaciones
export function validateQC(results: Record<string, QCResult>, spec: QCSpec): { valid: boolean, details: Record<string, boolean> } {
  const details: Record<string, boolean> = {};
  let allValid = true;

  for (const key in spec) {
    const paramSpec = spec[key];
    const result = results[key];
    let isValid = true;

    if ('min' in paramSpec && result?.value !== undefined) {
      if (result.value < paramSpec.min || result.value > paramSpec.max) {
        isValid = false;
      }
    }
    // Añadir más lógica de validación si es necesario
    
    details[key] = isValid;
    if (!isValid) {
      allValid = false;
    }
  }

  return { valid: allValid, details };
}
