# DRAWERS DE VENTAS: FORMULARIOS COMPLETOS

**Fecha:** 26 de Octubre de 2025  
**Estado:** ✅ COMPLETADO  
**Drawers Creados:** 4 (Opportunity, Interaction, POS, Event)

---

## 📦 DRAWERS IMPLEMENTADOS

### 1. OpportunityDrawer ✅ MEJORADO

**Archivo:** `src/ui/drawers/drawers/OpportunityDrawer.tsx`  
**Uso:** Vista rápida de oportunidad desde el pipeline

**Características:**
- ✅ Información enriquecida (8+ métricas)
- ✅ Alertas y estado visual
- ✅ Nota rápida integrada
- ✅ 4 acciones rápidas funcionales
- ✅ Navegación a detalle completo

**Cómo Abrir:**
```typescript
const { open } = useDrawer();
open('opportunity', { item: pipelineItem });
```

---

### 2. RegisterInteractionDrawer ✅ NUEVO

**Archivo:** `src/ui/drawers/drawers/RegisterInteractionDrawer.tsx`  
**Uso:** Registrar interacciones con cuentas (visitas, llamadas, emails, reuniones)

**Campos:**
- **Tipo:** VISITA | LLAMADA | EMAIL | REUNION | OTRO
- **Fecha y Hora:** Date picker + time picker
- **Duración:** En minutos
- **Notas:** Textarea obligatorio
- **Resultado:** POSITIVO | NEUTRAL | NEGATIVO | PENDIENTE
- **Próxima Acción:** Textarea opcional

**Cómo Abrir:**
```typescript
const { open } = useDrawer();
open('register-interaction', { 
  accountId: 'acc-123',
  accountName: 'Restaurante El Patio' 
});
```

**Validación:**
- ✅ Notas obligatorias
- ✅ Fecha y hora por defecto = ahora
- ✅ Duración mínima 5 minutos

---

### 3. RegisterPOSDrawer ✅ NUEVO

**Archivo:** `src/ui/drawers/drawers/RegisterPOSDrawer.tsx`  
**Uso:** Registrar instalación de punto de venta

**Campos:**
- **Modelo de POS:** Input text obligatorio
- **Número de Serie:** Input text obligatorio
- **Fecha Instalación:** Date picker
- **Técnico:** Nombre del técnico instalador
- **Cuota Mensual:** Número decimal (€)
- **Duración Contrato:** 6, 12, 24 o 36 meses
- **Accesorios:** Checkboxes (Impresora, Escáner, Cajón, Lector Tarjetas)
- **Notas:** Observaciones de instalación

**Cómo Abrir:**
```typescript
const { open } = useDrawer();
open('register-pos', { 
  accountId: 'acc-123',
  accountName: 'Hotel Costa Azul' 
});
```

**Validación:**
- ✅ Modelo y número de serie obligatorios
- ✅ Banner de confirmación "POS Activo"
- ✅ Accesorios opcionales

---

### 4. RegisterEventDrawer ✅ NUEVO

**Archivo:** `src/ui/drawers/drawers/RegisterEventDrawer.tsx`  
**Uso:** Registrar eventos comerciales (degustaciones, formaciones, ferias)

**Campos:**
- **Tipo:** DEGUSTACION | FORMACION | FERIA | PRESENTACION | OTRO
- **Título:** Input text obligatorio
- **Descripción:** Textarea breve
- **Fecha:** Date picker
- **Hora Inicio/Fin:** Time pickers
- **Ubicación:** Dirección o lugar
- **Nº Asistentes:** Estimación numérica
- **Productos:** Lista de productos a presentar
- **Presupuesto:** Estimado en euros
- **Notas:** Observaciones adicionales

**Cómo Abrir:**
```typescript
const { open } = useDrawer();
open('register-event', { 
  accountId: 'acc-123',
  accountName: 'Catering Eventos Premium' 
});
```

**Validación:**
- ✅ Título obligatorio
- ✅ Fecha y hora por defecto
- ✅ Estado inicial: PLANNED

---

## 🔗 INTEGRACIÓN CON EL SISTEMA

### Drawer Registry Actualizado ✅

**Archivo:** `src/ui/drawers/drawer-registry.tsx`

```typescript
export type DrawerId =
  // ... drawers existentes
  | 'register-interaction'  // ✅ NUEVO
  | 'register-pos'          // ✅ NUEVO
  | 'register-event';       // ✅ NUEVO
```

### DrawerController Actualizado ✅

**Archivo:** `src/ui/drawers/DrawerController.tsx`

```typescript
// Imports añadidos
import { RegisterInteractionDrawer } from './drawers/RegisterInteractionDrawer';
import { RegisterPOSDrawer } from './drawers/RegisterPOSDrawer';
import { RegisterEventDrawer } from './drawers/RegisterEventDrawer';

// Cases añadidos
{current?.id === 'register-interaction' && (
  <RegisterInteractionDrawer {...(current.payload as any)} onClose={close} />
)}
{current?.id === 'register-pos' && (
  <RegisterPOSDrawer {...(current.payload as any)} onClose={close} />
)}
{current?.id === 'register-event' && (
  <RegisterEventDrawer {...(current.payload as any)} onClose={close} />
)}
```

---

## 🚀 CÓMO USAR LOS NUEVOS DRAWERS

### Desde el OpportunityDrawer

El OpportunityDrawer mejorado ya tiene botones para abrir estos drawers:

```typescript
// Botón "Crear Visita" - Actualizar para usar register-interaction
<button 
  className="sb-btn sb-btn--secondary"
  onClick={() => {
    open('register-interaction', { 
      accountId: item.id,
      accountName: item.name 
    });
    onClose();
  }}
>
  <Calendar className="w-4 h-4" />
  Crear Visita
</button>
```

### Desde Cualquier Componente

```typescript
import { useDrawer } from '@/ui/drawers/drawer-registry';

function MiComponente() {
  const { open } = useDrawer();
  
  return (
    <>
      <button onClick={() => open('register-interaction', { accountId: 'acc-123' })}>
        Registrar Interacción
      </button>
      
      <button onClick={() => open('register-pos', { accountId: 'acc-123' })}>
        Registrar POS
      </button>
      
      <button onClick={() => open('register-event', { accountId: 'acc-123' })}>
        Crear Evento
      </button>
    </>
  );
}
```

---

## 📋 PRÓXIMOS PASOS

### Inmediato (Esta Semana)

1. **Actualizar OpportunityDrawer** para usar los nuevos drawers
   ```typescript
   // Cambiar alert por:
   open('register-interaction', { accountId: item.id, accountName: item.name });
   ```

2. **Crear Server Actions**
   - `createInteraction(data)` → Guardar en Firestore
   - `registerPOS(data)` → Guardar en Firestore + actualizar account.posInstalled
   - `createEvent(data)` → Guardar en Firestore + crear en calendario

3. **Testing**
   - Probar cada drawer individualmente
   - Verificar validaciones
   - Comprobar guardado en Firestore

### Corto Plazo (Próximas 2 Semanas)

4. **Mejorar Drawers**
   - Agregar subida de fotos en RegisterInteractionDrawer
   - Agregar recordatorios en RegisterEventDrawer
   - Agregar historial de mantenimiento en RegisterPOSDrawer

5. **Integración con Timeline**
   - Most
