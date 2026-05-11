# Codemod #4: Exportar Tipos Faltantes TS2305

## Análisis de 280 Errores TS2305

### Top 20 Tipos Faltantes

| Tipo | Usos | Estrategia | Acción |
|------|------|-----------|---------|
| **OrderSellOut** | 23 | Alias legacy | `export type OrderSellOut = Order` |
| **TaskNew** | 18 | Alias legacy | `export type TaskNew = Task` |
| **Department** | 16 | Tipo faltante | Añadir schema `zDepartment` |
| **SantaData** | 13 | Tipo infra | Añadir type desde dataprovider |
| **Project** | 12 | Tipo faltante | Añadir schema `zProject` |
| **BillOfMaterial** | 12 | Alias legacy | `export type BillOfMaterial = Bom` |
| **Stage** | 9 | Ya existe | Es `AccountStage`, añadir alias |
| **QcTest** | 8 | Alias legacy | `export type QcTest = QualityCheck` |
| **QualityRelease** | 7 | Tipo faltante | Añadir schema básico |
| **FinanceLink** | 6 | Tipo faltante | Añadir schema básico |
| **TeamMember** | 5 | Alias legacy | `export type TeamMember = User` |
| **ProjectIdea** | 5 | Tipo faltante | Añadir schema básico |
| **ISODateString** | 5 | Utility type | `export type ISODateString = string` |
| **DEPT_META** | 5 | Const config | Añadir const |
| **UserRole** | 4 | Ya existe | Es `Role`, añadir alias |
| **TaskPriority** | 4 | Enum faltante | Añadir `zTaskPriority` |
| **Segment** | 4 | Alias legacy | `export type Segment = AccountType` |
| **SANTA_DATA_COLLECTIONS** | 4 | Const config | Añadir const |
| **PlvMaterial** | 4 | Tipo faltante | Añadir schema básico |
| **PaymentLink** | 4 | Tipo faltante | Añadir schema básico |

---

## Plan de Implementación

### Fase 1: Aliases Simples (5 min)
```typescript
// Aliases para compatibility con código legacy
export type OrderSellOut = Order;
export type TaskNew = Task;
export type BillOfMaterial = Bom;
export type QcTest = QualityCheck;
export type TeamMember = User;
export type UserRole = Role;
export type Stage = AccountStage;
export type Segment = AccountType;
export type ISODateString = string;
```

### Fase 2: Enums y Utility Types (10 min)
```typescript
export const zTaskPriority = z.enum(['LOW','MEDIUM','HIGH','URGENT']);
export type TaskPriority = z.infer<typeof zTaskPriority>;

export const DEPT_META = {
  OPS: { label: 'Operaciones', color: 'blue' },
  SALES: { label: 'Ventas', color: 'green' },
  FINANCE: { label: 'Finanzas', color: 'purple' },
  MARKETING: { label: 'Marketing', color: 'pink' }
} as const;

export const SANTA_DATA_COLLECTIONS = [
  'accounts', 'orders', 'lots', 'onHand', 'users', 
  'items', 'boms', 'projects', 'tasks'
] as const;
```

### Fase 3: Schemas Básicos para Módulos Pendientes (20 min)
```typescript
// Department (gestión interna)
export const zDepartment = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(z.string()), // → users.id
  budget: z.number().optional(),
  createdAt: z.any()
});

// Project (gestión de proyectos)
export const zProject = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['PLANNING','ACTIVE','PAUSED','COMPLETED','CANCELLED']),
  ownerId: z.string(), // → users.id
  teamIds: z.array(z.string()).optional(),
  startDate: z.any().optional(),
  endDate: z.any().optional(),
  budget: z.number().optional(),
  createdAt: z.any(), updatedAt: z.any()
});

// ProjectIdea (ideas/backlog)
export const zProjectIdea = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  proposedBy: z.string(), // → users.id
  status: z.enum(['PROPOSED','REVIEW','APPROVED','REJECTED']),
  createdAt: z.any()
});

// QualityRelease (liberación de lotes)
export const zQualityRelease = z.object({
  id: z.string(),
  lotNumber: z.string().regex(LOT_REGEX),
  releasedAt: z.any(),
  releasedBy: z.object({ uid: z.string(), name: z.string().optional() }),
  qcResults: z.array(z.string()).optional(), // → qualityChecks.id
  createdAt: z.any()
});

// PlvMaterial (material POS/PLV)
export const zPlvMaterial = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['DISPLAY','SIGNAGE','POSTER','STANDEE','WOBBLER','OTHER']),
  sku: z.string().regex(SKU_REGEX).optional(),
  dimensions: z.string().optional(),
  cost: z.number().optional(),
  supplier: z.string().optional(),
  photoUrl: z.string().url().optional(),
  createdAt: z.any()
});

// FinanceLink (enlaces a docs financieros externos)
export const zFinanceLink = z.object({
  id: z.string(),
  kind: z.enum(['INVOICE','RECEIPT','CONTRACT','STATEMENT']),
  refId: z.string(), // → orderId, accountId, etc
  url: z.string().url(),
  amount: z.number().optional(),
  currency: zCurrency.optional(),
  createdAt: z.any()
});

// PaymentLink (enlaces de pago)
export const zPaymentLink = z.object({
  id: z.string(),
  orderId: z.string(),
  amount: z.number(),
  currency: zCurrency,
  provider: z.enum(['STRIPE','HOLDED','MANUAL']),
  url: z.string().url().optional(),
  expiresAt: z.any().optional(),
  status: z.enum(['PENDING','PAID','EXPIRED','CANCELLED']),
  createdAt: z.any()
});
```

### Fase 4: SantaData (5 min)
```typescript
// Tipo agregado para dataprovider
export type SantaData = {
  accounts: Account[];
  orders: Order[];
  lots: Lot[];
  onHand: OnHand[];
  users: User[];
  items: Item[];
  boms: Bom[];
  projects?: Project[];
  tasks?: Task[];
  departments?: Department[];
  qualityReleases?: QualityRelease[];
  plvMaterials?: PlvMaterial[];
};
```

### Fase 5: Exports Derivados (5 min)
```typescript
export type Department = z.infer<typeof zDepartment>;
export type Project = z.infer<typeof zProject>;
export type ProjectIdea = z.infer<typeof zProjectIdea>;
export type QualityRelease = z.infer<typeof zQualityRelease>;
export type PlvMaterial = z.infer<typeof zPlvMaterial>;
export type FinanceLink = z.infer<typeof zFinanceLink>;
export type PaymentLink = z.infer<typeof zPaymentLink>;
```

---

## Estimación de Tiempo

- Fase 1 (Aliases): 5 min
- Fase 2 (Enums/Consts): 10 min
- Fase 3 (Schemas básicos): 20 min
- Fase 4 (SantaData): 5 min
- Fase 5 (Exports): 5 min
- Verificación: 5 min

**Total estimado: 50 minutos** (mucho menos que las 4h originales porque muchos son aliases)

---

## Resultado Esperado

- ✅ -280 errores TS2305 (todos resueltos)
- ✅ Código legacy sigue funcionando con aliases
- ✅ Schemas básicos para módulos pendientes (sin implementación completa)
- ✅ Type system completo para siguiente codemod
