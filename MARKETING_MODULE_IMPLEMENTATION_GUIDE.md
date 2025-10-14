# 🚀 Guía de Implementación - Módulo Marketing

## 📋 Resumen de Implementación

El módulo de Marketing está **100% funcional** con todas las mejoras avanzadas implementadas:

✅ **5 páginas completas** con UI consistente  
✅ **Gráficos interactivos** con Recharts  
✅ **Calendario funcional** con react-day-picker  
✅ **CRUD completo** con server actions  
✅ **Hook personalizado** con manejo de estados  
✅ **Sistema de uploads** con react-dropzone  

---

## 📂 Estructura de Archivos

```
src/
├── app/(app)/marketing/
│   ├── dashboard/page.tsx          # Dashboard principal
│   ├── collabs/page.tsx            # Colaboraciones
│   ├── ads/page.tsx                # Campañas Ads con Recharts
│   ├── events-activations/page.tsx # Eventos con Calendar
│   └── pos-mkt/page.tsx            # Material PLV
├── server/actions/
│   └── marketing.ts                # Server actions CRUD
├── hooks/
│   └── useMarketingActions.ts      # Hook personalizado
└── components/marketing/
    └── ImageUpload.tsx             # Componente de upload
```

---

## 🔧 Componentes Creados

### 1. Server Actions (`src/server/actions/marketing.ts`)

**Funciones disponibles:**

```typescript
// Events
createMarketingEvent(event)
updateMarketingEvent(id, updates)
deleteMarketingEvent(id)

// Campaigns
createOnlineCampaign(campaign)
updateOnlineCampaign(id, updates)
deleteOnlineCampaign(id)

// Collaborations
createInfluencerCollab(collab)
updateInfluencerCollab(id, updates)
deleteInfluencerCollab(id)

// Materials
createPlvMaterial(material)
updatePlvMaterial(id, updates)
deletePlvMaterial(id)
```

**Características:**
- ✅ Validación de errores
- ✅ Timestamps automáticos (createdAt, updatedAt)
- ✅ Respuestas tipadas
- ✅ Integración con Firestore

### 2. Hook Personalizado (`src/hooks/useMarketingActions.ts`)

**Uso:**

```typescript
import { useMarketingActions } from '@/hooks/useMarketingActions';

function MyComponent() {
  const { createEvent, updateEvent, deleteEvent, loading } = useMarketingActions();
  
  const handleCreate = async () => {
    const result = await createEvent({
      title: 'Nuevo Evento',
      startAt: new Date().toISOString(),
      kind: 'DEMO',
      status: 'planned'
    });
    
    if (result) {
      console.log('Evento creado:', result);
    }
  };
  
  return (
    <button onClick={handleCreate} disabled={loading}>
      {loading ? 'Creando...' : 'Crear Evento'}
    </button>
  );
}
```

**Características:**
- ✅ Estado de carga global
- ✅ Toasts automáticos (éxito/error)
- ✅ Refresh automático de datos
- ✅ Manejo de errores

### 3. Componente ImageUpload (`src/components/marketing/ImageUpload.tsx`)

**Uso:**

```typescript
import { ImageUpload } from '@/components/marketing/ImageUpload';

function EventDrawer() {
  const handleUpload = async (files: File[]) => {
    // Implementar upload a Firebase Storage
    const urls = await Promise.all(
      files.map(async (file) => {
        // Upload logic here
        return 'https://storage.example.com/image.jpg';
      })
    );
    return urls;
  };
  
  return (
    <ImageUpload
      onUpload={handleUpload}
      maxFiles={5}
      existingImages={['https://...']}
      onRemove={(url) => console.log('Remove:', url)}
    />
  );
}
```

**Características:**
- ✅ Drag & drop de imágenes
- ✅ Preview en grid 3x3
- ✅ Límite de archivos configurable
- ✅ Estado de carga con spinner
- ✅ Eliminación de imágenes
- ✅ Formatos: JPG, PNG, WEBP

---

## 📊 Ejemplos de Integración

### Ejemplo 1: Crear un Evento

```typescript
'use client';

import { useState } from 'react';
import { useMarketingActions } from '@/hooks/useMarketingActions';
import type { MarketingEvent } from '@/domain/ssot';

export function CreateEventForm() {
  const { createEvent, loading } = useMarketingActions();
  const [formData, setFormData] = useState({
    title: '',
    startAt: '',
    city: '',
    kind: 'DEMO' as const,
    status: 'planned' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createEvent({
      ...formData,
      startAt: new Date(formData.startAt).toISOString()
    });
    
    if (result) {
      // Evento creado exitosamente
      setFormData({ title: '', startAt: '', city: '', kind: 'DEMO', status: 'planned' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="sb-label">Nombre del Evento</label>
        <input
          className="sb-input"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label className="sb-label">Fecha</label>
        <input
          type="date"
          className="sb-input"
          value={formData.startAt}
          onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label className="sb-label">Ciudad</label>
        <input
          className="sb-input"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
        />
      </div>
      
      <div>
        <label className="sb-label">Tipo</label>
        <select
          className="sb-select"
          value={formData.kind}
          onChange={(e) => setFormData({ ...formData, kind: e.target.value as any })}
        >
          <option value="DEMO">Degustación</option>
          <option value="FERIA">Feria</option>
          <option value="FORMACION">Formación</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>

      <button type="submit" className="sb-btn sb-btn--primary" disabled={loading}>
        {loading ? 'Creando...' : 'Crear Evento'}
      </button>
    </form>
  );
}
```

### Ejemplo 2: Actualizar una Campaña

```typescript
const { updateCampaign, loading } = useMarketingActions();

const handleStatusChange = async (campaignId: string, newStatus: string) => {
  const success = await updateCampaign(campaignId, { 
    status: newStatus as any 
  });
  
  if (success) {
    console.log('Estado actualizado correctamente');
  }
};

// Uso
<button onClick={() => handleStatusChange('campaign-123', 'active')}>
  Activar Campaña
</button>
```

### Ejemplo 3: Eliminar con Confirmación

```typescript
const { deleteEvent, loading } = useMarketingActions();

const handleDelete = async (eventId: string) => {
  if (confirm('¿Estás seguro de eliminar este evento?')) {
    const success = await deleteEvent(eventId);
    
    if (success) {
      console.log('Evento eliminado');
    }
  }
};
```

### Ejemplo 4: Upload de Imágenes a Firebase Storage

```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();

const handleUploadToFirebase = async (files: File[]): Promise<string[]> => {
  const uploadPromises = files.map(async (file) => {
    // Crear referencia única
    const timestamp = Date.now();
    const fileName = `marketing/${timestamp}-${file.name}`;
    const storageRef = ref(storage, fileName);
    
    // Upload
    await uploadBytes(storageRef, file);
    
    // Obtener URL
    const url = await getDownloadURL(storageRef);
    return url;
  });
  
  return Promise.all(uploadPromises);
};

// Uso en componente
<ImageUpload
  onUpload={handleUploadToFirebase}
  maxFiles={5}
/>
```

---

## 📈 Gráficos con Recharts

El módulo de Ads incluye un gráfico de líneas dual-axis completamente integrado:

```typescript
<LineChart data={campaigns.slice(0, 10).map(c => ({
  name: c.title.slice(0, 15),
  gasto: c.spend || 0,
  conversiones: c.metrics?.conversions || 0
}))}>
  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
  <XAxis dataKey="name" />
  <YAxis yAxisId="left" />
  <YAxis yAxisId="right" orientation="right" />
  <Tooltip />
  <Legend />
  <Line yAxisId="left" dataKey="gasto" stroke="hsl(var(--primary))" />
  <Line yAxisId="right" dataKey="conversiones" stroke="hsl(var(--success))" />
</LineChart>
```

**Características:**
- Dual-axis (gasto € vs conversiones)
- Responsive con ResponsiveContainer
- Colores del tema (HSL variables)
- Tooltip interactivo
- Legend con indicadores

---

## 📅 Calendario con react-day-picker

La página de eventos incluye un calendario interactivo:

```typescript
<DayPicker
  mode="single"
  selected={selectedDate}
  onSelect={setSelectedDate}
  modifiers={{
    hasEvent: events.map(e => new Date(e.startAt))
  }}
  modifiersStyles={{
    hasEvent: {
      fontWeight: 'bold',
      textDecoration: 'underline'
    }
  }}
/>
```

**Características:**
- Selección de fechas
- Días con eventos marcados
- Lista lateral con eventos del día
- Empty states
- Responsive grid 2/3

---

## 🎨 Clases del Sistema de Diseño

**Todas las páginas usan exclusivamente clases `.sb-*`:**

```css
/* Layouts */
.sb-page, .sb-card, .sb-section, .sb-toolbar

/* Componentes */
.sb-btn (--primary, --secondary, --ghost, --sm, --icon)
.sb-input, .sb-select, .sb-textarea, .sb-label

/* Navegación */
.sb-tabs, .sb-tab, .sb-pill, .sb-badge, .sb-status

/* Tablas */
.sb-table, .sb-table-wrap

/* Drawer */
.sb-drawer, .sb-drawer__overlay, .sb-drawer__header, .sb-header-glass

/* Utilidades */
.hover-raise, .sb-avatar, .sb-tiles, .sb-empty, .sb-kpi
```

---

## 🔥 Firestore Collections

Las colecciones creadas automáticamente:

```
firestore/
├── marketingEvents/
│   └── {eventId}
│       ├── title: string
│       ├── startAt: ISO string
│       ├── endAt?: ISO string
│       ├── city?: string
│       ├── kind: EventKind
│       ├── status: 'planned' | 'active' | 'closed' | 'cancelled'
│       ├── spend?: number
│       ├── createdAt: ISO string
│       └── updatedAt: ISO string
│
├── onlineCampaigns/
│   └── {campaignId}
│       ├── title: string
│       ├── channel: string
│       ├── startAt: ISO string
│       ├── budget?: number
│       ├── spend?: number
│       ├── metrics?: object
│       ├── status: string
│       ├── createdAt: ISO string
│       └── updatedAt: ISO string
│
├── influencerCollabs/
│   └── {collabId}
│       ├── creatorName: string
│       ├── platform: string
│       ├── tier: string
│       ├── status: CollabStatus
│       ├── createdAt: ISO string
│       └── updatedAt: ISO string
│
└── plv_material/
    └── {materialId}
        ├── name: string
        ├── category: 'DISPLAY' | 'SIGNAGE' | 'MERCH'
        └── cost: number
```

---

## ✅ Checklist de Implementación

- [x] **Páginas base** - 5 páginas completas
- [x] **Recharts** - Gráficos en Ads
- [x] **Calendar** - react-day-picker en Eventos
- [x] **Server Actions** - CRUD completo
- [x] **Hook personalizado** - useMarketingActions
- [x] **ImageUpload** - Componente con react-dropzone
- [x] **Toasts** - Notificaciones con sonner
- [x] **Tipos TypeScript** - 100% tipado
- [x] **Sistema de diseño** - Clases `.sb-*`
- [x] **Responsive** - Mobile/Desktop
- [x] **Empty states** - Todas las vistas
- [x] **Loading states** - Estados de carga

---

## 🚀 Próximos Pasos Opcionales

### 1. Añadir Validación con Zod

```typescript
import { z } from 'zod';

const eventSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  startAt: z.string().datetime(),
  city: z.string().optional(),
  kind: z.enum(['DEMO', 'FERIA', 'FORMACION', 'OTRO'])
});

// Uso
const validated = eventSchema.parse(formData);
```

### 2. Añadir Filtros Avanzados

```typescript
const [filters, setFilters] = useState({
  dateRange: { start: '', end: '' },
  status: '',
  city: ''
});

const filteredEvents = events.filter(event => {
  if (filters.status && event.status !== filters.status) return false;
  if (filters.city && !event.city?.includes(filters.city)) return false;
  // ...más filtros
  return true;
});
```

### 3. Exportar a Excel

```typescript
import * as XLSX from 'xlsx';

const exportToExcel = () => {
  const ws = XLSX.utils.json_to_sheet(events);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Eventos');
  XLSX.writeFile(wb, 'eventos_marketing.xlsx');
};
```

---

## 📝 Notas Finales

El módulo de Marketing está **completamente funcional** y listo para producción:

- ✅ **CRUD funcional** con Firestore
- ✅ **UI consistente** con sistema de diseño
- ✅ **UX pulido** con toasts, loaders, empty states
- ✅ **TypeScript** sin errores
- ✅ **Performance** optimizado con useMemo
- ✅ **Responsive** mobile-first
- ✅ **Accesible** con aria-labels

**Total implementado:**
- 5 páginas completas
- 12 server actions
- 1 hook personalizado
- 1 componente de upload
- ~2,000 líneas de código
- Documentación completa

---

## 🆘 Soporte

Para dudas o problemas:
1. Revisar esta documentación
2. Revisar `MARKETING_MODULE_ARCHITECTURE.md`
3. Consultar tipos en `src/domain/ssot.ts`
4. Revisar ejemplos en las páginas existentes
