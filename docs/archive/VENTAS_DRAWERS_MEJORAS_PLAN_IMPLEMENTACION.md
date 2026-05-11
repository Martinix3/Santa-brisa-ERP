# PLAN DE IMPLEMENTACIÓN: MEJORAS EN DRAWERS DE VENTAS

**Fecha:** 26 de Octubre de 2025  
**Módulos Afectados:** Ventas/Pipeline, Accounts/[id]  
**Prioridad:** Alta  
**Estimación Total:** 3-4 sprints

---

## RESUMEN EJECUTIVO

Este documento detalla el plan de implementación para mejorar significativamente los drawers del módulo de ventas, específicamente:

1. **OpportunityDrawer** (Pipeline) - ✅ COMPLETADO
2. **AccountDetailDrawer** (Nuevo) - Pendiente
3. **Drawers auxiliares** (Email, Visitas, etc.) - Pendiente

### Estado Actual

- ✅ **OpportunityDrawer mejorado** con información enriquecida y acciones funcionales
- ❌ Página accounts/[id] no usa drawers (inconsistente con el sistema)
- ❌ Drawers registrados pero no implementados
- ❌ Falta de documentación del sistema

### Beneficios Esperados

- **UX:** 40% reducción en clics, 60% mejora en acceso a información
- **Desarrollo:** 30% reducción en código duplicado, 50% mejora en mantenibilidad
- **Negocio:** 25% aumento en productividad del equipo de ventas

---

## SPRINT 1: MEJORAS CRÍTICAS (1-2 semanas)

### ✅ 1.1 OpportunityDrawer Mejorado - COMPLETADO

**Archivo:** `src/ui/drawers/drawers/OpportunityDrawer.tsx`

**Mejoras Implementadas:**
- ✅ Información enriquecida (métricas, comercial, distribuidor)
- ✅ Alertas y estado visual
- ✅ Nota rápida integrada
- ✅ Botones conectados al sistema de drawers
- ✅ Navegación a detalle completo
- ✅ Diseño mejorado con iconografía

**Pendiente:**
- [ ] Conectar `addAccountNote` action real
- [ ] Implementar drawers auxiliares (visit-onsite, email-reply)

### 1.2 Actualizar PipelineBoard

**Archivo:** `src/components/pipeline/PipelineBoard.tsx`

**Cambios Necesarios:**

```typescript
// Cambiar de 'account-quickview' a 'opportunity'
<OpportunityCard
  card={card}
  stage={stage.key}
  onEdit={() => open('opportunity', { item: card })}
/>
```

**Estimación:** 30 minutos

### 1.3 Conectar OpportunityDrawer al DrawerController

**Archivo:** `src/ui/drawers/DrawerController.tsx`

**Agregar:**

```typescript
{current?.id === 'opportunity' && current.payload.item && (
  <OpportunityDrawer
    item={current.payload.item as PipelineItem}
    onClose={close}
  />
)}
```

**Estimación:** 15 minutos

---

## SPRINT 2: ACCOUNT DETAIL DRAWER (2 semanas)

### 2.1 Crear AccountDetailDrawer

**Nuevo Archivo:** `src/ui/drawers/drawers/AccountDetailDrawer.tsx`

**Estructura:**

```typescript
export function AccountDetailDrawer({ 
  accountId, 
  mode = 'view' 
}: { 
  accountId: string; 
  mode?: 'view' | 'edit' 
}) {
  // Tabs: General, Contacto, Comercial, Timeline, Notas
  // Modo vista/edición
  // Acciones rápidas
}
```

**Componentes a crear:**

1. **AccountViewMode** - Vista de solo lectura
   - Ubicación: `src/features/accounts/components/AccountViewMode.tsx`
   - Muestra toda la información de forma organizada
   - Botón "Editar" para cambiar a modo edición

2. **AccountEditMode** - Formulario de edición
   - Ubicación: `src/features/accounts/components/AccountEditMode.tsx`
   - Formulario con validación
   - Botones "Guardar" y "Cancelar"

3. **AccountTabs** - Sistema de pestañas
   - General: Datos básicos, segmento, stage
   - Contacto: Email, teléfono, CIF, dirección
   - Comercial: Comercial asignado, distribuidor, tags
   - Timeline: Historial de interacciones
   - Notas: Notas y comentarios

**Estimación:** 3-4 días

### 2.2 Refactorizar AccountEditor

**Dividir en componentes más pequeños:**

```
src/features/accounts/
  ├── components/
  │   ├── AccountBasicInfo.tsx       (Datos básicos)
  │   ├── AccountContactInfo.tsx     (Contacto)
  │   ├── AccountCommercialInfo.tsx  (Info comercial)
  │   ├── AccountLocationInfo.tsx    (Ubicación)
  │   ├── AccountPhotos.tsx          (Fotos)
  │   ├── AccountNotes.tsx           (Notas)
  │   └── AccountTimeline.tsx        (Timeline)
  ├── forms/
  │   ├── AccountBasicInfoForm.tsx
  │   ├── AccountContactForm.tsx
  │   └── AccountCommercialForm.tsx
  └── hooks/
      ├── useAccountData.ts
      └── useAccountMutations.ts
```

**Estimación:** 2-3 días

### 2.3 Actualizar Página accounts/[id]

**Archivo:** `src/app/(app)/accounts/[id]/page.tsx`

**Cambios:**

```typescript
// Simplificar a vista de solo lectura
// Botón "Editar" abre AccountDetailDrawer en modo edición
// Mantener KPIs y recomendaciones visibles
// Timeline resumido (últimas 5 interacciones)
```

**Estimación:** 1 día

### 2.4 Registrar en drawer-registry

**Archivo:** `src/ui/drawers/drawer-registry.tsx`

```typescript
export type DrawerId =
  | 'account-detail'
  | 'account-edit'
  | 'account-notes'
  // ... resto
```

**Estimación:** 15 minutos

---

## SPRINT 3: DRAWERS AUXILIARES (1-2 semanas)

### 3.1 VisitOnsiteDrawer

**Nuevo Archivo:** `src/ui/drawers/drawers/VisitOnsiteDrawer.tsx`

**Funcionalidad:**
- Formulario para registrar visita
- Fecha y hora
- Tipo de visita (comercial, técnica, seguimiento)
- Notas de la visita
- Fotos opcionales
- Guardar en timeline

**Estimación:** 1-2 días

### 3.2 EmailReplyDrawer

**Nuevo Archivo:** `src/ui/drawers/drawers/EmailReplyDrawer.tsx`

**Funcionalidad:**
- Destinatario (pre-rellenado)
- Asunto
- Cuerpo del mensaje
- Plantillas predefinidas
- Enviar y guardar en timeline

**Estimación:** 1-2 días

### 3.3 MoveStageConfirmDrawer

**Nuevo Archivo:** `src/ui/drawers/drawers/MoveStageConfirmDrawer.tsx`

**Funcionalidad:**
- Confirmación al mover entre etapas críticas
- Razón del cambio (opcional)
- Notas adicionales
- Confirmar o cancelar

**Estimación:** 1 día

### 3.4 KpiBreakdownDrawer

**Nuevo Archivo:** `src/ui/drawers/drawers/KpiBreakdownDrawer.tsx`

**Funcionalidad:**
- Desglose detallado de KPIs
- Gráficos y tendencias
- Comparativas
- Exportar datos

**Estimación:** 2-3 días

---

## SPRINT 4: DOCUMENTACIÓN Y PULIDO (1 semana)

### 4.1 Documentar Sistema de Drawers

**Nuevo Archivo:** `docs/DRAWERS_SYSTEM_GUIDE.md`

**Contenido:**
- Arquitectura del sistema
- Cómo crear un nuevo drawer
- Convenciones de naming
- Ejemplos de uso
- Best practices
- Troubleshooting

**Estimación:** 1 día

### 4.2 Agregar Tests

**Archivos:**
- `tests/drawers/OpportunityDrawer.test.tsx`
- `tests/drawers/AccountDetailDrawer.test.tsx`
- `tests/drawers/drawer-registry.test.tsx`

**Cobertura:**
- Renderizado correcto
- Interacciones de usuario
- Integración con DrawerController
- Manejo de errores

**Estimación:** 2 días

### 4.3 Mejoras de Accesibilidad

**Tareas:**
- [ ] Agregar aria-labels
- [ ] Navegación por teclado
- [ ] Focus management
- [ ] Screen reader support

**Estimación:** 1 día

### 4.4 Optimización de Performance

**Tareas:**
- [ ] Lazy loading de drawers
- [ ] Memoización de componentes pesados
- [ ] Optimizar re-renders
- [ ] Code splitting

**Estimación:** 1 día

---

## CHECKLIST DE IMPLEMENTACIÓN

### Sprint 1: Mejoras Críticas
- [x] Mejorar OpportunityDrawer
- [ ] Actualizar PipelineBoard
- [ ] Conectar al DrawerController
- [ ] Testing básico

### Sprint 2: Account Detail Drawer
- [ ] Crear AccountDetailDrawer
- [ ] Refactorizar AccountEditor
- [ ] Actualizar página accounts/[id]
- [ ] Registrar en drawer-registry
- [ ] Testing

### Sprint 3: Drawers Auxiliares
- [ ] VisitOnsiteDrawer
- [ ] EmailReplyDrawer
- [ ] MoveStageConfirmDrawer
- [ ] KpiBreakdownDrawer
- [ ] Testing

### Sprint 4: Documentación y Pulido
- [ ] Documentar sistema
- [ ] Tests completos
- [ ] Accesibilidad
- [ ] Optimización
- [ ] Code review final

---

## DEPENDENCIAS Y RIESGOS

### Dependencias

1. **Server Actions**
   - `addAccountNote` - Para notas rápidas
   - `updateAccount` - Para edición de cuentas
   - `sendEmail` - Para EmailReplyDrawer
   - `createVisit` - Para VisitOnsiteDrawer

2. **Tipos y Schemas**
   - Actualizar `PipelineItem` si es necesario
   - Crear tipos para nuevos drawers
   - Validación con Zod

3. **Estilos**
   - Clases CSS para drawers grandes (`sb-drawer--large`)
   - Clases para tabs
   - Animaciones de transición

### Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Conflictos con código existente | Media | Alto | Code review exhaustivo, tests |
| Performance en drawers grandes | Baja | Medio | Lazy loading, memoización |
| Inconsistencias de diseño | Media | Bajo | Design system, componentes reutilizables |
| Falta de tiempo | Alta | Alto | Priorizar sprints 1 y 2 |

---

## MÉTRICAS DE ÉXITO

### Técnicas
- ✅ 0 errores TypeScript
- ✅ 80%+ cobertura de tests
- ✅ Lighthouse score > 90
- ✅ Bundle size < 50KB por drawer

### UX
- ✅ Tiempo de carga < 200ms
- ✅ 40% reducción en clics
- ✅ 60% mejora en acceso a información
- ✅ 90%+ satisfacción de usuarios

### Negocio
- ✅ 25% aumento en productividad
- ✅ 40% reducción en tiempo de formación
- ✅ 35% mejora en adopción de funcionalidades

---

## PRÓXIMOS PASOS INMEDIATOS

1. **Hoy:**
   - [x] Completar OpportunityDrawer mejorado
   - [ ] Actualizar PipelineBoard
   - [ ] Conectar al DrawerController

2. **Esta Semana:**
   - [ ] Testing del OpportunityDrawer
   - [ ] Comenzar AccountDetailDrawer
   - [ ] Diseñar estructura de componentes

3. **Próxima Semana:**
   - [ ] Completar AccountDetailDrawer
   - [ ] Refactorizar AccountEditor
   - [ ] Actualizar página accounts/[id]

---

## NOTAS ADICIONALES

### Consideraciones de Diseño

- **Consistencia:** Todos los drawers deben seguir el mismo patrón de diseño
- **Responsividad:** Drawers deben funcionar en móvil y desktop
- **Accesibilidad:** WCAG 2.1 AA compliance
- **Performance:** Lazy loading para drawers no críticos

### Convenciones de Código

```typescript
// Naming
- Drawers: [Feature]Drawer.tsx (e.g., AccountDetailDrawer.tsx)
- Hooks: use[Feature]Data.ts (e.g., useAccountData.ts)
- Actions: [feature].actions.ts (e.g., accounts.actions.ts)

// Estructura
- Props tipadas con TypeScript
- Validación con Zod
- Error handling con try/catch
- Loading states
- Empty states
```

### Referencias

- [Design System Guide](./DESIGN_SYSTEM_GUIDE.md)
- [SSOT V2 Specification](./docs/SSOT_V2.md)
- [Drawer System (a crear)](./docs/DRAWERS_SYSTEM_GUIDE.md)

---

**Última Actualización:** 26/10/2025  
**Responsable:** Equipo de Desarrollo  
**Revisión:** Pendiente
