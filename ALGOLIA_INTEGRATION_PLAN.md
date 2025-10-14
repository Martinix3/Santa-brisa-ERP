# Plan de Integración Algolia para Santa Brisa ERP

## 🎯 Por qué Algolia

### Ventajas vs Búsqueda Local
1. **Búsqueda Fuzzy** - Tolerancia a errores tipográficos ("Can Pep" encuentra "Ca'n Pep")
2. **Búsqueda Multi-campo** - Busca simultáneamente en nombre, ciudad, NIF, etc.
3. **Instantánea** - Resultados mientras escribes (<10ms)
4. **Facets** - Filtros dinámicos que muestran conteos
5. **Highlighting** - Resalta los términos encontrados
6. **Ranking** - Resultados ordenados por relevancia
7. **Sinónimos** - "restaurante" → "rest", "resto"

### Costos
- **Free Tier**: 10K búsquedas/mes + 10K registros
- **Growth**: $1/mes por 1K búsquedas adicionales
- Para 247 cuentas: **GRATIS** ✅

---

## 📋 Arquitectura Propuesta

### Índices a Crear
```typescript
- accounts_production
  ├─ searchableAttributes: ['name', 'tradeName', 'billingAddress.city', 'fiscalId']
  ├─ facets: ['segment', 'stage', 'flow', 'billingAddress.city']
  └─ customRanking: ['desc(updatedAt)', 'asc(name)']

- items_production
  ├─ searchableAttributes: ['name', 'sku']
  ├─ facets: ['category', 'active']
  └─ customRanking: ['desc(priceUnit)']

- orders_production
  ├─ searchableAttributes: ['docNumber', 'accountName']
  ├─ facets: ['status', 'source']
  └─ customRanking: ['desc(createdAt)']
```

### Sincronización con Firestore
```
Firestore Change → Cloud Function → Algolia Index
```

**Opciones:**
1. **Firebase Extension** (Recomendado) - Oficial, sin código
2. **Cloud Functions personalizadas** - Más control
3. **Manual sync** - Script one-time + webhook

---

## 🚀 Implementación

### Fase 1: Setup Básico (30 min)

#### 1. Instalar Firebase Extension
```bash
firebase ext:install algolia/firestore-algolia-search
```

**Configuración:**
- Collection: `accounts`
- Index name: `accounts_production`
- Fields: `name,tradeName,segment,stage,billingAddress`

#### 2. Variables de Entorno
```bash
# .env.local
NEXT_PUBLIC_ALGOLIA_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=YOUR_SEARCH_ONLY_KEY
ALGOLIA_ADMIN_KEY=YOUR_ADMIN_KEY
```

#### 3. Instalar SDK
```bash
npm install algoliasearch instantsearch.js react-instantsearch
```

---

### Fase 2: Componente de Búsqueda (1h)

#### Hook Personalizado
```typescript
// src/hooks/useAlgoliaSearch.ts
import algoliasearch from 'algoliasearch/lite';
import { useState, useEffect } from 'react';

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

export function useAlgoliaSearch<T>(indexName: string, query: string, filters?: string) {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    const index = searchClient.initIndex(indexName);

    index.search(query, {
      filters,
      hitsPerPage: 50,
      attributesToHighlight: ['name', 'tradeName'],
    })
      .then(({ hits }) => {
        setResults(hits as T[]);
      })
      .finally(() => setLoading(false));
  }, [indexName, query, filters]);

  return { results, loading };
}
```

#### Componente de Búsqueda Avanzada
```typescript
// src/components/AlgoliaAccountSearch.tsx
'use client';

import { useState } from 'react';
import { Configure, InstantSearch, SearchBox, Hits, RefinementList } from 'react-instantsearch';
import algoliasearch from 'algoliasearch/lite';
import Link from 'next/link';

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

function Hit({ hit }: { hit: any }) {
  return (
    <Link 
      href={`/accounts/${hit.objectID}`}
      className="block p-3 rounded-lg hover:bg-background/60 transition-colors"
    >
      <div className="font-medium">{hit.name}</div>
      <div className="text-xs text-muted-foreground">
        {hit.billingAddress?.city} · {hit.segment}
      </div>
    </Link>
  );
}

export function AlgoliaAccountSearch() {
  return (
    <InstantSearch 
      searchClient={searchClient} 
      indexName="accounts_production"
    >
      <Configure hitsPerPage={10} />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Búsqueda */}
        <div className="md:col-span-3">
          <SearchBox 
            placeholder="Buscar cuentas..."
            classNames={{
              root: 'relative',
              input: 'w-full px-4 py-2 rounded-lg border border-border/40 bg-background/60',
            }}
          />
          
          <div className="mt-4">
            <Hits hitComponent={Hit} />
          </div>
        </div>
        
        {/* Facets */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-sm">Segmento</h3>
            <RefinementList attribute="segment" />
          </div>
          
          <div>
            <h3 className="font-semibold mb-2 text-sm">Estado</h3>
            <RefinementList attribute="stage" />
          </div>
          
          <div>
            <h3 className="font-semibold mb-2 text-sm">Ciudad</h3>
            <RefinementList 
              attribute="billingAddress.city" 
              searchable
            />
          </div>
        </div>
      </div>
    </InstantSearch>
  );
}
```

---

### Fase 3: Integrar en /admin/accounts (30 min)

#### Reemplazar búsqueda local con Algolia
```typescript
// src/app/(app)/admin/accounts/page.tsx

import { AlgoliaAccountSearch } from '@/components/AlgoliaAccountSearch';

export default function AdminAccountsPage() {
  const [useAlgolia, setUseAlgolia] = useState(true);
  
  return (
    <div>
      {/* Toggle Algolia/Local */}
      <button onClick={() => setUseAlgolia(!useAlgolia)}>
        {useAlgolia ? 'Usar búsqueda local' : 'Usar Algolia'}
      </button>
      
      {useAlgolia ? (
        <AlgoliaAccountSearch />
      ) : (
        {/* Tu tabla actual */}
      )}
    </div>
  );
}
```

---

### Fase 4: Sincronización Inicial (Script)

#### Script para Indexar Cuentas Existentes
```typescript
// scripts/sync-algolia.ts
import algoliasearch from 'algoliasearch';
import { getServerData } from '@/lib/dataprovider/server';

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

async function syncAccounts() {
  const data = await getServerData();
  const index = client.initIndex('accounts_production');
  
  // Configurar índice
  await index.setSettings({
    searchableAttributes: [
      'name',
      'tradeName',
      'billingAddress.city',
      'billingAddress.street',
    ],
    attributesForFaceting: [
      'segment',
      'stage',
      'flow',
      'billingAddress.city',
    ],
    customRanking: ['desc(updatedAt)'],
  });
  
  // Indexar documentos
  const records = data.accounts.map(account => ({
    objectID: account.id,
    name: account.name,
    tradeName: account.tradeName,
    segment: account.segment,
    stage: account.stage,
    flow: account.flow,
    billingAddress: account.billingAddress,
    updatedAt: account.updatedAt,
  }));
  
  await index.saveObjects(records);
  console.log(`✅ Indexed ${records.length} accounts`);
}

syncAccounts();
```

Ejecutar:
```bash
npx tsx scripts/sync-algolia.ts
```

---

## 🎨 UI Mejorada con Algolia

### Búsqueda Instantánea (As-you-type)
```typescript
<SearchBox
  placeholder="Buscar cuentas..."
  autoFocus
  showLoadingIndicator
/>
```

### Highlighting de Términos
```typescript
import { Highlight } from 'react-instantsearch';

<Highlight attribute="name" hit={hit} />
```

### Stats de Búsqueda
```typescript
import { Stats } from 'react-instantsearch';

<Stats 
  translations={{
    rootElementText: ({ nbHits }) => `${nbHits} resultados`
  }}
/>
```

### Paginación
```typescript
import { Pagination } from 'react-instantsearch';

<Pagination 
  padding={2}
  showFirst={false}
  showLast={false}
/>
```

---

## 📊 Alternativas a Algolia

### 1. **Typesense** (Open Source)
- **Pros**: Gratis, self-hosted, similar a Algolia
- **Contras**: Requiere servidor propio
- **Coste**: $5-10/mes (VPS)

### 2. **MeiliSearch** (Open Source)
- **Pros**: Muy rápido, fácil setup
- **Contras**: Menos features que Algolia
- **Coste**: Gratis (self-hosted)

### 3. **Firestore + Elastic/Typesense Cloud**
- Hybrid approach
- Firestore para CRUD, Elastic para búsqueda

---

## 💰 Comparativa de Costos

| Solución | Setup | Coste Mensual | Pros |
|----------|-------|---------------|------|
| **Algolia** | 30 min | $0 (Free tier) | Oficial, sin servidor, fácil |
| **Typesense Cloud** | 1h | $0.03/h (~$20/mes) | Open source, potente |
| **MeiliSearch Cloud** | 1h | $10-30/mes | Rápido, buena DX |
| **Local Search** | 0 | $0 | Ya funciona, simple |

---

## 🎯 Recomendación

Para Santa Brisa con 247 cuentas:

### **Opción 1: Algolia (Recomendado)**
- ✅ Free tier suficiente
- ✅ Setup en 30 min con Firebase Extension
- ✅ Zero mantenimiento
- ✅ UX premium

### **Opción 2: Mantener Local + Mejorar**
- ✅ Gratis
- ✅ Ya funciona
- ⚠️ Limitar a fuzzy simple (Fuse.js)

### **Opción 3: Typesense (Si creces >1000 cuentas)**
- Más control
- Open source
- Requiere VPS

---

## 🚀 Siguiente Paso

¿Quieres que:
1. **Configure Algolia** (Firebase Extension + setup)
2. **Implemente el componente** de búsqueda con InstantSearch
3. **Integre** en `/admin/accounts`

O prefieres:
- Mantener búsqueda local simple por ahora
- Evaluar Typesense/MeiliSearch

**¿Procedemos con Algolia?** 🔍
