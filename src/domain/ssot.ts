// ============================================================================
// SSOT COMPATIBILITY LAYER - TEMPORARY FILE
// ============================================================================
//
// Este archivo RE-EXPORTA todo de SSOT v6 (antiguo) temporalmente
// para mantener la compatibilidad mientras migramos módulo por módulo.
//
// ⚠️ ARCHIVO TEMPORAL - Será eliminado cuando la migración esté completa
//
// REGLAS:
// - Código NUEVO debe usar: import { ... } from '@/domain/ssot.v7'
// - Código VIEJO sigue usando: import { ... } from '@/domain/ssot' (este archivo)
// - Migrar módulo por módulo reemplazando imports
//
// PROGRESO DE MIGRACIÓN:
// ✅ Orders module (3 archivos)
// ⏳ Warehouse module
// ⏳ Production module  
// ⏳ Quality module
// ⏳ Marketing module
// ⏳ Admin module
// ⏳ Otros módulos
//
// Ver: SSOT_V7_IMPLEMENTATION_GUIDE.md
// ============================================================================

// Re-exportar TODO de SSOT v6 (antiguo)
export * from './ssot.v6-old';

// Warning en consola para detectar uso
if (typeof window !== 'undefined') {
  console.warn('⚠️ Loading SSOT v6 (deprecated). Migrate to @/domain/ssot.v7');
}
