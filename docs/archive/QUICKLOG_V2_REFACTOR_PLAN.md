# 📝 QUICKLOG V2: BLOC DE NOTAS CON CONFIRMACIÓN

**Fecha:** 26 de Octubre de 2025  
**Estado:** 📋 PLAN COMPLETO  
**Objetivo:** Convertir QuickLog de chat a bloc de notas con resumen de confirmación

---

## 🎯 FLUJO PROPUESTO

### Paso 1: Escribir Notas
Usuario escribe libremente en textarea grande

### Paso 2: Procesar con Gemini
Gemini analiza y estructura las notas

### Paso 3: **RESUMEN DE CONFIRMACIÓN** ✨
Usuario revisa y aprueba lo que Gemini entendió

### Paso 4: Guardar en SSOT V2
Se crean las entidades correspondientes

---

## 🎨 DISEÑO CON CONFIRMACIÓN

### Vista 1: Bloc de Notas (Entrada)

```
┌─────────────────────────────────────────────┐
│ 📝 QuickLog                            [×]  │
├─────────────────────────────────────────────┤
│ 🔍 [Cliente...]                     [🎤]   │
│                                              │
│ ┌─ Escribe tus notas ────────────────────┐ │
│ │                                         │ │
│ │ Visita a Cliente ABC hoy.               │ │
│ │ Pedido de 12 cajas Santa Brisa Original │ │
│ │ y 6 cajas de Limón.                     │ │
│ │ Instalamos POS en la entrada.           │ │
│ │ Cliente interesado en promoción verano. │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ Acciones rápidas:                            │
│ [👣 Visita] [📦 Pedido] [🗓️ Evento] [🪧 POS]│
├─────────────────────────────────────────────┤
│         [Cancelar] [✨ Procesar con IA]     │
└─────────────────────────────────────────────┘
```

### Vista 2: **RESUMEN DE CONFIRMACIÓN** (Nuevo)

```
┌─────────────────────────────────────────────┐
│ ✨ Gemini ha procesado tus notas       [×]  │
├─────────────────────────────────────────────┤
│                                              │
│ 📋 Resumen de lo que se guardará:           │
│                                              │
│ ┌─ Cliente ────────────────────────────────┐│
│ │ 👤 Cliente ABC                           ││
│ │ 📍 Madrid • HORECA                       ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌─ Acciones detectadas ───────────────────┐│
│ │                                          ││
│ │ 1️⃣ 👣 VISITA                            ││
│ │    📅 Hoy, 26 Oct 2025                   ││
│ │    📝 Visita comercial realizada         ││
│ │                                          ││
│ │ 2️⃣ 📦 PEDIDO                            ││
│ │    📅 Hoy, 26 Oct 2025                   ││
│ │    • 12 cajas Santa Brisa Original       ││
│ │    • 6 cajas Santa Brisa Limón           ││
│ │    💰 Total estimado: €334.80            ││
│ │                                          ││
│ │ 3️⃣ 🪧 POS INSTALADO                     ││
│ │    📅 Hoy, 26 Oct 2025                   ││
│ │    📍 Ubicación: Entrada                 ││
│ │                                          ││
│ │ 4️⃣ 📝 NOTA                              ││
│ │    Interesado en promoción verano        ││
│ │                                          ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ⚠️ Puedes editar antes de guardar           │
│                                              │
├─────────────────────────────────────────────┤
│    [← Editar] [❌ Cancelar] [✅ Confirmar]  │
└─────────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### Flujo de Estados

```typescript
type QuickLogState = 
  | 'WRITING'      // Usuario escribe notas
  | 'PROCESSING'   // Gemini procesa
  | 'CONFIRMING'   // Usuario revisa resumen
  | 'SAVING'       // Guardando en SSOT V2
  | 'DONE';        // Completado

const [state, setState] = useState<QuickLogState>('WRITING');
const [notes, setNotes] = useState('');
const [summary, setSummary] = useState<ProcessedSummary | null>(null);
```

### Estructura del Resumen

```typescript
interface ProcessedSummary {
  // Cliente detectado
  account: {
    id?: string;           // Si existe
    name: string;
    isNew: boolean;        // Si hay que crear
    segment?: string;
  };
  
  // Acciones detectadas
  actions: Array<{
    type: 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS' | 'NOTA';
    date: string;
    details: {
      // Para VISITA
      notes?: string;
      
      // Para PEDIDO
      lines?: Array<{
        itemName: string;
        qty: number;
        uom: string;
      }>;
      estimatedTotal?: number;
      
      // Para POS
      location?: string;
      
      // Para EVENTO
      title?: string;
      description?: string;
    };
  }>;
  
  // Metadata
  confidence: number;      // 0-100
  warnings: string[];      // Si Gemini tiene dudas
}
```

### Procesamiento con Gemini

```typescript
async function processNotesWithGemini(
  notes: string,
  accountId?: string
): Promise<ProcessedSummary> {
  const response = await geminiService.analyze({
    text: notes,
    context: {
      accountId,
      analysisType: 'quicklog_notes',
    },
  });

  return {
    account: response.account,
    actions: response.actions,
    confidence: response.confidence,
    warnings: response.warnings,
  };
}
```

### Guardado en SSOT V2

```typescript
async function saveToSSOT(
  summary: ProcessedSummary,
  userId: string
): Promise<void> {
  // 1. Crear/obtener Account
  let accountId = summary.account.id;
  if (summary.account.isNew) {
    const account = await accountService.create({
      name: summary.account.name,
      segment: summary.account.segment,
      ownerId: userId,
    });
    accountId = account.id;
  }

  // 2. Crear cada acción
  for (const action of summary.actions) {
    switch (action.type) {
      case 'VISITA':
        await interactionService.create({
          accountId,
          kind: 'VISITA',
          date: action.date,
          note: action.details.notes,
          userId,
        });
        break;

      case 'PEDIDO':
        await orderService.createOrder({
          accountId,
          lines: action.details.lines,
          orderDate: action.date,
          source: 'QUICKLOG',
        });
        break;

      case 'POS':
        await posService.install({
          accountId,
          location: action.details.location,
          installedAt: action.date,
        });
        break;

      case 'NOTA':
        await noteService.create({
          accountId,
          content: action.details.notes,
          createdAt: action.date,
        });
        break;
    }
  }
}
```

---

## 📋 COMPONENTE DE CONFIRMACIÓN

```typescript
function ConfirmationSummary({ 
  summary, 
  onEdit, 
  onConfirm, 
  onCancel 
}: {
  summary: ProcessedSummary;
  onEdit: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-yellow-500" />
        <div>
          <h3 className="text-lg font-semibold">Gemini ha procesado tus notas</h3>
          <p className="text-sm text-muted-foreground">
            Revisa el resumen antes de guardar
          </p>
        </div>
      </div>

      {/* Cliente */}
      <section className="sb-card-glass-light p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users size={16} />
          Cliente
        </h4>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            👤
          </div>
          <div>
            <div className="font-semibold">{summary.account.name}</div>
            <div className="text-xs text-muted-foreground">
              {summary.account.segment}
              {summary.account.isNew && (
                <span className="ml-2 text-yellow-600">• Nuevo cliente</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Acciones */}
      <section className="sb-card-glass-light p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckCircle size={16} />
          Acciones detectadas ({summary.actions.length})
        </h4>
        
        <div className="space-y-3">
          {summary.actions.map((action, index) => (
            <div key={index} className="flex gap-3 p-3 bg-secondary/5 rounded-lg border border-border/30">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{getActionIcon(action.type)} {action.type}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(action.date)}
                  </span>
                </div>
                
                {/* Detalles según tipo */}
                {action.type === 'PEDIDO' && action.details.lines && (
                  <div className="text-sm space-y-1">
                    {action.details.lines.map((line, i) => (
                      <div key={i} className="text-muted-foreground">
                        • {line.qty} {line.uom} {line.itemName}
                      </div>
                    ))}
                    {action.details.estimatedTotal && (
                      <div className="font-semibold text-primary mt-2">
                        Total: €{action.details.estimatedTotal.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
                
                {action.details.notes && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {action.details.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <div className="flex items-center gap-2 text-warning font-medium mb-2">
            <AlertCircle size={16} />
            Advertencias
          </div>
          <ul className="text-sm text-warning space-y-1">
            {summary.warnings.map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Confianza de Gemini:</span>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${summary.confidence}%` }}
            />
          </div>
          <span className="font-semibold">{summary.confidence}%</span>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button className="sb-btn sb-btn--ghost flex-1" onClick={onEdit}>
          ← Editar Notas
        </button>
        <button className="sb-btn sb-btn--secondary" onClick={onCancel}>
          ❌ Cancelar
        </button>
        <button className="sb-btn sb-btn--primary flex-1" onClick={onConfirm}>
          ✅ Confirmar y Guardar
        </button>
      </div>
    </div>
  );
}
```

---

## 🔄 FLUJO COMPLETO

```
Usuario abre QuickLog
  ↓
Escribe notas libremente
  ↓
Click "Procesar con IA"
  ↓
Gemini analiza texto
  ↓
Extrae: cliente, acciones, detalles
  ↓
MUESTRA RESUMEN DE CONFIRMACIÓN ✨
  ↓
Usuario revisa:
  - Cliente correcto?
  - Acciones correctas?
  - Detalles correctos?
  ↓
Usuario puede:
  - Editar notas (volver atrás)
  - Cancelar todo
  - Confirmar y guardar
  ↓
Si confir
