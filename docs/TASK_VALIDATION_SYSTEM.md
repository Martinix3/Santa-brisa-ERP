# Sistema de Validación de Tareas - Documentación Completa

## 📋 Resumen

Sistema completo de validación de negocio para el cierre de tareas, con reglas específicas según el tipo de tarea.

## 🔒 Reglas de Negocio Implementadas

### Tipos de Tareas (TaskKind)

- **GENERICA**: Tarea genérica sin validaciones especiales
- **VISITA**: Visita a cliente - Requiere validación estricta al cerrar
- **COBRO**: Gestión de cobro
- **PEDIDO**: Gestión de pedido
- **MARKETING**: Actividad de marketing

### Outcomes Permitidos (TaskOutcome)

- **NEXT_VISIT**: La visita resultó en programar una próxima visita
- **ORDER_PLACED**: La visita resultó en un pedido
- **COMPLETED**: Tarea completada normalmente
- **CANCELLED**: Tarea cancelada

## ✅ Validaciones por Tipo de Tarea

### VISITA

**Regla**: Solo puede cerrarse con outcome `NEXT_VISIT` o `ORDER_PLACED`

```typescript
// Cerrar con próxima visita
completeVisitTask(taskId, {
  outcome: "NEXT_VISIT",
  nextEventId: "event_abc123", // OBLIGATORIO
  closedById: userId
});

// Cerrar con pedido
completeVisitTask(taskId, {
  outcome: "ORDER_PLACED",
  orderId: "order_xyz789", // OBLIGATORIO
  closedById: userId
});
```

**Validaciones aplicadas:**
- ✅ Verifica que el evento existe en Firestore (`events/{id}`)
- ✅ Verifica que el pedido existe en Firestore (`ordersSellOut/{id}`)
- ✅ Si ambos tienen `accountId`, deben coincidir
- ✅ Usa transacciones para garantizar consistencia
- ✅ Registra `closedAt` y `closedById`

### GENERICA, COBRO, PEDIDO, MARKETING

**Regla**: Se completan directamente con outcome `COMPLETED`

```typescript
completeGenericTask(taskId, userId, "COMPLETED");
```

**Sin validaciones especiales** - Se cierra inmediatamente.

## 🚫 Casos Límite y Respuestas

### 1. ¿Visita sin accountId?

**✅ PERMITIDO**

```typescript
// Caso: Prospección o visita exploratoria
const task = {
  kind: "VISITA",
  title: "Prospección en zona nueva",
  // Sin accountId - OK
};
```

**Razón**: Muchas visitas son de prospección y no tienen cuenta asignada aún.

### 2. ¿Cancelar una VISITA sin próxima visita ni pedido?

**✅ PERMITIDO**

```typescript
// Permitir cancelación con outcome CANCELLED
cancelTask(taskId, userId, "Cliente no disponible");
```

**Razón**: Las visitas pueden no realizarse (cliente ausente, emergencia, etc.). 

**Implementado**: La función `cancelTask()` permite cancelar cualquier tarea con outcome `CANCELLED`, sin requerir `nextEventId` ni `orderId`.

### 3. ¿Cerrar VISITA con pedido de otra cuenta?

**❌ BLOQUEADO**

```typescript
// Validación en completeVisitTask()
if (task.accountId && order.accountId && order.accountId !== task.accountId) {
  throw new Error("El pedido no corresponde a la cuenta de la visita");
}
```

**Razón**: Prevenir errores de asignación incorrecta.

**Excepción**: Si alguno no tiene `accountId`, se permite (caso edge de migración de datos).

### 4. ¿Eventos de Marketing sin KPIs?

**✅ PERMITIDO** (si todos son `required: false`)

```typescript
// Evento sin KPIs obligatorios
const event = {
  kind: "DEMO",
  kpis: [
    { key: "asistentes", target: 50, current: 45, required: false },
  ]
};
```

**Por defecto**: `required: true` si no se especifica.

**Recomendación**: Para eventos que puedan cerrarse sin KPI:
```typescript
kpis: [
  { key: "leads", target: 10, current: 8, required: false },
]
```

### 5. ¿KPIs requeridos por defecto en Marketing?

**Recomendación estándar**:

```typescript
// Para eventos tipo DEMO/FERIA
kpis: [
  { key: "leads", target: 20, current: 0, required: true },
  { key: "alcance", target: 500, current: 0, required: false },
]

// Para campañas digitales
kpis: [
  { key: "conversiones", target: 50, current: 0, required: true },
  { key: "roi", target: 2.0, current: 0, required: true },
]
```

### 6. ¿Auto-generar tareas post-mortem al cerrar evento con éxito?

**NO IMPLEMENTADO** (pero preparado para futuro)

**Ejemplo de implementación futura**:

```typescript
// En closeMarketingEvent()
if (result.ok && allKpisAchieved) {
  await createTask({
    kind: "MARKETING",
    title: "Post-mortem: " + event.title,
    desc: "Subir fotos, resumen y facturas",
    department: "MARKETING",
    assignedToId: event.ownerUserId,
    eventId: event.id,
    source: "AUTO_RULE",
  });
}
```

## 🔐 Capas de Seguridad

### 1. Firestore Rules

```javascript
function validTaskClosure() {
  let isClosing = request.resource.data.status == 'DONE' && resource.data.status != 'DONE';
  
  if (!isClosing) return true;
  
  let kind = request.resource.data.kind;
  let outcome = request.resource.data.outcome;
  
  if (kind == 'VISITA') {
    return (outcome == 'NEXT_VISIT' && request.resource.data.nextEventId is string)
        || (outcome == 'ORDER_PLACED' && request.resource.data.orderId is string);
  }
  
  return outcome in ['COMPLETED', 'CANCELLED'];
}
```

**Qué valida**: Campos presentes, outcomes correctos por tipo
**Qué NO valida**: Existencia real de IDs referenciados (se hace en server actions)

### 2. Server Actions (Transaccional)

```typescript
// completeVisitTask() usa db.runTransaction()
return await db.runTransaction(async (tx) => {
  // 1. Leer tarea
  const taskSnap = await tx.get(taskRef);
  
  // 2. Verificar tipo
  if (task.kind !== 'VISITA') throw new Error(...);
  
  // 3. Verificar referencias existen
  const eventSnap = await tx.get(eventRef);
  if (!eventSnap.exists) throw new Error(...);
  
  // 4. Validar cruzada
  if (order.accountId !== task.accountId) throw new Error(...);
  
  // 5. Actualizar
  await tx.update(taskRef, updated);
  
  return { ok: true, task: updated };
});
```

**Garantías**:
- ✅ Atomicidad
- ✅ Validación de existencia
- ✅ Validación cruzada
- ✅ Rollback automático si falla

### 3. Schemas Zod

```typescript
export const TaskSchema = z.object({
  kind: TaskKindEnum.default("GENERICA"),
  outcome: TaskOutcomeEnum.optional(),
  nextEventId: z.string().optional(),
  orderId: z.string().optional(),
  // ...
});
```

**Qué valida**: Tipos, formatos, enums válidos

## 📊 Flujos Completos

### Flujo 1: Cerrar VISITA con próxima visita

```
1. Usuario → Click "Completar" en tarea VISITA
2. TaskCompleteDialog → Muestra opciones
3. Usuario → Selecciona "Programar próxima visita"
4. Usuario → Introduce nextEventId (o selecciona de UI)
5. Client → Llama completeVisitTask()
6. Server → Inicia transacción
7. Server → Valida que evento existe
8. Server → Actualiza tarea con outcome=NEXT_VISIT
9. Rules → Valida que nextEventId is string
10. ✅ Tarea cerrada con éxito
```

### Flujo 2: Intentar cerrar VISITA sin refs (BLOQUEA)

```
1. Usuario → Click "Completar" sin llenar campos
2. Client → Valida localmente, muestra alerta
3. (No llega a server)
4. Usuario debe llenar nextEventId o orderId
```

### Flujo 3: Cancelar VISITA

```
1. Usuario → Click "Cancelar Tarea"
2. Dialog → Pide confirmación y razón opcional
3. Client → Llama cancelTask(id, userId, reason)
4. Server → Actualiza con outcome=CANCELLED
5. Rules → Permite (no requiere refs para CANCELLED)
6. ✅ Tarea cancelada
```

## 🧪 Testing

Ejecutar tests:

```bash
npm run test src/domain/zod/task.spec.ts
```

Tests incluidos:
- ✅ VISITA con NEXT_VISIT + nextEventId
- ✅ VISITA con ORDER_PLACED + orderId
- ✅ VISITA con CANCELLED (sin refs)
- ✅ GENERICA con COMPLETED
- ✅ Todos los TaskKind
- ✅ Todos los TaskOutcome
- ✅ Campos opcionales
- ✅ Campos derivados

## 📁 Archivos del Sistema

```
src/
├── domain/
│   ├── ssot.ts                    # TaskKind, TaskOutcome
│   └── zod/
│       ├── task.ts                # Schemas con validación
│       └── task.spec.ts           # Tests unitarios
├── features/
│   └── tasks/
│       ├── complete.ts            # Acciones de cierre
│       ├── actions.ts             # CRUD básico
│       └── components/
│           ├── TaskDrawer.tsx     # Con selector kind
│           └── TaskCompleteDialog.tsx  # UI de cierre
└── firestore.rules                # Validación de seguridad
```

## 🚀 Próximas Mejoras

### Corto Plazo
1. **Selector visual** de eventos/pedidos (UI picker)
2. **Crear próxima visita** inline desde dialog
3. **Crear pedido rápido** desde cierre de visita

### Medio Plazo
4. **Cloud Function** para validar refs periódicamente
5. **Notificaciones** cuando se cierra con pedido
6. **Estadísticas** de outcomes por usuario/departamento

### Largo Plazo
7. **ML predictor** de outcome más probable
8. **Auto-completar** tareas según reglas
9. **Workflow engine** para cadenas de tareas

## 📞 Soporte

Para dudas o problemas:
- **Docs**: Este archivo
- **Tests**: `task.spec.ts`
- **Código**: Ver comentarios en `complete.ts`

---

**Última actualización**: 2025-10-13
**Versión**: 1.0.0
**Estado**: ✅ Producción
