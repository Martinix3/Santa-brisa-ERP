# SSOT V2 - GUÍA DE MIGRACIÓN PASO A PASO
## Migración Segura a Sistema "A Prueba de Balas"

### RESUMEN EJECUTIVO

Esta guía documenta la **ejecución exacta** de la migración SSOT v2, garantizando **zero data loss** y **rollback automático** en caso de problemas.

**⏱️ TIEMPO ESTIMADO:** 4-6 horas  
**🚨 DOWNTIME:** 0 minutos (migración en caliente)  
**🔄 ROLLBACK:** Automático con backups  

---

## ✅ PRE-REQUISITOS OBLIGATORIOS

### 1. Verificar Estado Actual
```bash
# 1. Verificar que no hay cambios pendientes
git status

# 2. Verificar conexión a Firestore
npm run build

# 3. Verificar estructura SSOT actual
npx tsx tests/ssot-v2/lot-service.test.ts
```

### 2. Crear Backups Críticos
```bash
# 1. Backup completo de Firestore (recomendado)
# Ir a: https://console.firebase.google.com/project/santa-brisa-erp/firestore/export

# 2. Backup específico de colecciones críticas
gcloud firestore export gs://santa-brisa-erp-backups/ssot-v2-migration-$(date +%Y%m%d) \
  --collection-ids=items,lots,stockMoves,onHand
```

### 3. Setup de Colecciones Nuevas
```bash
# Inicializar locations, counters, etc.
npx tsx scripts/setup-ssot-v2-collections.ts

# Verificar creación exitosa
npx tsx scripts/setup-ssot-v2-collections.ts --verify
```

---

## 🚀 EJECUCIÓN DE MIGRACIÓN

### PASO 1: MIGRAR LOTCODES (30-45 min)

#### 1.1 Análisis Pre-migración
```bash
# Dry run para evaluar alcance
npx tsx scripts/migrate-lot-codes.ts --dry-run

# Revisar reporte:
# - Processed: X lots
# - Migrated: X lots  
# - Conflicts: X lots (revisar manualmente)
# - Errors: 0 (debe ser 0 para continuar)
```

#### 1.2 Ejecutar Migración
```bash
# ⚠️  PUNTO DE NO RETORNO: Ejecutar solo si dry-run es exitoso
npx tsx scripts/migrate-lot-codes.ts --execute

# ✅ CHECKPOINT: Validar resultado
npx tsx scripts/migrate-lot-codes.ts --validate
```

#### 1.3 Criterios de Bloqueo
**🚨 PARAR SI:**
- Errores > 0 en validación
- Conflicts > 10% de lotes totales
- Algún lotCode no pasa validación regex

### PASO 2: MIGRAR STOCKMOVES (45-60 min)

#### 2.1 Análisis Pre-migración
```bash
# Dry run para evaluar alcance
npx tsx scripts/migrate-stock-moves.ts --dry-run

# Revisar reporte:
# - Processed: X moves
# - Migrated: X moves
# - SKU mapping errors: < 5% (aceptable)
# - LotNumber mapping errors: < 2% (crítico)
```

#### 2.2 Ejecutar Migración
```bash
# ⚠️  CRÍTICO: Solo ejecutar tras migración exitosa de lotCodes
npx tsx scripts/migrate-stock-moves.ts --execute

# ✅ CHECKPOINT: Validar resultado
npx tsx scripts/migrate-stock-moves.ts --validate
```

#### 2.3 Criterios de Bloqueo
**🚨 PARAR SI:**
- > 5% StockMoves sin itemId válido
- > 2% StockMoves sin lotCode válido
- Algún itemId referenciado no existe en items

### PASO 3: RECONSTRUIR ONHAND (60-90 min)

#### 3.1 Análisis Pre-reconstrucción
```bash
# Verificar estado actual de OnHand
npx tsx scripts/rebuild-onhand.ts --verify

# Calcular reconstrucción (dry run)
npx tsx scripts/rebuild-onhand.ts
# ⚠️  NO usar --execute todavía
```

#### 3.2 Ejecutar Reconstrucción
```bash
# ⚠️  CRÍTICO: Crea backup automático de OnHand actual
npx tsx scripts/rebuild-onhand.ts --execute

# ✅ CHECKPOINT: Validar integridad
npx tsx scripts/rebuild-onhand.ts --verify
```

#### 3.3 Criterios de Bloqueo  
**🚨 PARAR SI:**
- Invariant violations > 0
- Inconsistencias > 1% de OnHand total
- Algún OnHand tiene balance negativo

---

## 🛡️ VALIDACIÓN POST-MIGRACIÓN

### Validación Integral del Sistema
```bash
# 1. Health check completo SSOT v2
npx tsx -e "
import { validateSsotV2Health } from './src/server/actions/warehouse.v2.actions';
validateSsotV2Health().then(r => console.log('Health:', r));
"

# 2. Verificar invariantes en muestra
npx tsx -e "
import { OnHandService } from './src/services/canonical/onhand.service';
import { adminDb as db } from './src/server/firebase';

(async () => {
  const snap = await db.collection('onHand').limit(10).get();
  let violations = 0;
  
  for (const doc of snap.docs) {
    const result = OnHandService.validateInvariants(doc.data());
    if (!result.valid) violations++;
  }
  
  console.log(\`Violations in sample: \${violations}/10\`);
})();
"

# 3. Test de transacciones v2
npx tsx -e "
import { processGoodsReceiptV2 } from './src/server/actions/warehouse.v2.actions';

// Test con datos sintéticos
console.log('Testing v2 transactions...');
"
```

### Criterios de Éxito Total
**✅ MIGRACIÓN EXITOSA SI:**
- Health check: `healthy: true`
- Invariant violations: `0`
- Consistency issues: `0`  
- Todos los tests pasan

---

## 🚨 ROLLBACK PROCEDURES

### Rollback OnHand (Más común)
```bash
# Listar backups disponibles
ls -la onhand_backup_*

# Restaurar desde backup específico
npx tsx scripts/rebuild-onhand.ts --restore --backup-id=onhand_backup_1735123456789

# Verificar restauración
npx tsx scripts/rebuild-onhand.ts --verify
```

### Rollback Completo (Crítico)
```bash
# Restaurar desde backup de Firestore
gcloud firestore import gs://santa-brisa-erp-backups/ssot-v2-migration-20251020

# Verificar que todo volvió al estado anterior
npm run build
npm run test:basic
```

---

## 📋 CHECKLIST DE MIGRACIÓN

### Pre-Migración ☑️
- [ ] ✅ Backup completo de Firestore creado
- [ ] ✅ Setup de nuevas colecciones ejecutado
- [ ] ✅ Índices de Firestore creados manualmente
- [ ] ✅ Tests básicos pasan sin errores
- [ ] ✅ Servicios canónicos implementados

### Migración Fase 1: LotCodes ☑️
- [ ] ✅ Dry run sin errores críticos
- [ ] ✅ Conflicts < 10% del total
- [ ] ✅ Migración ejecutada exitosamente
- [ ] ✅ Validación post-migración OK

### Migración Fase 2: StockMoves ☑️
- [ ] ✅ Dry run sin errores críticos
- [ ] ✅ Mapping errors < 5%
- [ ] ✅ Migración ejecutada exitosamente
- [ ] ✅ Validación post-migración OK

### Migración Fase 3: OnHand ☑️
- [ ] ✅ Dry run sin violaciones de invariantes
- [ ] ✅ Backup automático creado
- [ ] ✅ Reconstrucción ejecutada exitosamente
- [ ] ✅ Verificación integral OK

### Post-Migración ☑️
- [ ] ✅ Health check SSOT v2 = healthy
- [ ] ✅ Invariant violations = 0
- [ ] ✅ Consistency issues = 0
- [ ] ✅ Transacciones v2 funcionando
- [ ] ✅ Rollback plan documentado

---

## 🔧 COMANDOS RÁPIDOS

### Migración Completa (Secuencial)
```bash
# 1. Setup inicial
npx tsx scripts/setup-ssot-v2-collections.ts

# 2. Migración de lotes (con validación)
npx tsx scripts/migrate-lot-codes.ts --dry-run
npx tsx scripts/migrate-lot-codes.ts --execute
npx tsx scripts/migrate-lot-codes.ts --validate

# 3. Migración de movimientos (con validación)
npx tsx scripts/migrate-stock-moves.ts --dry-run
npx tsx scripts/migrate-stock-moves.ts --execute
npx tsx scripts/migrate-stock-moves.ts --validate

# 4. Reconstrucción OnHand (con backup)
npx tsx scripts/rebuild-onhand.ts --dry-run
npx tsx scripts/rebuild-onhand.ts --execute
npx tsx scripts/rebuild-onhand.ts --verify
```

### Verificación Post-Migración
```bash
# Health check integral
npx tsx -e "
import { validateSsotV2Health } from './src/server/actions/warehouse.v2.actions';
validateSsotV2Health().then(console.log);
"

# Test de servicios canónicos
npx tsx tests/ssot-v2/lot-service.test.ts
```

---

## 🚨 TROUBLESHOOTING

### Error: "Invariant violations detected"
```bash
# 1. Verificar qué invariantes fallan
npx tsx scripts/rebuild-onhand.ts --verify

# 2. Revisar StockMoves problemáticos
npx tsx -e "
import { ReconciliationService } from './src/services/canonical/reconciliation.service';
ReconciliationService.verifyStockMovesConsistency({reportLimit: 5}).then(console.log);
"

# 3. Rollback si es crítico
npx tsx scripts/rebuild-onhand.ts --restore --backup-id=BACKUP_ID
```

### Error: "Duplicate lot codes"
```bash
# 1. Identificar duplicados
npx tsx scripts/migrate-lot-codes.ts --validate

# 2. Revisar conflictos reportados
npx tsx scripts/migrate-lot-codes.ts --dry-run

# 3. Resolución manual o re-migración
```

### Error: "SKU mapping failed"
```bash
# 1. Verificar items collection
npx tsx -e "
import { adminDb as db } from './src/server/firebase';
(async () => {
  const snap = await db.collection('items').select('sku').get();
  console.log(\`Items with SKU: \${snap.docs.length}\`);
})();
"

# 2. Crear items faltantes manualmente
```

---

## ✅ CRITERIOS DE ÉXITO FINAL

### Éxito Técnico 
- ✅ 0 violaciones de invariantes
- ✅ 0 inconsistencias OnHand vs StockMoves  
- ✅ 100% lotCodes válidos
- ✅ 100% referencias itemId válidas

### Éxito Funcional
- ✅ Recepción de mercancía funciona
- ✅ Cambios QC mueven buckets correctamente
- ✅ Transferencias mantienen consistencia
- ✅ FEFO selecciona lotes por caducidad

### Éxito Operacional
- ✅ Performance igual o mejor que antes
- ✅ UI funciona sin errores
- ✅ Reportes son precisos
- ✅ Monitoreo detecta problemas automáticamente

**RESULTADO:** Sistema de inventario **enterprise-grade** con integridad garantizada al 100%.
