# Proyecto "Data Lens" 🔍
## Sistema de Trazabilidad de Datos en Vivo

---

## 🎯 Objetivos Clave

1. **Fiabilidad Absoluta**: Alcanzar un 100% de confianza en que los datos mostrados en la UI son correctos, provienen de la fuente adecuada y sus cálculos son los esperados.

2. **Acelerar Desarrollo y Depuración**: Reducir >80% el tiempo necesario para encontrar la causa raíz de un problema de datos, pasando de horas de búsqueda en el código a segundos de inspección visual.

3. **Auto-documentación del Sistema**: Crear una "documentación viva" que se actualiza automáticamente con el código.

4. **Gobernanza de Datos Formalizada**: Establecer un proceso claro de QA donde los flujos de datos críticos son revisados y aprobados por el equipo.

---

## 🏗️ Arquitectura de la Solución

### 1. **SSOT (`src/domain/ssot.ts`)**
- ✅ Ya existe
- Es el plano y la verdad fundamental del modelo de datos
- Define todas las interfaces y tipos

### 2. **Analizador Estático de Código (El "Mapper")**
- 🔄 **FASE 1** (2-3 semanas)
- Script que se ejecuta durante el desarrollo
- Lee todo el código de la aplicación usando TypeScript Compiler API
- Genera `metadata.json` con el mapa de dependencias completo
- Responde: "¿Qué componente usa qué campo del SSOT?"

**Tecnología:**
- TypeScript Compiler API
- AST (Abstract Syntax Tree) traversal
- Pattern matching para detectar accesos a datos

**Output: `metadata.json`**
```json
{
  "entities": {
    "accounts": {
      "reads": [
        {
          "component": "AccountsPage",
          "file": "src/app/(app)/accounts/page.tsx",
          "fields": ["name", "stage", "ownerId"],
          "line": 45
        }
      ],
      "writes": [
        {
          "component": "NewAccountDialog",
          "file": "src/features/accounts/components/NewAccountDialog.tsx",
          "fields": ["name", "segment", "stage"],
          "line": 123
        }
      ],
      "computes": [
        {
          "function": "getPipelineAlerts",
          "file": "src/lib/pipeline-helpers.ts",
          "fields": ["stage", "lastInteractionAt"],
          "line": 89
        }
      ]
    }
  }
}
```

### 3. **Capa de Instrumentación (El "Tracer" en Tiempo Real)**
- 🔄 **FASE 3** (3 semanas)
- Envuelve las llamadas a Firestore en desarrollo
- Intercepta y registra cada lectura/escritura
- Ejecuta validaciones de calidad en tiempo real
- Detecta: valores vacíos, tipos incorrectos, datos hardcodeados

**Tecnología:**
- Proxy pattern sobre SDK de Firestore
- Event emitter para comunicar con UI
- Validadores automáticos basados en SSOT

**Ejemplo de Traza:**
```typescript
{
  timestamp: "2025-01-06T12:00:00Z",
  operation: "read",
  collection: "accounts",
  fields: ["name", "stage"],
  component: "AccountCard",
  value: { name: "Hotel Ritz", stage: "ACTIVA" },
  quality: {
    valid: true,
    warnings: [],
    errors: []
  }
}
```

### 4. **UI de Trazabilidad (El "Visualizador")**
- 🔄 **FASE 2** (2 semanas) + **FASE 4** (1-2 semanas)
- Interfaz de usuario para el "Modo Traza"
- Inspector visual con linaje de datos
- Sistema de aprobación y gobernanza

**Componentes UI:**
- Toggle "Modo Traza" (esquina superior derecha)
- Overlay de resaltado con bordes punteados
- Panel Inspector flotante
- Sistema de badges de validación
- Panel de aprobación QA

---

## 🛣️ Plan de Implementación

### ✅ FASE 0: Fundación Manual (COMPLETADA)
**Duración**: 1 día  
**Estado**: ✅ Completada

**Entregables:**
- ✅ Dashboard de auditoría básico en `/admin/audit`
- ✅ Mapeo manual en `data-flow-mapper.ts`
- ✅ 13 componentes UI documentados
- ✅ 6 formularios documentados
- ✅ 5 funciones de cálculo documentadas

**Archivos:**
- `src/app/(app)/admin/audit/page.tsx`
- `src/features/admin/components/DataAuditDashboard.tsx`
- `src/lib/audit/data-flow-mapper.ts`

---

### 🔄 FASE 1: Análisis Estático Automático
**Duración**: 2-3 semanas  
**Estado**: 🔄 En progreso

**Objetivo**: Automatizar la generación del mapa de dependencias usando TypeScript Compiler API.

**Tareas:**
- [ ] 1.1: Script base con TypeScript Compiler API
- [ ] 1.2: Detectar componentes que leen datos (`data.accounts`, `useData()`, etc.)
- [ ] 1.3: Detectar formularios que escriben datos (mutaciones, `addDoc`, `updateDoc`)
- [ ] 1.4: Detectar funciones de cálculo que procesan datos
- [ ] 1.5: Generar `metadata.json` completo
- [ ] 1.6: Integrar en `npm run trace:map`
- [ ] 1.7: Script de validación del metadata
- [ ] 1.8: CI/CD: ejecutar en pre-commit

**Tecnologías:**
```typescript
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
```

**Entregable**: 
- Script: `scripts/trace-mapper.ts`
- Output: `trace-metadata.json`
- Comando: `npm run trace:map`

**Métricas de Éxito:**
- Detecta >95% de los componentes manualmente documentados
- Se ejecuta en <30 segundos
- metadata.json tiene <5% de falsos positivos

---

### 🔄 FASE 2: Inspector Visual (Modo Lectura)
**Duración**: 2 semanas  
**Estado**: ⏳ Pendiente (depende de Fase 1)

**Objetivo**: Construir la UI del "Modo Traza" y mostrar información estática.

**Tareas:**
- [ ] 2.1: Toggle "Modo Traza" global
- [ ] 2.2: Sistema de resaltado con bordes punteados
- [ ] 2.3: Panel Inspector flotante
- [ ] 2.4: Visualización del linaje de lectura (metadata.json)
- [ ] 2.5: Visualización del linaje de escritura
- [ ] 2.6: Wireframes en miniatura de componentes
- [ ] 2.7: Navegación código ↔ UI
- [ ] 2.8: Shortcuts de teclado

**Componentes:**
```
src/features/trace/
├── TraceProvider.tsx          # Context + estado global
├── TraceModeToggle.tsx        # Toggle UI
├── TraceOverlay.tsx           # Overlay de resaltado
├── TraceInspector.tsx         # Panel inspector
├── components/
│   ├── LineageView.tsx        # Vista del linaje
│   ├── ComponentPreview.tsx   # Wireframe
│   └── FieldBadge.tsx         # Badge de campo
└── hooks/
    ├── useTraceMode.ts
    └── useTraceInspect.ts
```

**Entregable**: 
- "Modo Traza" funcional con linaje estático
- Inspector navegable
- Ya útil para exploración de código

**Métricas de Éxito:**
- Clic en cualquier elemento → Inspector en <500ms
- Linaje completo visible
- >90% satisfacción del equipo en usabilidad

---

### 🔄 FASE 3: Trazabilidad en Tiempo Real + Calidad
**Duración**: 3 semanas  
**Estado**: ⏳ Pendiente (depende de Fase 2)

**Objetivo**: Dar vida al inspector con datos y validaciones en tiempo real.

**Tareas:**
- [ ] 3.1: Wrapper sobre Firestore SDK
- [ ] 3.2: Event bus para comunicar trazas
- [ ] 3.3: Conectar Tracer → Inspector
- [ ] 3.4: Módulo de Calidad de Datos
- [ ] 3.5: Validadores automáticos (tipos, nulls, formato)
- [ ] 3.6: Detección de datos hardcodeados
- [ ] 3.7: Visualización de advertencias en Inspector
- [ ] 3.8: Performance: solo en desarrollo

**Arquitectura:**
```typescript
// src/lib/trace/firestore-tracer.ts
class FirestoreTracer {
  private events: TraceEvent[] = [];
  
  wrapQuery(query: Query) {
    return new Proxy(query, {
      get: (target, prop) => {
        if (prop === 'get') {
          return async () => {
            const result = await target.get();
            this.logRead(result);
            return result;
          };
        }
      }
    });
  }
  
  validateData(data: any, schema: Interface) {
    // Validaciones contra SSOT
  }
}
```

**Entregable**: 
- Inspector con datos en vivo
- Advertencias de calidad visibles
- Sistema de validación automático

**Métricas de Éxito:**
- 0 falsos positivos en validaciones
- Overhead de rendimiento <10%
- Detecta >95% de problemas de calidad

---

### 🔄 FASE 4: Flujo de Aprobación y Gobernanza
**Duración**: 1-2 semanas  
**Estado**: ⏳ Pendiente (depende de Fase 3)

**Objetivo**: Completar con sistema de validación manual y QA.

**Tareas:**
- [ ] 4.1: Panel de aprobación en Inspector
- [ ] 4.2: Botones "Aprobar Traza" / "Reportar Problema"
- [ ] 4.3: Storage de estado de validación
- [ ] 4.4: Badges de estado en UI principal (verde/rojo)
- [ ] 4.5: Dashboard de gobernanza
- [ ] 4.6: Reporte de trazas no aprobadas
- [ ] 4.7: Integración con flujo de QA
- [ ] 4.8: Documentación del proceso

**Storage:**
```typescript
// Firestore collection o metadata.json extendido
interface TraceApproval {
  traceId: string;
  component: string;
  approvedBy: string;
  approvedAt: string;
  status: 'approved' | 'rejected' | 'pending';
  notes?: string;
}
```

**Entregable**: 
- Plataforma de QA de datos completa
- Proceso de gobernanza definido
- Métricas de cobertura de validación

**Métricas de Éxito:**
- >80% de componentes críticos aprobados
- Proceso de QA integrado en workflow
- Dashboard de gobernanza usado semanalmente

---

## 💻 Stack Tecnológico

### Análisis Estático (Fase 1)
- **TypeScript Compiler API** (`typescript` package)
- AST traversal y análisis
- File system scanning

### UI de Trazabilidad (Fase 2-4)
- **React Context** para estado global
- **Portals** para overlay y panel flotante
- **CSS Modules** o **Tailwind** para estilos
- **React Flow** (opcional) para visualizaciones de grafo

### Instrumentación (Fase 3)
- **Proxy Pattern** sobre Firestore SDK
- **EventEmitter** para comunicación
- **Zod** o **Yup** para validaciones de schema

### Storage
- `metadata.json` para análisis estático
- Firestore collection `trace_approvals` para gobernanza
- Local storage para preferencias UI

---

## 🔑 Factores Críticos de Éxito

### Disciplina de Código
- ✅ Patrones consistentes en acceso a datos
- ✅ Usar siempre `useData()` hook
- ✅ No acceder directamente a Firestore sin Tracer
- ✅ Comentar código no estándar para el analyzer

### Gestión del Rendimiento
- ⚠️ **Instrumentación SOLO en desarrollo**
- ⚠️ Feature flag: `ENABLE_TRACE_MODE=true`
- ⚠️ Lazy loading del Inspector
- ⚠️ Debouncing de eventos de traza

### Inversión Inicial
- Reconocer que Fases 1-2 son infraestructura
- Beneficios completos aparecen en Fase 3-4
- ROI aumenta con cada nuevo feature desarrollado

### Proceso de QA
- Definir qué trazas son "críticas" y requieren aprobación
- Establecer responsables de QA de datos
- Integrar en Definition of Done: "Traza aprobada"

---

## 📊 Métricas de Éxito del Proyecto

### Cobertura
- ✅ >95% de componentes UI mapeados
- ✅ >95% de funciones de cálculo documentadas
- ✅ >90% de formularios rastreados

### Performance
- ⚡ Overhead en desarrollo <10%
- ⚡ metadata.json genera en <30s
- ⚡ Inspector abre en <500ms

### Adopción
- 👥 >80% del equipo usa Modo Traza semanalmente
- 👥 >50% de bugs de datos encontrados vía Inspector
- 👥 Tiempo de debugging reducido en >80%

### Calidad
- 🎯 0 incidentes de datos en producción relacionados con trazas aprobadas
- 🎯 >80% de componentes críticos validados
- 🎯 Dashboard de gobernanza revisado semanalmente

---

## 🚀 Próximos Pasos Inmediatos

### Ahora (Fase 1)
1. ✅ Documento del proyecto creado
2. 🔄 Crear script base `scripts/trace-analyzer.ts`
3. 🔄 Implementar detección de lecturas
4. 🔄 Generar primer `metadata.json`

### Comando para ejecutar
```bash
npm run trace:map
```

---

## 📚 Referencias y Recursos

### TypeScript Compiler API
- [Official Docs](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [AST Explorer](https://astexplorer.net/)
- [TS-Morph](https://ts-morph.com/) (alternativa más simple)

### Inspiración
- React DevTools (componentización)
- Redux DevTools (trazabilidad de estado)
- Chrome Network Panel (trazabilidad de requests)

---

## 🎓 Lecciones Aprendidas (se irá actualizando)

### Fase 0 (Manual)
- ✅ Mapeo manual funciona como PoC
- ✅ Dashboard útil incluso sin automatización
- ⚠️ Mantener manualmente es insostenible (13 componentes ya es complejo)
- 💡 Necesidad clara de automatización

---

**Última actualización**: 6/01/2025  
**Versión**: 1.0  
**Estado del Proyecto**: 🔄 Fase 1 iniciando
