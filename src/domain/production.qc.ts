// domain/production.qc.ts - QC specs + helpers
import { FlaskConical, Thermometer, TestTube2, Beaker } from 'lucide-react';
import type { QCResult } from './ssot';

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
  // Producto Terminado
  'SB-750': {
    ph: { label: 'pH', min: 3.2, max: 3.8, icon: TestTube2, unit: '' },
    density: { label: 'Densidad', min: 1.04, max: 1.06, icon: FlaskConical, unit: 'g/L' },
    temperature: { label: 'Temperatura', min: 18, max: 22, icon: Thermometer, unit: '°C' },
    organoleptic: { label: 'Cata Organoléptica', icon: Beaker, unit: 'desc' },
  },
  'MERCH-VAS': {
    visual_check: { label: 'Inspección Visual', min: 1, max: 1, icon: TestTube2, unit: 'ok/ko' },
  },
  // Materias Primas
  'RM-AGAVE-MV': {
    purity: { label: 'Pureza Agave', min: 99.5, max: 100, icon: TestTube2, unit: '%' },
    organoleptic: { label: 'Cata Organoléptica', icon: Beaker, unit: 'desc' },
  },
  'RM-NARANJA-JA': {
    alcohol_vol: { label: 'Grado Alcohólico', min: 39.8, max: 40.2, icon: FlaskConical, unit: '%vol' },
    sugar: { label: 'Azúcares', min: 80, max: 85, icon: Beaker, unit: 'g/L' },
    organoleptic: { label: 'Cata Organoléptica', icon: Beaker, unit: 'desc' },
  },
  'RM-AGAVESYRUP-DC': {
    brix: { label: 'Grados Brix', min: 74, max: 76, icon: TestTube2, unit: '°Bx' },
    organoleptic: { label: 'Cata Organoléptica', icon: Beaker, unit: 'desc' },
  },
  'RM-LEMON-UI': {
    acidity: { label: 'Acidez (cítrico)', min: 4.5, max: 5.5, icon: TestTube2, unit: '%' },
    organoleptic: { label: 'Cata Organoléptica', icon: Beaker, unit: 'desc' },
  },
  'RM-CITRIC-SA': {
    purity: { label: 'Pureza', min: 99.8, max: 100, icon: TestTube2, unit: '%' },
  },
  'RM-CITRATE-SA': {
    purity: { label: 'Pureza', min: 99.0, max: 100, icon: TestTube2, unit: '%' },
  },
  'RM-SORBATE-SA': {
    purity: { label: 'Pureza', min: 99.0, max: 100, icon: TestTube2, unit: '%' },
  },
  'RM-ASCORBIC-SA': {
    purity: { label: 'Pureza', min: 99.5, max: 100, icon: TestTube2, unit: '%' },
  },
  'RM-COFFEE-DA': {
    organoleptic: { label: 'Perfil Aromático', icon: Beaker, unit: 'desc' },
  },
  // Material de Embalaje
  'PKG-BOTTLE-PILOT': {
    visual_check: { label: 'Inspección Visual', icon: Beaker, unit: 'desc' },
    dimensions: { label: 'Dimensiones (altura)', min: 228, max: 232, icon: TestTube2, unit: 'mm' },
  },
  'PKG-TAPON-CARCOAL': {
    visual_check: { label: 'Inspección Visual', icon: Beaker, unit: 'desc' },
    torque: { label: 'Test de Torsión', min: 1.0, max: 1.5, icon: TestTube2, unit: 'Nm' },
  },
  'PKG-CAJA-6B': {
    visual_check: { label: 'Inspección Visual', icon: Beaker, unit: 'desc' },
    resistance: { label: 'Resistencia Compresión', min: 250, max: 500, icon: TestTube2, unit: 'kgf' },
  },
  'PKG-CAPSULA-PREC': {
    visual_check: { label: 'Inspección Visual', icon: Beaker, unit: 'desc' },
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
      if (Number(result.value) < paramSpec.min || Number(result.value) > paramSpec.max) {
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
