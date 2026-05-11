# Plan de Mejora del Módulo Quality

**Fecha:** 2025-01-18  
**Enfoque:** Trazabilidad Enriquecida + QC Plans Extensibles

---

## 🎯 OBJETIVO

Mejorar dos áreas específicas del módulo Quality:

1. **Trazabilidad**: Mostrar información completa (proveedores, documentos, personas involucradas)
2. **QC Plans**: Hacer extensible para integración en producción y logística

---

## 📋 PARTE 1: TRAZABILIDAD ENRIQUECIDA

### Problema Actual

La trazabilidad muestra eventos básicos pero falta información clave:

```typescript
// ❌ ACTUAL: Datos limitados en eventos
{
  id: doc.id,
  kind: 'RECEIPT',
  title: `receipt: ${qty}`,
  details: `De ${from} a ${to}`,
  data: { documentUrl, notes }  // Datos mínimos
}
```

### Solución Propuesta

Enriquecer cada tipo de evento con toda la información disponible:

```typescript
// ✅ PROPUESTO: Datos completos
{
  id: doc.id,
  kind: 'RECEIPT',
  title: `Recepción: ${qty} ${uom} de ${itemName}`,
  details: `De ${supplierName} (${deliveryNote}) → ${location}`,
  data: {
    // Proveedor
    supplierId: move.fromLocationId,
    supplierName: supplier?.name,
    supplierContact: supplier?.email,
    
    // Documentos
    documentUrl: move.ref?.documentUrl,
    deliveryNote: move.ref?.deliveryNote,
    invoiceRef: move.ref?.invoiceRef,
    photos: move.ref?.photos || [],
    attachments: move.ref?.attachments || [],
    
    // Personas
    receivedBy: move.ref?.receivedBy,
    receivedByName: users.get(move.ref?.receivedBy)?.displayName,
    approvedBy: move.ref?.approvedBy,
    
    // Detalles transaccionales
    qty: move.qty,
    uom: move.uom,
    locationFrom: move.fromLocationId,
    locationTo: move.toLocationId,
    notes: move.ref?.note,
    timestamp: move.occurredAt,
    
    // Costos (si disponible)
    unitCost: move.unitCost,
    totalValue: move.qty * (move.unitCost || 0),
  }
}
```

### Tipos de Eventos a Enriquecer

#### 1. **RECEIPT** (Recepción)
```typescript
data: {
  supplier: { id, name, contact },
  documents: { deliveryNote, invoice, photos[] },
  personnel: { receivedBy, approvedBy },
  financial: { unitCost, totalValue, currency },
  quality: { qcPlanId, requiresInspection }
}
```

#### 2. **PRODUCTION_IN/OUT** (Producción)
```typescript
data: {
  productionOrder: { id, name, status },
  personnel: { operator, supervisor, qcInspector },
  materials: MaterialConsumption[],
  output: { targetQty, actualQty, deviation },
  quality: { tests[], decision, observations },
  documents: { batchRecord, checkSheets[], photos[] }
}
```

#### 3. **QC_TEST** (Tests de Calidad)
```typescript
data: {
  test: { parameterId, value, result, inSpec },
  inspector: { id, name, signature? },
  equipment: { id, calibrationDate },
  conditions: { temp, humidity, pressure },
  document: { reportUrl, certificateUrl },
  notes: string
}
```

#### 4. **SHIP/SALE** (Envío/Venta)
```typescript
data: {
  customer: { id, name, address },
  shipment: { carrier, trackingNumber, packingList },
  documents: { invoice, deliveryNote, cmr },
  personnel: { pickedBy, packedBy, shippedBy },
  quality: { releaseCertificate, coaIncluded }
}
```

#### 5. **TRANSFER** (Transferencia)
```typescript
data: {
  transfer: { from, to, reason },
  personnel: { requestedBy, approvedBy, movedBy },
  documents: { transferOrder, signedForm },
  quality: { qcStatusBefore, qcStatusAfter }
}
```

### Cambios en `getLotTraceability()`

```typescript
// Enriquecer cada tipo de evento
const enrichedEvents: TraceEvent[] = [];

for (const move of stockMoves) {
  const baseEvent = createBaseEvent(move);
  
  switch (move.reason.toUpperCase()) {
    case 'RECEIPT':
      const enrichedReceipt = await enrichReceiptEvent(move, { suppliers, users, items });
      enrichedEvents.push(enrichedReceipt);
      break;
      
    case 'PRODUCTION_IN':
    case 'PRODUCTION_OUT':
      const enrichedProduction = await enrichProductionEvent(move, { orders, users, items });
      enrichedEvents.push(enrichedProduction);
      break;
      
    case 'SHIP':
    case 'SALE':
      const enrichedShipment = await enrichShipmentEvent(move, { customers, users });
      enrichedEvents.push(enrichedShipment);
      break;
      
    // ... otros casos
  }
}

// Añadir eventos desde TraceEvents collection
const traceEventsSnap = await db
  .collection('traceEvents')
  .where('links.lotNumber', '==', lotNumber)
  .get();
  
traceEventsSnap.docs.forEach(doc => {
  enrichedEvents.push(doc.data() as TraceEvent);
});

return ok({
  lot,
  events: enrichedEvents.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
  ...restData
});
```

### Componente de Vista Mejorado

```typescript
// Componente de línea de tiempo más rico
function EnrichedTraceEventCard({ event, suppliers, users }: Props) {
  const config = EVENT_CONFIG[event.kind];
  
  return (
    <article className="flex gap-4 p-4 bg-background/60">
      {/* Icono y timestamp */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${config.color}`}>
          <config.icon size={20} />
        </div>
        <div className="w-px h-full bg-border/40 mt-2" />
      </div>
      
      <div className="flex-1 space-y-3">
        {/* Header */}
        <div>
          <p className="text-sm font-semibold text-foreground">{event.title}</p>
          <p className="text-xs text-muted-foreground">{event.details}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {formatDateTime(event.at)}
          </p>
        </div>
        
        {/* Personas involucradas */}
        {event.data?.personnel && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(event.data.personnel).map(([role, personId]) => (
              <PersonChip key={role} role={role} person={users.get(personId)} />
            ))}
          </div>
        )}
        
        {/* Documentos */}
        {event.data?.documents && Object.keys(event.data.documents).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Documentos:</p>
            {Object.entries(event.data.documents).map(([type, url]) => (
              <DocumentLink key={type} type={type} url={url} />
            ))}
          </div>
        )}
        
        {/* Detalles adicionales según tipo de evento */}
        {event.kind === 'RECEIPT' && event.data?.supplier && (
          <SupplierDetails supplier={event.data.supplier} />
        )}
        
        {event.kind === 'QC_TEST' && event.data?.test && (
          <QcTestDetails test={event.data.test} />
        )}
        
        {/* Notas */}
        {event.data?.notes && (
          <div className="p-2 rounded-lg bg-muted border border-border/40 text-xs">
            <p className="font-semibold">Notas:</p>
            <p className="text-muted-foreground mt-1">{event.data.notes}</p>
          </div>
        )}
      </div>
    </article>
  );
}
```

---

## 📋 PARTE 2: QC PLANS EXTENSIBLES

### Problema Actual

Los QC Plans tienen `triggerOn` pero solo cubre recepción y producción:

```typescript
// ❌ ACTUAL: Limited trigger options
type QcPlan = {
  triggerOn?: 'RECEIPT' | 'PRODUCTION' | 'BOTH';
  // ...
}
```

### Solución Propuesta

Hacer el sistema de QC Plans más flexible y extensible:

#### 1. Ampliar `triggerOn`

```typescript
// ✅ PROPUESTO: Más opciones de trigger
type QcPlanTrigger = 
  | 'RECEIPT'          // Recepción de proveedor
  | 'PRODUCTION'       // Salida de producción
  | 'TRANSFER'         // Transferencia entre ubicaciones
  | 'SHIPMENT'         // Antes de enviar a cliente
  | 'PERIODIC'         // Revisiones periódicas
  | 'ON_DEMAND'        // Inspección manual
  | 'CONDITIONAL';     // Basado en condiciones

type QcPlan = {
  id: string;
  name: string;
  code?: string;
  active: boolean;
  
  // Triggers ampliados
  triggerOn: QcPlanTrigger[];  // Array en lugar de single value
  triggerConditions?: {
    categories?: ItemCategory[];
    suppliers?: string[];
    minValue?: number;
    periodicDays?: number;
  };
  
  // Parámetros del plan
  parameters: QcParameter[];
  requiredForRelease: boolean;
  
  // Auto-aprobación
  autoApproveRules?: {
    enabled: boolean;
    conditions: AutoApproveCondition[];
  };
  
  // Nuevo: Integración cross-módulo
  integrations?: {
    production?: {
      enforceInOrders: boolean;
      blockIfFailed: boolean;
      requiredStages?: string[];  // Ej: ['MIXING', 'FILLING', 'PACKAGING']
    };
    logistics?: {
      enforceOnShipment: boolean;
      requireCoA: boolean;
      blockExpiredLots: boolean;
    };
    inventory?: {
      quarantineIfFailed: boolean;
      separateLocationForHold: string;
    };
  };
  
  // Metadata
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy?: string;
};
```

#### 2. Nuevos Tipos de Parámetros

```typescript
type QcParameter = {
  id: string;
  name: string;
  code?: string;
  type: 'NUMERIC' | 'BOOLEAN' | 'TEXT' | 'SELECT' | 'FILE';
  
  // Para NUMERIC
  unit?: string;
  min?: number;
  max?: number;
  target?: number;
  
  // Para SELECT
  options?: string[];
  
  // Para FILE
  acceptedFormats?: string[];  // ['pdf', 'jpg', 'png']
  maxSize?: number;  // en MB
  
  // Validación
  required: boolean;
  validationRules?: {
    regex?: string;
    custom?: string;  // Nombre de función custom
  };
  
  // Integración
  applicableAt?: QcPlanTrigger[];  // En qué triggers aplica
  category?: 'PHYSICAL' | 'CHEMICAL' | 'MICROBIOLOGICAL' | 'SENSORY' | 'DOCUMENTATION';
};
```

#### 3. Protocolos Integrados

```typescript
type QcProtocol = {
  id: string;
  name: string;
  description?: string;
  
  // Vinculación
  planId: string;
  
  // Contexto de aplicación
  appliesTo: {
    modules: ('PRODUCTION' | 'LOGISTICS' | 'QUALITY')[],
    phases?: string[];  // Ej: ['PRE_PRODUCTION', 'IN_PROCESS', 'POST_PRODUCTION']
  };
  
  // Pasos del protocolo
  steps: QcProtocolStep[];
  
  // Frecuencia (si es periódico)
  frequency?: {
    type: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'BATCH';
    interval?: number;
  };
  
  // Template de documento
  documentTemplate?: {
    url: string;
    requiredFields: string[];
  };
};

type QcProtocolStep = {
  order: number;
  description: string;
  parameterId?: string;  // Vincula a QcParameter
  responsible?: 'OPERATOR' | 'QC_INSPECTOR' | 'SUPERVISOR';
  estimatedMinutes?: number;
  checkpoint?: boolean;  // Marca paso crítico
};
```

### Ejemplo de Uso: Plan QC en Producción

```typescript
const mixingQcPlan: QcPlan = {
  id: 'plan-mixing-001',
  name: 'Control de Mezclado',
  code: 'QC-MIX-01',
  active: true,
  
  triggerOn: ['PRODUCTION'],
  triggerConditions: {
    categories: ['intermediate'],
  },
  
  parameters: [
    {
      id: 'param-temp',
      name: 'Temperatura de mezcla',
      type: 'NUMERIC',
      unit: '°C',
      min: 18,
      max: 25,
      target: 22,
      required: true,
      applicableAt: ['PRODUCTION'],
      category: 'PHYSICAL'
    },
    {
      id: 'param-viscosity',
      name: 'Viscosidad',
      type: 'NUMERIC',
      unit: 'cP',
      min: 1000,
      max: 3000,
      required: true,
      category: 'PHYSICAL'
    },
    {
      id: 'param-ph',
      name: 'pH',
      type: 'NUMERIC',
      min: 6.5,
      max: 7.5,
      target: 7.0,
      required: true,
      category: 'CHEMICAL'
    },
    {
      id: 'param-batch-record',
      name: 'Registro de lote',
      type: 'FILE',
      acceptedFormats: ['pdf'],
      required: true,
      category: 'DOCUMENTATION'
    }
  ],
  
  integrations: {
    production: {
      enforceInOrders: true,
      blockIfFailed: true,
      requiredStages: ['MIXING']  // Solo aplica en etapa de mezclado
    }
  },
  
  autoApproveRules: {
    enabled: true,
    conditions: [
      {
        type: 'ALL_PARAMS_IN_SPEC',
        action: 'AUTO_APPROVE'
      }
    ]
  }
};
```

### Ejemplo de Uso: Plan QC en Logística

```typescript
const shipmentQcPlan: QcPlan = {
  id: 'plan-shipment-001',
  name: 'Control Pre-Envío',
  code: 'QC-SHIP-01',
  active: true,
  
  triggerOn: ['SHIPMENT'],
  
  parameters: [
    {
      id: 'param-packaging',
      name: 'Estado del packaging',
      type: 'SELECT',
      options: ['EXCELENTE', 'BUENO', 'ACEPTABLE', 'RECHAZAR'],
      required: true,
      category: 'PHYSICAL'
    },
    {
      id: 'param-labeling',
      name: 'Etiquetado correcto',
      type: 'BOOLEAN',
      required: true,
      category: 'DOCUMENTATION'
    },
    {
      id: 'param-coa',
      name: 'CoA del lote',
      type: 'FILE',
      acceptedFormats: ['pdf'],
      required: true,
      category: 'DOCUMENTATION'
    },
    {
      id: 'param-temp-check',
      name: 'Temperatura de almacenamiento',
      type: 'NUMERIC',
      unit: '°C',
      min: 2,
      max: 8,
      required: false,
      category: 'PHYSICAL'
    }
  ],
  
  integrations: {
    logistics: {
      enforceOnShipment: true,
      requireCoA: true,
      blockExpiredLots: true
    }
  }
};
```

---

## 🔧 CAMBIOS EN LA BASE DE DATOS

### 1. Enriquecer StockMoves

```typescript
// Añadir campo ref con más detalles
type StockMove = {
  // ... campos existentes
  ref?: {
    source: string;
    note?: string;
    
    // Documentos
    documentUrl?: string;
    deliveryNote?: string;
    invoiceRef?: string;
    photos?: string[];
    attachments?: Array<{ name: string; url: string; type: string }>;
    
    // Personas
    receivedBy?: string;
    approvedBy?: string;
    inspectedBy?: string;
    
    // Proveedor/Cliente
    supplierId?: string;
    customerId?: string;
    
    // Financiero
    unitCost?: number;
    totalValue?: number;
    currency?: string;
  };
};
```

### 2. Nueva Colección: qcProtocols

```firestore
qcProtocols/
  {protocolId}/
    id: string
    name: string
    planId: string
    appliesTo: {
      modules: string[]
      phases: string[]
    }
    steps: QcProtocolStep[]
    frequency: {...}
    documentTemplate: {...}
    createdAt: timestamp
    updatedAt: timestamp
```

### 3. Actualizar QcPlans

```firestore
qcPlans/
  {planId}/
    // Campos existentes...
    triggerOn: string[]  // Cambiar a array
    triggerConditions: {...}
    integrations: {
      production: {...}
      logistics: {...}
      inventory: {...}
    }
```

---

## 💻 IMPLEMENTACIÓN

### Fase 1: Enriquecer Trazabilidad

#### Step 1.1: Actualizar `getLotTraceability()`

```typescript
// src/app/(app)/quality/traceability/actions.ts

async function enrichReceiptEvent(
  move: StockMove,
  context: { suppliers: Map<string, Supplier>, users: Map<string, User>, items: Map<string, Item> }
): Promise<TraceEvent> {
  const supplier = context.suppliers.get(move.fromLocationId);
  const receiver = context.users.get(move.ref?.receivedBy);
  const item = context.items.get(move.sku);
  
  return {
    id: move.id,
    at: move.occurredAt,
    kind: 'RECEIPT',
    phase: 'WAREHOUSE',
    title: `Recepción: ${move.qty} ${move.uom} de ${item?.name || move.sku}`,
    details: `De ${supplier?.name || move.fromLocationId} → ${move.toLocationId}`,
    data: {
      supplier: {
        id: supplier?.id,
        name: supplier?.name,
        contact: supplier?.email,
      },
      documents: {
        deliveryNote: move.ref?.deliveryNote,
        invoice: move.ref?.invoiceRef,
        photos: move.ref?.photos || [],
        attachments: move.ref?.attachments || [],
      },
      personnel: {
        receivedBy: receiver?.id,
        receivedByName: receiver?.displayName,
      },
      financial: {
        unitCost: move.unitCost,
        totalValue: move.qty * (move.unitCost || 0),
        currency: move.ref?.currency || 'EUR',
      },
      transactional: {
        qty: move.qty,
        uom: move.uom,
        locationFrom: move.fromLocationId,
        locationTo: move.toLocationId,
      },
      notes: move.ref?.note,
    },
  };
}

// Similar para otros tipos de eventos...
```

#### Step 1.2: Actualizar UI

```typescript
// Componente de persona
function PersonChip({ role, person }: { role: string; person?: User }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-background/80">
      <Avatar name={person?.displayName} size="xs" />
      <div className="text-xs">
        <p className="font-semibold text-foreground capitalize">{role.replace('_', ' ')}</p>
        <p className="text-muted-foreground">{person?.displayName || 'Sin asignar'}</p>
      </div>
    </div>
  );
}

// Componente de documento
function DocumentLink({ type, url }: { type: string; url: string }) {
  return (
    <Link 
      href={url} 
      target="_blank"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-background/80 hover:border-primary/40 transition text-xs"
    >
      <FileText size={14} />
      <span className="font-medium">{type}</span>
      <ExternalLink size={12} className="ml-auto" />
    </Link>
  );
}

// Detalle de proveedor
function SupplierDetails({ supplier }: { supplier: any }) {
  return (
    <div className="p-3 rounded-lg border border-info/20 bg-info/5">
      <p className="text-xs font-semibold text-info flex items-center gap-2">
        <Building size={14} />
        Proveedor
      </p>
      <div className="mt-2 space-y-1 text-xs">
        <p className="font-semibold text-foreground">{supplier.name}</p>
        {supplier.contact && (
          <p className="text-muted-foreground">{supplier.contact}</p>
        )}
      </div>
    </div>
  );
}
```

### Fase 2: QC Plans Extensibles

#### Step 2.1: Actualizar Tipo QcPlan en SSOT

```typescript
// src/domain/ssot.ts

export type QcPlanTrigger = 
  | 'RECEIPT' 
  | 'PRODUCTION' 
  | 'TRANSFER'
  | 'SHIPMENT'
  | 'PERIODIC'
  | 'ON_DEMAND'
  | 'CONDITIONAL';

export type QcPlan = {
  id: string;
  name: string;
  code?: string;
  active: boolean;
  
  // Triggers (migrar a array)
  triggerOn: QcPlanTrigger[];
  
  /** @deprecated Use triggerOn array */
  trigger?: 'RECEIPT' | 'PRODUCTION' | 'BOTH';
  
  triggerConditions?: {
    categories?: ItemCategory[];
    suppliers?: string[];
    minValue?: number;
    periodicDays?: number;
  };
  
  parameters: QcParameter[];
  requiredForRelease: boolean;
  
  autoApproveRules?: {
    enabled: boolean;
    conditions: Array<{
      type: 'ALL_PARAMS_IN_SPEC' | 'SPECIFIC_PARAMS' | 'VALUE_THRESHOLD';
      parameterIds?: string[];
      threshold?: number;
      action: 'AUTO_APPROVE' | 'FLAG_FOR_REVIEW' | 'AUTO_REJECT';
    }>;
  };
  
  // Integración cross-módulo
  integrations?: {
    production?: {
      enforceInOrders: boolean;
      blockIfFailed: boolean;
      requiredStages?: string[];
    };
    logistics?: {
      enforceOnShipment: boolean;
      requireCoA: boolean;
      blockExpiredLots: boolean;
    };
    inventory?: {
      quarantineIfFailed: boolean;
      separateLocationForHold?: string;
    };
  };
  
  appliesToItems?: string[];
  appliesToCategories?: ItemCategory[];
  
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy?: string;
};
```

#### Step 2.2: UI para Gestionar Integraciones

```typescript
// Componente en QcPlanEditorDrawer
function IntegrationsSection({ plan, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Integraciones con Otros Módulos</h3>
      
      {/* Producción */}
      <div className="border border-border/40 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Factory size={16} />
          <span className="font-semibold">Producción</span>
        </div>
        
        <label className="flex items-center gap-2">
          <input 
            type="checkbox"
            checked={plan.integrations?.production?.enforceInOrders}
            onChange={e => onChange({
              ...plan,
              integrations: {
                ...plan.integrations,
                production: {
                  ...plan.integrations?.production,
                  enforceInOrders: e.target.checked
                }
              }
            })}
          />
          <span className="text-sm">Obligatorio en órdenes de producción</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input 
            type="checkbox"
            checked={plan.integrations?.production?.blockIfFailed}
            onChange={...}
          />
          <span className="text-sm">Bloquear producción si QC falla</span>
        </label>
        
        <div>
          <label className="text-xs text-muted-foreground">Etapas obligatorias:</label>
          <Input 
            placeholder="MIXING, FILLING, PACKAGING"
            value={(plan.integrations?.production?.requiredStages || []).join(', ')}
            onChange={...}
          />
        </div>
      </div>
      
      {/* Logística */}
      <div className="border border-border/40 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Truck size={16} />
          <span className="font-semibold">Logística</span>
        </div>
        
        <label className="flex items-center gap-2">
          <input 
            type="checkbox"
            checked={plan.integrations?.logistics?.enforceOnShipment}
          />
          <span className="text-sm">Verificar antes de envío</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input 
            type="checkbox"
            checked={plan.integrations?.logistics?.requireCoA}
          />
          <span className="text-sm">CoA obligatorio para envío</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input 
            type="checkbox"
            checked={plan.integrations?.logistics?.blockExpiredLots}
          />
          <span className="text-sm">Bloquear lotes caducados</span>
        </label>
      </div>
    </div>
  );
}
```

#### Step 2.3: Hooks de Integración

```typescript
// En módulo de producción
// src/features/production/hooks/useQcEnforcement.ts

export function useQcEnforcement(orderId: string, bom: BomItem[]) {
  const [qcPlans, setQcPlans] = useState<QcPlan[]>([]);
  const [blockedItems, setBlockedItems] = useState<string[]>([]);
  
  useEffect(() => {
    // Cargar planes QC que aplican a este BOM
    const loadQcPlans = async () => {
      const skus = bom.map(item => item.sku);
      const plans = await getQcPlansForSkus(skus);
      
      const productionPlans = plans.filter(plan => 
        plan.triggerOn.includes('PRODUCTION') &&
        plan.integrations?.production?.enforceInOrders
      );
      
      setQcPlans(productionPlans);
      
      // Verificar si hay lotes bloqueados
      const blocked = await checkBlockedLots(skus, productionPlans);
      setBlockedItems(blocked);
    };
    
    loadQcPlans();
  }, [orderId, bom]);
  
  return {
    qcPlans,
    blockedItems,
    hasBlockedItems: blockedItems.length > 0,
    canProceed: blockedItems.length === 0
  };
}

// Uso en componente de producción
function ProductionExecutionPanel({ order }: Props) {
  const { qcPlans, blockedItems, canProceed } = useQcEnforcement(order.id, order.bom);
  
  return (
    <div>
      {!canProceed && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>QC Bloqueando Producción</AlertTitle>
          <AlertDescription>
            Los siguientes ítems tienen planes QC pendientes: {blockedItems.join
