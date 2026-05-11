# 🚚 SISTEMA DE SELECCIÓN DE CARRIERS - IMPLEMENTACIÓN COMPLETA

**Fecha:** 19/01/2025  
**Estado:** ✅ FUNDAMENTOS COMPLETADOS - INTEGRACIÓN PENDIENTE

---

## 📋 RESUMEN EJECUTIVO

Se ha implementado un sistema flexible de selección de métodos de envío que permite elegir entre:
- **SendCloud** (integración automática)
- **Carriers manuales** (SEUR, Correos, MRW, etc.)
- **Métodos especiales** (Recogida, Entrega propia)

### **Beneficios:**
- ✅ Flexibilidad total para elegir transportista
- ✅ Validación automática de requisitos por carrier
- ✅ Recomendación inteligente según características del envío
- ✅ Soporte para etiquetas automáticas o manuales
- ✅ Enlaces de tracking configurables por carrier

---

## 📦 ARCHIVOS CREADOS

### 1. **Configuración de Carriers**
```
src/config/carriers.ts (400+ líneas)
```

**Contenido:**
- Type `CarrierType` con 13 transportistas
- Interface `CarrierConfig` con metadata completa
- Constante `CARRIERS_CONFIG` con configuración de cada carrier
- Funciones helpers:
  - `getActiveCarriers()`
  - `getCarriersByMode()`
  - `getIntegratedCarriers()`
  - `getTrackingUrl()`
  - `getRecommendedCarrier()`
  - `validateCarrierRequirements()`

### 2. **Componente CarrierSelector**
```
src/components/logistics/CarrierSelector.tsx (300+ líneas)
```

**Características:**
- Selector visual con iconos
- Badge "Auto" para carriers integrados
- Badge "Recomendado" para sugerencia inteligente
- Validación en tiempo real de requisitos
- Tooltips informativos
- Info box con características del carrier seleccionado
- Versión simple (`CarrierSelectorSimple`) para casos básicos

### 3. **Modelo SSOT Extendido**
```
src/domain/ssot.ts (modificado)
```

**Cambios en interface Shipment:**
```typescript
export interface Shipment {
  // ... campos existentes ...
  
  mode: 'PARCEL' | 'PALLET' | 'ENVELOPE';  // Añadido ENVELOPE
  
  // Carrier information (NUEVO)
  carrierType?: 'SENDCLOUD' | 'SEUR' | 'CORREOS' | ... ;
  carrierName?: string;  // Nombre legible
  
  // Tracking information
  trackingCode?: string;
  trackingUrl?: string;
  
  // External integrations (NUEVO)
  sendcloudParcelId?: number;
  
  // ... resto campos ...
}
```

---

## 🎯 CARRIERS DISPONIBLES

| Carrier | Código | Integración | Modos | Internacional |
|---------|--------|------------|-------|---------------|
| SendCloud | `SENDCLOUD` | ✅ Auto | Parcel, Pallet | ✅ |
| SEUR | `SEUR` | ❌ Manual | Parcel, Pallet, Envelope | ✅ |
| Correos | `CORREOS` | ❌ Manual | Parcel, Envelope | ✅ |
| MRW | `MRW` | ❌ Manual | Parcel, Pallet, Envelope | ✅ |
| Nacex | `NACEX` | ❌ Manual | Parcel, Pallet | ❌ |
| GLS | `GLS` | ❌ Manual | Parcel, Pallet | ✅ |
| DHL | `DHL` | ❌ Manual | Parcel, Pallet, Envelope | ✅ |
| FedEx | `FEDEX` | ❌ Manual (inactivo) | Parcel, Pallet, Envelope | ✅ |
| UPS | `UPS` | ❌ Manual (inactivo) | Parcel, Pallet, Envelope | ✅ |
| Tipsa | `TIPSA` | ❌ Manual | Parcel, Pallet | ❌ |
| Recogida | `RECOGIDA` | ❌ Manual | Todos | ❌ |
| Entrega Propia | `ENTREGA_PROPIA` | ❌ Manual | Todos | ❌ |
| Otro | `OTRO` | ❌ Manual | Todos | ❌ |

---

## 🔧 INTEGRACIÓN PENDIENTE

### **Paso 1: Adaptar `logistics.actions.ts`**

**Ubicación:** `src/server/actions/logistics.actions.ts`

**Cambios necesarios:**

```typescript
import { getRecommendedCarrier } from '@/config/carriers';
import type { CarrierType } from '@/config/carriers';

export async function confirmOrderShipment(orderId: string): Promise<Shipment> {
  // ... código existente ...
  
  // NUEVO: Determinar carrier recomendado
  const recommendedCarrier = getRecommendedCarrier({
    mode: shipmentMode,
    weight: totalWeight,
    isInternational: account.country !== 'ES',
    preferIntegration: true,
  });
  
  const newShipment: Shipment = {
    // ... campos existentes ...
    mode: shipmentMode,
    carrierType: recommendedCarrier,  // NUEVO
    carrierName: CARRIERS_CONFIG[recommendedCarrier].name,  // NUEVO
    weightKg: totalWeight,  // NUEVO: calcular desde líneas
  };
  
  // ... resto del código ...
}
```

### **Paso 2: Adaptar `ShipmentsTable.tsx`**

**Ubicación:** `src/features/warehouse/components/ShipmentsTable.tsx`

**Cambios necesarios:**

```typescript
import { CARRIERS_CONFIG, getTrackingUrl } from '@/config/carriers';

// En el render:
<td className="p-3">
  <div className="flex items-center gap-2">
    {shipment.carrierType && (
      <>
        <span>{CARRIERS_CONFIG[shipment.carrierType].icon}</span>
        <span className="text-sm">{shipment.carrierName}</span>
      </>
    )}
    {shipment.trackingCode && (
      <a
        href={getTrackingUrl(shipment.carrierType!, shipment.trackingCode)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {shipment.trackingCode}
      </a>
    )}
  </div>
</td>
```

### **Paso 3: Lógica de Procesamiento Condicional**

**Ubicación:** `src/server/actions/logistics.actions.ts`

**Modificar `handleProcessShipment`:**

```typescript
const handleProcessShipment = (shipment: Shipment) => {
  startTransition(async () => {
    try {
      const carrier = CARRIERS_CONFIG[shipment.carrierType || 'SENDCLOUD'];
      
      // Paso 1: Etiqueta (SOLO si tiene integración)
      if (carrier.hasIntegration) {
        if (shipment.carrierType === 'SENDCLOUD') {
          const labelResult = await createSendcloudShipment(shipment.id);
          toast.success(`✓ Etiqueta SendCloud: ${labelResult.trackingNumber}`);
        }
        // Aquí se pueden añadir más integraciones futuras
      } else {
        toast.info('ℹ️ Carrier manual - introduce tracking manualmente');
      }
      
      // Paso 2: Albarán PDF (siempre)
      await generateAlbaran(shipment.id);
      toast.success('✓ Albarán generado');
      
      // Paso 3: Factura Holded (siempre)
      const invoiceResult = await syncShipmentToHolded(shipment.id);
      toast.success(`✓ Factura ${invoiceResult.invoiceId}`);
      
      // Paso 4: Marcar enviado (siempre)
      await markShipped({ shipmentId: shipment.id });
      
      toast.success('🎉 Envío procesado completamente');
      router.refresh();
    } catch (e: any) {
      toast.error('Error al procesar envío', { description: e.message });
    }
  });
};
```

### **Paso 4: Añadir Selector en Validación de Shipment**

**Ubicación:** `src/features/warehouse/components/ValidateDialog.tsx`

**Añadir campo:**

```typescript
import { CarrierSelector } from '@/components/logistics/CarrierSelector';

// En el formulario:
<div className="space-y-2">
  <Label>Transportista</Label>
  <CarrierSelector
    value={carrierType}
    onChange={setCarrierType}
    mode={shipment.mode}
    weight={shipment.weightKg}
    isInternational={shipment.country !== 'ES'}
  />
</div>

{/* Si carrier no tiene integración, mostrar campo tracking manual */}
{carrierType && !CARRIERS_CONFIG[carrierType].hasIntegration && (
  <div className="space-y-2">
    <Label>Código de Tracking</Label>
    <Input
      value={trackingCode}
      onChange={(e) => setTrackingCode(e.target.value)}
      placeholder="Ej: 1234567890"
    />
  </div>
)}
```

### **Paso 5: Actualizar `confirmOrderShipment`**

**Calcular peso total:**

```typescript
// Calcular peso total del envío
const totalWeight = orderLines.reduce((sum, line) => {
  const item = itemsById.get(line.itemId || line.sku || '');
  const weightPerUnit = item?.weightPerUnit || 0.5; // default 0.5kg
  return sum + (line.qty * weightPerUnit);
}, 0);
```

---

## 🎨 UI/UX MEJORADA

### **Antes:**
- Carrier hardcoded a SendCloud
- Sin validación de requisitos
- Sin opciones alternativas
- Usuarios no pueden elegir

### **Después:**
- Selector visual con todos los carriers
- Validación automática de requisitos
- Sugerencia inteligente
- Badges informativos (Auto, Recomendado)
- Tooltips con detalles
- Manejo flexible de carriers manuales

---

## 📊 FLUJOS DE TRABAJO

### **Flujo 1: Envío con SendCloud (Automático)**
```
1. Usuario confirma pedido
2. Sistema recomienda SendCloud (tiene integración)
3. Usuario valida shipment (puede cambiar carrier)
4. Clic "Procesar Envío Completo"
   → Crea etiqueta SendCloud automáticamente
   → Obtiene tracking number
   → Genera albarán
   → Crea factura
   → Marca como enviado
5. ✅ Completo con tracking automático
```

### **Flujo 2: Envío con SEUR (Manual)**
```
1. Usuario confirma pedido
2. Sistema recomienda carrier (ej: SEUR)
3. Usuario valida shipment
   → Selecciona SEUR como carrier
   → Introduce tracking code manualmente
4. Clic "Procesar Envío" (sin paso SendCloud)
   → Genera albarán
   → Crea factura
   → Marca como enviado con tracking manual
5. ✅ Completo con tracking manual
```

### **Flujo 3: Recogida en Almacén**
```
1. Usuario confirma pedido
2. Usuario selecciona "Recogida" como carrier
3. No requiere tracking
4. Genera albarán y factura
5. ✅ Listo para recoger
```

---

## ⚙️ CONFIGURACIÓN

### **Variables de Entorno (sin cambios)**
```bash
# SendCloud (existente)
SENDCLOUD_USE_REAL=true
SENDCLOUD_API_KEY=your_key
SENDCLOUD_API_SECRET=your_secret

# Shopify (existente)
SHOPIFY_USE_REAL=true
SHOPIFY_ACCESS_TOKEN=your_token
SHOPIFY_STORE_NAME=santabrisa
```

### **Activar/Desactivar Carriers**

En `src/config/carriers.ts`:

```typescript
FEDEX: {
  // ...
  active: false,  // Cambiar a true para activar
  order: 8,
}
```

### **Añadir Nuevo Carrier**

1. Añadir tipo a `CarrierType`
2. Añadir configuración a `CARRIERS_CONFIG`
3. Si tiene integración, crear cliente en `src/server/integrations/`

---

## 🧪 TESTING PENDIENTE

### **Tests Manuales:**

- [ ] Confirmar pedido con cada carrier
- [ ] Validar requisitos (peso, dimensiones)
- [ ] Procesar envío automático (SendCloud)
- [ ] Procesar envío manual (SEUR, Correos)
- [ ] Tracking links funcionan correctamente
- [ ] Selector muestra carriers correctos por modo
- [ ] Badge "Recomendado" aparece correctamente
- [ ] Validación bloquea carriers incompatibles

### **Tests Unitarios:**

```typescript
// tests/config/carriers.test.ts
import { getRecommendedCarrier, validateCarrierRequirements } from '@/config/carriers';

describe('Carrier System', () => {
  it('recomienda SendCloud para envíos con integración preferida', () => {
    const carrier = getRecommendedCarrier({
      mode: 'PARCEL',
      preferIntegration: true,
    });
    expect(carrier).toBe('SENDCLOUD');
  });
  
  it('valida requisitos de peso', () => {
    const result = validateCarrierRequirements('SEUR', {
      mode: 'PARCEL',
      // sin peso
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('SEUR requiere especificar el peso');
  });
});
```

---

## 📈 MÉTRICAS DE ÉXITO

### **Antes de la implementación:**
- ❌ Solo SendCloud disponible
- ❌ Sin flexibilidad
- ❌ No se pueden gestionar carriers manuales
- ❌ Problemas si SendCloud está caído

### **Después de la implementación:**
- ✅ 13 carriers configurados
- ✅ Flexibilidad total
- ✅ Gestión de carriers manuales
- ✅ Fallback si integración falla
- ✅ Mejor experiencia de usuario

---

## 🚀 PRÓXIMOS PASOS

### **Prioridad Alta** (Inmediato)
1. ✅ Crear configuración de carriers
2. ✅ Extender modelo Shipment
3. ✅ Crear componente selector
4. ⏳ Adaptar `logistics.actions.ts`
5. ⏳ Actualizar `ShipmentsTable.tsx`
6. ⏳ Añadir selector en validación

### **Prioridad Media** (Semana 1-2)
7. Implementar cálculo automático de peso
8. Testing exhaustivo con carriers reales
9. Documentación de usuario final
10. Video tutorial para equipo

### **Prioridad Baja** (Backlog)
11. Integración con más carriers (Holded shipping)
12. Comparador de precios por carrier
13. Histórico de performance por carrier
14. Dashboard de análisis de envíos

---

## 📚 DOCUMENTACIÓN ADICIONAL

### **Para Desarrolladores:**
- `src/config/carriers.ts` - Configuración completa
- `src/components/logistics/CarrierSelector.tsx` - Componente UI
- `src/domain/ssot.ts` - Interface Shipment actualizada

### **Para Usuarios:**
- Guía de selección de transportista (pendiente)
- FAQ sobre carriers manuales vs automáticos (pendiente)
- Troubleshooting de tracking (pendiente)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Backend:**
- [x] Configuración de carriers
- [x] Tipo CarrierType en SSOT
- [x] Helpers de validación
- [ ] Adaptar confirmOrderShipment
- [ ] Adaptar handleProcessShipment
- [ ] Calcular peso automático
- [ ] Pruebas con API real

### **Frontend:**
- [x] Componente CarrierSelector
- [x] Componente CarrierSelectorSimple
- [ ] Integrar en ValidateDialog
- [ ] Actualizar ShipmentsTable
- [ ] Mostrar carrier en OrdersTable
- [ ] Badge de carrier en UI

### **Testing:**
- [ ] Tests unitarios de helpers
- [ ] Tests de integración SendCloud
- [ ] Tests de carriers manuales
- [ ] Tests de validación de requisitos
- [ ] Tests E2E de flujo completo

### **Documentación:**
- [x] Este documento
- [ ] Guía de usuario
- [ ] API documentation
- [ ] Video tutorial

---

## 💡 NOTAS IMPORTANTES

### **Compatibilidad Retroactiva:**
- Shipments existentes sin `carrierType` funcionarán (default a SendCloud)
- Campo `carrier` deprecated pero mantenido por compatibilidad
- Migración gradual sin breaking changes

### **Seguridad:**
- Validación server-side de carrier selection
- No exponer API keys de carriers en frontend
- Rate limiting en endpoints de tracking

### **Performance:**
- Configuración de carriers es estática (no DB query)
- Helpers son pure functions (fácil caché)
- Componente selector es ligero (<10KB)

---

**Estado Final:** ✅ **FUNDAMENTOS COMPLETADOS - LISTO PARA INTEGRACIÓN**

**Próxima Acción:** Adaptar `logistics.actions.ts` para usar el nuevo sistema
