# Fase 2 - Inteligencia y Automatización: Plan Detallado

**Inicio:** 18 de Enero de 2025  
**Duración Estimada:** 3-4 semanas  
**Prerequisitos:** ✅ Fase 0 y Fase 1 completadas

---

## 🎯 OBJETIVOS DE FASE 2

1. **Refactorizar Santa Brain** - Modularizar el código monolítico de 600+ líneas
2. **Gemini NLP Real** - Reemplazar heurísticas por inteligencia artificial
3. **Analyzers Activos** - Activar hooks Gemini en todos los módulos
4. **Tasks Automáticas** - Generar tareas desde eventos y alertas
5. **Dashboard Insights** - Visualizar recomendaciones de IA

---

## 📋 TRACKS DE IMPLEMENTACIÓN

### TRACK 1: Refactorización de Santa Brain (5-7 días)

#### Estado Actual
- `src/server/actions/santa-brain.actions.ts` - **600+ líneas** monolíticas
- Responsabilidades mezcladas: fuzzy matching, creación de cuentas, registro de interacciones, pedidos, eventos, POS, tareas
- Heurísticas básicas de palabras negativas
- Tasks legacy vs TaskNew inconsistentes

#### Objetivo
Separar en servicios modulares con responsabilidad única:

```
src/server/santa-brain/
├── services/
│   ├── account-resolver.service.ts      # Fuzzy matching + creación
│   ├── interaction.service.ts           # Registro de interacciones
│   ├── order.service.ts                 # Creación de pedidos
│   ├── pos-tactic.service.ts            # Registro POS
│   ├── event.service.ts                 # Eventos de marketing
│   ├── task.service.ts                  # Generación de tareas
│   └── gemini-classifier.service.ts     # NLP con Gemini
├── orchestrator.ts                      # Coordina todos los services
└── types.ts                             # Interfaces compartidas
```

#### Arquitectura

```typescript
// orchestrator.ts
export class SantaBrainOrchestrator {
  constructor(
    private accountResolver: AccountResolverService,
    private interactionService: InteractionService,
    private orderService: OrderService,
    private posTacticService: PosTacticService,
    private eventService: EventService,
    private taskService: TaskService,
    private geminiClassifier: GeminiClassifierService
  ) {}
  
  async process(input: QuickLogInput): Promise<ProcessResult> {
    // 1. Clasificar input con Gemini
    const classification = await this.geminiClassifier.classify(input.text);
    
    // 2. Resolver cuenta
    const account = await this.accountResolver.resolveAccount(input.accountHint);
    
    // 3. Ejecutar acciones según clasificación
    const results = await this.executeActions(classification, account, input);
    
    // 4. Generar tasks automáticas
    const tasks = await this.taskService.createAutomaticTasks(
      classification, 
      account,
      results
    );
    
    // 5. Registrar todo en TraceEvents
    await this.recordTraceEvents(results, tasks);
    
    return { account, results, tasks, classification };
  }
}
```

#### Entregables Track 1
- [ ] `src/server/santa-brain/services/account-resolver.service.ts`
- [ ] `src/server/santa-brain/services/interaction.service.ts`
- [ ] `src/server/santa-brain/services/order.service.ts`
- [ ] `src/server/santa-brain/services/pos-tactic.service.ts`
- [ ] `src/server/santa-brain/services/event.service.ts`
- [ ] `src/server/santa-brain/services/task.service.ts`
- [ ] `src/server/santa-brain/orchestrator.ts`
- [ ] Migrar `saveSantaBrainData` a usar Orchestrator
- [ ] Tests unitarios por service

---

### TRACK 2: Gemini NLP Real (3-5 días)

#### Estado Actual
- Heurísticas básicas: busca palabras como "pedido", "cajas", "negativo"
- No extrae entidades (productos, cantidades, fechas)
- No determina intención real del usuario
- No sugiere Next Best Action

#### Objetivo
Implementar clasificación real con Gemini AI:

```typescript
// services/gemini-classifier.service.ts
export class GeminiClassifierService {
  async classify(input: string): Promise<Classification> {
    const prompt = `
      Analiza esta interacción comercial y extrae:
      1. Intención principal (visita, pedido, cobro, pos, evento, nota)
      2. Sentimiento (positivo, neutral, negativo)
      3. Entidades mencionadas:
         - Productos (sku, nombre, cantidad)
         - Fechas (próxima visita, entrega, etc)
         - Importes (precios, cobros pendientes)
         - Personas (nombres de contactos)
      4. Next Best Action sugerida
      5. Riesgo de churn (0-100)
      6. Oportunidad de upsell (productos a sugerir)
      
      Input: "${input}"
      
      Responde en JSON con estructura:
      {
        "intention": "VISITA | PEDIDO | COBRO | POS | EVENTO | NOTA",
        "sentiment": "POSITIVE | NEUTRAL | NEGATIVE",
        "entities": {
          "products": [{sku, name, qty}],
          "dates": [{type, date}],
          "amounts": [{type, value, currency}],
          "people": [name]
        },
        "nextBestAction": "string",
        "churnRisk": number (0-100),
        "upsellOpportunity": [{sku, reason}],
        "confidence": number (0-1)
      }
    `;
    
    const result = await this.geminiClient.generate(prompt);
    return JSON.parse(result);
  }
}
```

#### Entregables Track 2
- [ ] `src/server/santa-brain/services/gemini-classifier.service.ts`
- [ ] Prompts optimizados para extracción de entidades
- [ ] Sistema de confianza (confidence score)
- [ ] Fallback a heurísticas si Gemini falla
- [ ] Tests con casos reales

---

### TRACK 3: Analyzers Gemini Activos (5-7 días)

#### Analyzers Existentes (Actualmente Stubbed)
Ya existen en el proyecto pero no están activos:
- `src/server/gemini/analyzers/quality-analyzer.ts`
- `src/server/gemini/analyzers/warehouse-analyzer.ts`
- `src/server/gemini/analyzers/bom-analyzer.ts`
- `src/server/gemini/analyzers/sales-analyzer.ts`

#### Objetivo
Activar y conectar con TraceEvents y businessRules:

```typescript
// src/server/gemini/hooks/quality-hook.ts
export async function analyzeQcRelease(
  lot: Lot, 
  tests: QcTest[]
): Promise<GeminiDecision> {
  const analysis = await QualityAnalyzer.analyze({
    lot,
    tests,
    historicalData: await getHistoricalQcData(lot.itemId),
    businessRules: await getQualityRules()
  });
  
  return {
    decision: analysis.decision, // AUTO_APPROVE | HOLD | REJECT | REVIEW
    severity: analysis.severity,
    confidence: analysis.confidence,
    reasoning: analysis.reasoning,
    suggestedActions: analysis.actions,
    alertKey: generateAlertKey('QC_DECISION', lot.lotNumber)
  };
}

// src/server/gemini/hooks/warehouse-hook.ts
export async function analyzeInventoryLevel(
  item: Item,
  onHand: OnHandView[]
): Promise<GeminiAlert[]> {
  const alerts = [];
  
  // Detectar stock bajo
  if (totalStock < businessRules.inventory.lowStockThreshold) {
    alerts.push({
      severity: 'HIGH',
      type: 'LOW_STOCK',
      message: `Stock bajo de ${item.name}`,
      suggestedAction: 'Generar orden de compra',
      data: { itemId: item.id, currentStock: totalStock }
    });
  }
  
  // Detectar lotes próximos a caducar
  const nearExpiry = onHand.filter(lot => 
    daysUntilExpiry(lot.expiryAt) < businessRules.inventory.nearExpiryDays
  );
  
  if (nearExpiry.length > 0) {
    alerts.push({
      severity: 'MEDIUM',
      type: 'NEAR_EXPIRY',
      message: `${nearExpiry.length} lotes próximos a caducar`,
      suggestedAction: 'Priorizar uso en producción o promoción',
      data: { lots: nearExpiry.map(l => l.lotNumber) }
    });
  }
  
  return alerts;
}

// src/server/gemini/hooks/sales-hook.ts
export async function analyzeAccountRisk(
  account: Account,
  interactions: Interaction[],
  orders: OrderSellOut[]
): Promise<GeminiInsight> {
  const analysis = await SalesAnalyzer.analyze({
    account,
    interactions,
    orders,
    businessRules: await getSalesRules()
  });
  
  return {
    churnRisk: analysis.churnRisk, // 0-100
    churnReasons: analysis.reasons,
    nextBestAction: analysis.nba,
    suggestedProducts: analysis.upsell,
    optimalVisitDate: analysis.visitDate,
    confidence: analysis.confidence
  };
}
```

#### Entregables Track 3
- [ ] Activar QualityAnalyzer con decisiones reales
- [ ] Activar WarehouseAnalyzer con alertas de stock
- [ ] Activar SalesAnalyzer con detección churn
- [ ] Activar ProductionAnalyzer con análisis de mermas
- [ ] Dashboard de insights Gemini
- [ ] Persistir análisis en GeminiAnalysis collection
- [ ] Integrar con sistema de tasks

---

### TRACK 4: Tasks Automáticas (3-5 días)

#### Objetivo
Generar tasks automáticas desde:
1. Alertas Gemini
2. Eventos de negocio (TraceEvents)
3. Reglas configurables (businessRules)

```typescript
// src/server/santa-brain/services/task.service.ts
export class TaskAutomationService {
  async createTasksFromGeminiInsight(
    insight: GeminiInsight,
    context: TaskContext
  ): Promise<TaskNew[]> {
    const tasks: TaskNew[] = [];
    
    // Churn risk alto → crear task de visita urgente
    if (insight.churnRisk > 70) {
      tasks.push(await this.createTask({
        kind: 'VISITA',
        title: `URGENTE: Riesgo churn ${context.accountName}`,
        priority: 'URGENT',
        dueAt: addDays(new Date(), 2),
        accountId: context.accountId,
        department: 'VENTAS',
        source: 'AUTO_RULE',
        data: {
          churnRisk: insight.churnRisk,
          reasons: insight.churnReasons,
          geminiInsightId: insight.id
        }
      }));
    }
    
    // Stock bajo → crear task de pedido a proveedor
    if (insight.type === 'LOW_STOCK') {
      tasks.push(await this.createTask({
        kind: 'PEDIDO',
        title: `Reabastecer ${insight.itemName}`,
        priority: 'HIGH',
        department: 'ALMACEN',
        source: 'AUTO_RULE',
        data: insight.data
      }));
    }
    
    return tasks;
  }
  
  async createTasksFromTraceEvent(
    event: TraceEvent
  ): Promise<TaskNew[]> {
    // QC rechazado → task de gestión de incidencia
    if (event.kind === 'QC_TEST' && event.data.decision === 'REJECTED') {
      return [await this.createTask({
        kind: 'ADMIN',
        title: `Gestionar lote rechazado ${event.links.lotNumber}`,
        priority: 'HIGH',
        department: 'CALIDAD',
        source: 'EVENT',
        data: event.data
      })];
    }
    
    // Envío con excepción → task de seguimiento
    if (event.kind === 'SHIPMENT' && event.data.status === 'exception') {
      return [await this.createTask({
        kind: 'GENERICA',
        title: `Resolver incidencia envío ${event.links.shipmentId}`,
        priority: 'URGENT',
        department: 'ALMACEN',
        source: 'EVENT',
        data: event.data
      })];
    }
    
    return [];
  }
}
```

#### Entregables Track 4
- [ ] TaskAutomationService con reglas configurables
- [ ] Integración con TraceEventFactory (on event created → check tasks)
- [ ] Dashboard de tasks automáticas vs manuales
- [ ] Configuración de reglas en businessRules.ts
- [ ] Tests de generación automática

---

### TRACK 5: QuickLog Evolution (5-7 días)

#### Estado Actual de QuickLog
- Interfaz voz/texto funcional
- Integrado con Santa Brain (saveSantaBrainData)
- Flujos básicos implementados (SBFlows.tsx)
- Fuzzy matching de cuentas

#### Problemas Actuales
- Heurísticas simples (busca palabras clave)
- No aprende de interacciones previas
- Confirmación manual necesaria
- Limitado a texto/voz básico
- No sugiere productos basado en contexto
- No detecta oportunidades de upsell

#### Objetivo: QuickLog Inteligente

**Características Nuevas:**

1. **NLP Avanzado con Gemini**
```typescript
// Cuando el comercial dice:
"Visitado Bar El Ancla, pidieron 3 cajas de Santa Brisa para el viernes"

// QuickLog con Gemini extrae:
{
  intention: "VISITA + PEDIDO",
  account: {
    name: "Bar El Ancla",
    confidence: 0.95,
    matchedId: "ACC-123" // Fuzzy match mejorado
  },
  entities: {
    products: [
      { name: "Santa Brisa", qty: 3, unit: "cajas", sku: "FG-SB-001" }
    ],
    dates: [
      { type: "entrega", date: "próximo viernes", parsed: "2025-01-24" }
    ]
  },
  sentiment: "POSITIVE",
  nextBestAction: "Confirmar pedido y verificar stock",
  suggestedProducts: [
    { sku: "FG-MERCH-POSAVASOS", reason: "Complemento para nuevo cliente" }
  ],
  confidence: 0.92
}
```

2. **Sugerencias Contextuales**
```typescript
interface QuickLogSuggestions {
  // Basado en histórico de la cuenta
  frequentProducts: Product[];
  
  // Basado en temporada
  seasonalRecommendations: Product[];
  
  // Basado en análisis Gemini
  upsellOpportunities: Array<{
    product: Product;
    reason: string;
    expectedUplift: number;
  }>;
  
  // Acciones recomendadas
  recommendedActions: Array<{
    type: 'VISITA' | 'COBRO' | 'POS';
    reason: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}
```

3. **Extracción Automática de Entidades**
```typescript
// El comercial dice:
"Cliente Restaurante Mar Azul quiere probar producto. 
Dejé 2 botellas de muestra y pidió 1 caja para evento del sábado.
Pendiente cobro de 250€ de factura anterior."

// QuickLog extrae y crea automáticamente:
✅ Interaction (VISITA)
✅ Sample send (2 bottles)
✅ Order (1 caja, entrega sábado)
✅ Task de cobro (250€ pendiente)
✅ Event (evento sábado)

// TODO: Solo requiere confirmación del usuario
```

4. **Modo Conversacional**
```typescript
// QuickLog pregunta inteligentemente:
Usuario: "Visité cliente y pidieron producto"
QuickLog: "¿Qué cuenta visitaste?"
Usuario: "El bar de la plaza"
QuickLog: "Encontré 2 opciones:
  1. Bar Plaza Mayor (última visita hace 5 días)
  2. Bar La Plaza (última visita hace 2 meses)
  ¿Cuál es?"
Usuario: "El primero"
QuickLog: "✓ Bar Plaza Mayor
          ¿Qué producto pidieron y cuántas unidades?"
```

5. **QuickLog Mobile Optimizado**
- Botones de acción rápida
- Voz continua (no requiere stop/start)
- Offline mode con sync
- Fotos inline (OCR de albaranes)
- Geo-location automática
- Shortcuts por tipo de interacción

6. **Analytics de QuickLog**
```typescript
interface QuickLogAnalytics {
  usage: {
    logsPerDay: number;
    avgResponseTime: number; // Tiempo desde captura hasta confirmación
    voiceVsText: { voice: number; text: number };
  };
  
  accuracy: {
    accountMatchRate: number; // % de cuentas correctamente identificadas
    productMatchRate: number; // % de productos correctamente identificados
    autoConfirmRate: number;  // % que no requiere corrección
  };
  
  impact: {
    interactionsCreated: number;
    ordersGenerated: number;
    tasksCreated: number;
    avgOrderValue: number;
  };
  
  gemini: {
    avgConfidence: number;
    failureRate: number;
    fallbackToHeuristicRate: number;
  };
}
```

#### Arquitectura QuickLog + Santa Brain

```typescript
// Nueva arquitectura integrada
QuickLog (UI)
    ↓ (voz/texto + fotos + location)
    ↓
SantaBrainOrchestrator
    ↓
    ├─→ GeminiClassifier.classify()
    │     ├─ Extrae entidades
    │     ├─ Determina intención
    │     ├─ Analiza sentimiento
    │     └─ Sugiere NBA
    ↓
    ├─→ AccountResolver.resolve()
    │     ├─ Fuzzy match mejorado
    │     ├─ Crea si no existe
    │     └─ Enriquece con contexto
    ↓
    ├─→ [Services] (según clasificación)
    │     ├─ InteractionService
    │     ├─ OrderService
    │     ├─ PosTacticService
    │     ├─ EventService
    │     └─ TaskService
    ↓
    ├─→ TraceEventFactory
    │     └─ Registra todo
    ↓
    └─→ GeminiInsights
          ├─ Detecta churn risk
          ├─ Sugiere upsell
          └─ Recomienda siguiente acción
```

#### Entregables Track 5 (QuickLog)
- [ ] `src/features/quicklog/services/quicklog-ai.service.ts`
- [ ] Integración con GeminiClassifier
- [ ] Sugerencias contextuales en UI
- [ ] Modo conversacional (multi-turn)
- [ ] Mobile optimization (offline, voz continua)
- [ ] Analytics dashboard de QuickLog
- [ ] Tests de extracción de entidades
- [ ] Documentación de uso mejorado

---

### TRACK 6: Dashboard de Insights Gemini (2-3 días)

#### Objetivo
Página `/ops/gemini-insights` que muestre:

```typescript
interface GeminiDashboard {
  summary: {
    totalInsights: number;
    criticalAlerts: number;
    tasksGenerated: number;
    avgConfidence: number;
  };
  
  recentInsights: Array<{
    id: string;
    module: 'QUALITY' | 'WAREHOUSE' | 'SALES' | 'PRODUCTION';
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    suggestedAction: string;
    createdAt: string;
    status: 'NEW' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';
    assignedTaskId?: string;
  }>;
  
  byModule: Record<string, {
    count: number;
    avgSeverity: number;
    topInsights: GeminiInsight[];
  }>;
  
  trends: {
    insightsPerDay: ChartData;
    actionRate: number; // % de insights que generaron acción
    avgResponseTime: number; // Tiempo medio hasta acción
  };
}
```

#### Entregables Track 5
- [ ] Página `/ops/gemini-insights`
- [ ] Componentes de visualización de insights
- [ ] Filtros por módulo, severidad, estado
- [ ] Acción: Asignar task, Marcar revisado, Descartar
- [ ] Gráficas de tendencias

---

## 🎯 PRIORIZACIÓN DE TRACKS

### Semana 1 (Días 1-7)
- **Track 1:** Refactorizar Santa Brain (Days 1-5)
- **Track 2:** Gemini NLP Real (Days 3-7)

### Semana 2 (Días 8-14)
- **Track 3:** Analyzers Activos (Days 8-12)
- **Track 4:** Tasks Automáticas (Days 10-14)

### Semana 3 (Días 15-21)
- **Track 5:** Dashboard Insights (Days 15-17)
