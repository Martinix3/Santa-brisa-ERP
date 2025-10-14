# 🧠 Panel de Control Santa Brain

Sistema no-code para configurar reglas de automatización y gestión de tareas.

## 🚀 Setup Rápido

### 1. Instalar Defaults

```bash
cd Santa-brisa-ERP
NEXT_PUBLIC_FIREBASE_PROJECT_ID=santa-brisa-erp npx tsx scripts/setup-brain-defaults.ts
```

### 2. Acceder al Panel

```
http://localhost:3000/admin/brain
```

## 📋 Estructura Firestore

### `/system/config`
Configuración global de horarios y umbrales.

```json
{
  "schedules": {
    "dailyMorningHour": 9,
    "dailyEveningHour": 19,
    "visitFollowupHours": 3
  },
  "thresholds": {
    "noTouchDays30": 30,
    "noTouchDays60": 60,
    "noOrderDays45": 45,
    "noOrderDays90": 90
  },
  "strictCanonWrites": false
}
```

### `/rules/{ruleId}`
Reglas de automatización.

```typescript
{
  id: string,
  enabled: boolean,
  scope: 'DAILY' | 'WEEKLY' | 'EVENT_DRIVEN',
  name: string,
  description?: string,
  severity: 'INFO' | 'WARN' | 'CRIT',
  dedupeHours: number,
  condition: {
    kind: 'ACCOUNT' | 'TASK' | 'QUICKLOG',
    stageIn?: string[],
    minDaysSinceLastInteraction?: number,
    minDaysSinceLastOrder?: number
  },
  action: {
    createTask?: {
      title: string,
      dueInDays: number,
      priority: 'low' | 'med' | 'high' | 'critical',
      assignTo: 'ACCOUNT_OWNER',
      reason: string,
      tags: string[]
    }
  }
}
```

### `/brain/logs/{date}/{logId}`
Logs para dedupe y auditoría.

## 🎯 Reglas Incluidas

### 1. No-touch 30 días
- **Condición**: Cuentas ACTIVA/SEGUIMIENTO/POTENCIAL sin interacción 30+ días
- **Acción**: Crear tarea "Visita de cortesía" (+5 días, prioridad media)
- **Dedupe**: 48 horas

### 2. Sin pedido 45 días  
- **Condición**: Cuentas ACTIVA sin pedido 45+ días
- **Acción**: Crear tarea "Revisión consumo" (+3 días, prioridad alta)
- **Dedupe**: 48 horas

### 3. Sin pedido 90 días (DESACTIVADA)
- **Condición**: Cuentas ACTIVA/SEGUIMIENTO sin pedido 90+ días
- **Acción**: Crear tarea "URGENTE: Reactivación" (+2 días, crítica)
- **Dedupe**: 7 días

## 🎮 Uso del Panel

### Tab: Configuración
Ajusta horarios y umbrales sin tocar código:
- Resumen matutino (default: 9:00)
- Cierre del día (default: 19:00)
- Follow-up post-visita (default: +3h)
- Umbrales de rotación (30/60/45/90 días)

### Tab: Reglas
- **Toggle on/off**: Activa/desactiva reglas
- **🧪 Simular**: Preview de acciones sin tocar DB
- **▶️ Ejecutar Ahora**: Crea tareas reales

### Simulación
Antes de ejecutar, simula para ver:
- Nº total de tareas que se crearían
- Reparto por usuario
- Preview de cuentas afectadas

## 🔧 Server Actions

### `evaluateRules({ simulate, ruleIds })`
Motor principal que evalúa reglas y crea tasks.

```typescript
// Simular
const result = await evaluateRules({ simulate: true });
// → { totalActions: 42, byUser: {...}, accounts: [...] }

// Ejecutar
const result = await evaluateRules({ simulate: false });
// → Crea tasks reales + logs dedupe
```

### `getBrainConfig()` / `updateBrainConfig()`
Lee/actualiza configuración.

### `getBrainRules()` / `toggleBrainRule()`
Lista reglas / activa-desactiva.

## 🎯 Cómo Funciona

1. **Evaluación de Condiciones**
   - Lee reglas habilitadas
   - Filtra cuentas por stage
   - Verifica días desde última interacción/pedido
   - Aplica dedupe (revisa logs recientes)

2. **Creación de Tasks**
   - Template replacement (`{{account.name}}`)
   - Calcula due date (+X días)
   - Asigna a owner de cuenta
   - Añade tags ['brain', 'autogen', ...]
   - Guarda `origin: 'brain'` + `autoContext`

3. **Dedupe**
   - Hash: `md5(ruleId:accountId)`
   - Log en `/brain/logs/{today}`
   - Respeta `dedupeHours` de la regla

## 📦 Próximas Fases

### Fase 2: Campañas
- Lanzamiento de productos
- Push de SKU
- Sprints de eventos
- Cuotas diarias por rep
- Auto-asignación

### Fase 3: Monitoreo
- KPIs en tiempo real
- Cumplimiento por usuario
- Alertas de salud del sistema
- Ranking de performance

## 🐛 Troubleshooting

### Error: projectId not defined
```bash
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=santa-brisa-erp
```

### Reglas no crean tasks
1. Verificar que la regla está `enabled: true`
2. Revisar condiciones (stages, días)
3. Simular primero para ver preview
4. Verificar dedupe (puede estar bloqueado)

### Tasks duplicadas
- Aumentar `dedupeHours` en la regla
- Verificar logs en `/brain/logs/{date}`

## 💡 Tips

- **Empieza con simulación** siempre
- **Ajusta umbrales** según tu operativa (30 días puede ser muy poco/mucho)
- **Dedupe conservador**: 48h es seguro, 24h puede duplicar
- **Prioridades**: usa 'critical' solo para urgencias reales
- **Tags**: añade tags custom para filtrar en agenda

## 🔗 Links

- Panel: `/admin/brain`
- Server Actions: `src/server/actions/brain.actions.ts`
- Types: `src/domain/brain.ts`
- UI: `src/app/(app)/admin/brain/`
