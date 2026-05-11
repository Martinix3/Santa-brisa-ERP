# Firebase Emulator Testing Guide

**Fecha**: 19 Enero 2025  
**Status**: ✅ CONFIGURADO

---

## 📋 Resumen

Firebase Emulator está configurado para permitir tests de integración reales contra Firestore local, sin tocar la BD de producción.

---

## 🚀 Uso Rápido

### Opción A: Tests con Emulator (RECOMENDADO)
```bash
# Terminal 1: Iniciar emulator
npm run emulator:start

# Terminal 2: Ejecutar tests
npm run test:emulator

# O en un solo comando (automático):
npm run test:emulator
```

### Opción B: Tests sin Emulator (Solo unit tests)
```bash
# Requiere comentar checkEmulatorRunning() en tests/setup/firebase-emulator.ts
npm test
```

---

## 🔧 Configuración Implementada

### 1. Firebase Emulator (`firebase.json`)
```json
{
  "emulators": {
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### 2. Vitest Config (`vitest.config.ts`)
- ✅ Setup file: `tests/setup/firebase-emulator.ts`
- ✅ Alias `server-only` → mock para permitir imports

### 3. Mock server-only (`tests/mocks/server-only.ts`)
- Permite importar server actions en tests
- Safe porque tests corren en Node.js

### 4. Setup Emulator (`tests/setup/firebase-emulator.ts`)
- Configura env vars para emulator
- Inicializa Firebase Admin
- Exporta `clearFirestoreData()` helper

---

## 📊 Tests Actuales

### ✅ Funcionando
- `tests/orders/placeOrder.test.ts` - Ahora puede importar server actions
- Server actions ejecutables en environment de tests

### ⚠️ Requieren Emulator Running
- Tests de integración que usan Firestore real
- Validación de reglas de seguridad
- Tests de queries complejas

---

## 🎯 Próximos Pasos para Tests Completos

### PASO 1: Seed Fixtures (Opcional pero recomendado)
Crear `tests/fixtures/seed-data.ts`:
```typescript
import { getFirestore } from 'firebase-admin/firestore';

export async function seedTestData() {
  const db = getFirestore();
  
  // Accounts
  await db.collection('accounts').doc('test-account-001').set({
    id: 'test-account-001',
    name: 'Test Account',
    segment: 'HORECA',
    // ...
  });
  
  // Items
  await db.collection('items').doc('test-item-001').set({
    id: 'test-item-001',
    sku: 'test-item-001',
    name: 'Test Product',
    // ...
  });
  
  // Lots
  // OnHand
  // etc.
}
```

### PASO 2: Update placeOrder.test.ts
```typescript
import { clearFirestoreData } from '../setup/firebase-emulator';
import { seedTestData } from '../fixtures/seed-data';

describe('placeOrder() - Integration Tests', () => {
  beforeEach(async () => {
    await clearFirestoreData();
    await seedTestData();
  });

  it('debe crear pedido con datos reales', async () => {
    const { placeOrder } = await import('@/app/(app)/orders/actions');
    
    const result = await placeOrder({
      accountId: 'test-account-001',
      lines: [
        { itemId: 'test-item-001', qty: 10, priceUnit: 5.0 }
      ]
    });
    
    expect(result.ok).toBe(true);
    // Verificar que realmente se guardó en Firestore
    const order = await db.collection('ordersSellOut').doc(result.orderId!).get();
    expect(order.exists).toBe(true);
  });
});
```

---

## 📝 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run emulator:start` | Inicia Firestore + Storage emulator |
| `npm run test:emulator` | Ejecuta todos los tests con emulator (auto-start/stop) |
| `npm run test:watch` | Tests en watch mode con emulator |
| `npm test` | Tests unitarios sin emulator |

---

## 🐛 Troubleshooting

### Error: "Firebase Emulator not detected"
**Solución**: Ejecuta `npm run emulator:start` en otra terminal, o usa `npm run test:emulator`

### Error: "EADDRINUSE" (puerto en uso)
**Solución**:
```bash
# Matar procesos en puerto 8080
lsof -ti:8080 | xargs kill -9

# O cambiar puerto en firebase.json
```

### Tests lentos
**Solución**: 
- Usar `clearFirestoreData()` solo cuando necesario
- Seed solo datos mínimos
- Considerar test parallelization

---

## ✨ Beneficios vs Mocks

### Con Emulator (Integration Tests)
- ✅ Tests contra Firestore **real**
- ✅ Valida queries, indices, reglas de seguridad
- ✅ Detecta bugs de integración
- ⚠️ Más lentos (~2-5 seg vs 50ms)

### Con Mocks (Unit Tests)
- ✅ Rapidísimos (<50ms)
- ✅ Test lógica de negocio aislada
- ⚠️ No detectan bugs de Firestore
- ⚠️ Pueden divergir de comportamiento real

### Estrategia Híbrida (Recomendado)
- **Unit tests**: Lógica pura, validaciones, cálculos
- **Integration tests**: CRUD operations, queries, transactions
- **E2E tests**: Flujos completos usuario

---

## 🎓 Ejemplo Completo

Ver `tests/orders/placeOrder.test.ts` para ejemplo de:
- Import de server actions
- Mocking de dependencies
- Assertions sobre results

Para migrar a integration tests con emulator:
1. Crear fixtures con seed data
2. Usar `clearFirestoreData()` en beforeEach
3. Verificar datos realmente guardados en emulator

---

## 📚 Recursos

- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Vitest Docs](https://vitest.dev/)
- [Next.js Server Actions Testing](https://nextjs.org/docs/app/building-your-application/testing/vitest)

---

**Configuración completada** - Los tests ya pueden importar server actions. 
Para tests de integración completos, seguir PASOS 1-2 arriba.
