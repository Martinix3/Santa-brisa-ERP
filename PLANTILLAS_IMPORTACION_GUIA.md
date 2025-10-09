# 📋 Guía Completa de Plantillas de Importación

**Fecha:** 8 de Enero de 2025  
**Versión:** 1.0 - Modelo de Colocación Completo  

---

## 🎯 Resumen Ejecutivo

Esta guía documenta las plantillas CSV para importar datos al ERP Santa Brisa siguiendo el **modelo de colocación** (PLACEMENT) que gestiona la relación entre distribuidores, comerciales y cuentas.

### Plantillas Disponibles

1. ✅ **plantilla_users.csv** - Comerciales y usuarios del sistema
2. ✅ **plantilla_parties.csv** - Entidades jurídicas (distribuidores, clientes)
3. ✅ **plantilla_partyRoles.csv** - Relaciones comercial ↔ distribuidor ⭐ **CRÍTICA**
4. ✅ **plantilla_accounts.csv** - Cuentas comerciales con flujo PLACEMENT/DIRECT
5. ✅ **plantilla_items.csv** - Productos con precios por segmento y logística

---

## 🔄 Orden de Importación OBLIGATORIO

```
1. plantilla_users.csv
   ↓
2. plantilla_parties.csv
   ↓
3. plantilla_partyRoles.csv ⭐ (vincula users ↔ parties)
   ↓
4. plantilla_accounts.csv
   ↓
5. plantilla_items.csv
```

**⚠️ IMPORTANTE:** Este orden es crítico porque cada paso depende de los IDs del paso anterior.

---

## 📁 Plantilla 1: plantilla_users.csv

### Propósito
Crear los comerciales y usuarios que trabajarán en el sistema.

### Campos

| Campo | Tipo | Obligatorio | Descripción | Ejemplo |
|-------|------|-------------|-------------|---------|
| id | string | ✅ | ID único del usuario | `user_comercial_juan` |
| name | string | ✅ | Nombre completo | `Juan Pérez` |
| email | string | ✅ | Email corporativo | `juan.perez@santabrisa.com` |
| role | string | ✅ | Rol: `comercial`, `admin`, `ops`, `owner` | `comercial` |
| active | boolean | ✅ | Usuario activo | `true` |
| createdAt | ISO date | ✅ | Fecha de creación | `2025-01-01T00:00:00.000Z` |
| updatedAt | ISO date | ✅ | Última actualización | `2025-01-01T00:00:00.000Z` |

### Ejemplo

```csv
id,name,email,role,active,createdAt,updatedAt
user_comercial_juan,Juan Pérez,juan.perez@santabrisa.com,comercial,true,2025-01-01T00:00:00.000Z,2025-01-01T00:00:00.000Z
```

---

## 📁 Plantilla 2: plantilla_parties.csv

### Propósito
Crear entidades jurídicas: distribuidores, clientes, Santa Brisa misma.

### Campos Principales

| Campo | Tipo | Obligatorio | Descripción | Ejemplo |
|-------|------|-------------|-------------|---------|
| id | string | ✅ | ID único | `party_dist_mahou` |
| name | string | ✅ | Nombre comercial | `Distribuidora Mahou` |
| kind | string | ✅ | `ORG` (organización) o `PERSON` (persona física) | `ORG` |
| roles | string | ✅ | Roles separados por coma | `"DISTRIBUTOR,CUSTOMER"` |
| legalName | string | ✅ | Razón social | `Mahou San Miguel SA` |
| tradeName | string | ⚪ | Nombre comercial | `Mahou` |
| vat | string | ✅ | NIF/CIF | `B12345678` |

### Campos de Dirección (Billing)

| Campo | Obligatorio | Ejemplo |
|-------|-------------|---------|
| billingAddress_street | ✅ | `Calle Alovera 1` |
| billingAddress_city | ✅ | `Alovera` |
| billingAddress_zip | ✅ | `19208` |
| billingAddress_province | ✅ | `Guadalajara` |
| billingAddress_country | ✅ | `España` |

### Campos de Dirección (Shipping) - Opcional

Similar a billing, pero con prefijo `shippingAddress_`

### Campos de Contacto

| Campo | Obligatorio | Ejemplo |
|-------|-------------|---------|
| email_1 | ✅ | `comercial@mahou.es` |
| email_1_isPrimary | ✅ | `true` |
| phone_1 | ✅ | `912345678` |
| phone_1_isPrimary | ✅ | `true` |
| contactPerson_name | ⚪ | `Pedro López` |
| contactPerson_role | ⚪ | `Comercial` |
| contactPerson_email | ⚪ | `pedro@mahou.es` |
| contactPerson_phone | ⚪ | `912345679` |

### Valores de `kind`

- **ORG**: Organización, empresa, entidad jurídica (Ej: Distribuidora Mahou SL, Bar Central SL)
- **PERSON**: Persona física (Ej: Cliente particular, influencer individual)

### Roles Importantes

- **DISTRIBUTOR**: Esta party es un distribuidor (Mahou, Damm, Santa Brisa)
- **CUSTOMER**: Esta party es un cliente
- **BRAND**: Santa Brisa como marca

### Ejemplo: Distribuidor

```csv
party_dist_mahou,Distribuidora Mahou,ORG,"DISTRIBUTOR,CUSTOMER",Mahou San Miguel SA,Mahou,B12345678,...
```

### Ejemplo: Santa Brisa (Distribuidor Interno)

```csv
party_santa_brisa,Santa Brisa,ORG,"DISTRIBUTOR,BRAND",Santa Brisa Bebidas SL,Santa Brisa,B11111111,...
```

---

## 📁 Plantilla 3: plantilla_partyRoles.csv ⭐ CRÍTICA

### Propósito
**LA MÁS IMPORTANTE**: Vincula comerciales con distribuidores. Sin esto, el modelo de colocación NO funciona.

### Campos

| Campo | Tipo | Obligatorio | Descripción | Ejemplo |
|-------|------|-------------|-------------|---------|
| id | string | ✅ | ID único | `role_001` |
| partyId | string | ✅ | ID del distribuidor (Party) | `party_dist_mahou` |
| userId | string | ✅ | ID del comercial (User) | `user_comercial_juan` |
| role | string | ✅ | Siempre `SALESPERSON` | `SALESPERSON` |
| isActive | boolean | ✅ | Relación activa | `true` |
| createdAt | ISO date | ✅ | Fecha de creación | `2025-01-01T00:00:00.000Z` |

### Ejemplo

```csv
id,partyId,userId,role,isActive,createdAt
role_001,party_dist_mahou,user_comercial_juan,SALESPERSON,true,2025-01-01T00:00:00.000Z
```

### Significado

```
Comercial "Juan Pérez" (user_comercial_juan)
    ↓ trabaja para
Distribuidor "Mahou" (party_dist_mahou)
```

---

## 📁 Plantilla 4: plantilla_accounts.csv

### Propósito
Crear cuentas comerciales con asignación de comercial y distribuidor.

### Campos Principales

| Campo | Tipo | Obligatorio | Descripción | Ejemplo |
|-------|------|-------------|-------------|---------|
| id | string | ✅ | ID único | `acc_bar_central` |
| name | string | ✅ | Nombre de la cuenta | `Bar Central` |
| partyId | string | ✅ | ID de la Party asociada | `party_bar_central` |
| segment | string | ✅ | `HORECA`, `RETAIL`, `ONLINE`, `PRIVADA`, `DISTRIBUIDOR` | `HORECA` |
| stage | string | ✅ | `POTENCIAL`, `ACTIVA`, `SEGUIMIENTO`, `FALLIDA` | `ACTIVA` |
| flow | string | ✅ | `PLACEMENT` o `DIRECT` | `PLACEMENT` |
| ownerId | string | ✅ | ID del comercial responsable | `user_comercial_juan` |
| distributorPartyId | string | ⚠️ | ID del distribuidor (obligatorio si PLACEMENT) | `party_dist_mahou` |
| aliases | string | ⚪ | Aliases para fuzzy matching, separados por `;` | `"central;bar centro"` |
| source | string | ✅ | `CRM`, `MANUAL`, `SHOPIFY` | `CRM` |

### Campos de Ubicación (Opcional)

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| location_lat | number | `40.4168` |
| location_lng | number | `-3.7038` |
| location_address | string | `"Calle Mayor 23, Madrid"` |

### Reglas Críticas

1. **Si flow = PLACEMENT** → `distributorPartyId` **OBLIGATORIO**
2. **Si flow = DIRECT** → `distributorPartyId` debe estar **VACÍO**
3. **Aliases**: Para Santa Brain fuzzy matching, separar con `;`

### Ejemplo: Cuenta PLACEMENT (Colocación)

```csv
acc_bar_central,Bar Central,party_bar_central,HORECA,ACTIVA,PLACEMENT,user_comercial_juan,party_dist_mahou,"central;bar centro;el central",CRM,...
```

**Significado:**
- Comercial: Juan Pérez
- Distribuidor: Mahou
- Cuenta: Bar Central (cliente final)
- Santa Brisa → Mahou (sell-in) → Bar Central (sell-out)

### Ejemplo: Cuenta DIRECT (Venta Directa)

```csv
acc_online_pedro,Cliente Web Pedro,party_online_001,ONLINE,ACTIVA,DIRECT,user_admin,,"",SHOPIFY,...
```

**Significado:**
- No hay distribuidor
- Santa Brisa factura directamente al cliente
- Típico de pedidos online

---

## 📁 Plantilla 5: plantilla_items.csv

### Propósito
Productos con precios por segmento y datos logísticos para Santa Brain.

### Campos Principales

| Campo | Tipo | Obligatorio | Descripción | Ejemplo |
|-------|------|-------------|-------------|---------|
| id | string | ✅ | ID único | `item_santabrisa_750` |
| sku | string | ✅ | Código de producto | `SB-750` |
| name | string | ✅ | Nombre | `Santa Brisa 750ml` |
| category | string | ✅ | `fg`, `raw`, `pack`, `label`, `merch` | `fg` |
| uom | string | ✅ | `bottle`, `unit`, `case`, etc | `bottle` |
| active | boolean | ✅ | Producto activo | `true` |
| isActive | boolean | ✅ | Duplicado de active | `true` |

### Campos de Logística (Santa Brain)

| Campo | Tipo | Obligatorio | Descripción | Ejemplo |
|-------|------|-------------|-------------|---------|
| unitsPerCase | number | ✅ | Unidades por caja (conversión automática) | `6` |
| priceBase | number | ✅ | Precio base | `15.00` |
| priceUnit | number | ✅ | Precio por unidad | `15.00` |

### Campos de Precios por Segmento

| Campo | Tipo | Obligatorio | Ejemplo |
|-------|------|-------------|---------|
| priceList_HORECA | number | ⚠️ | `12.50` |
| priceList_RETAIL | number | ⚠️ | `14.00` |
| priceList_DISTRIBUTOR | number | ⚠️ | `10.00` |
| priceList_ONLINE | number | ⚠️ | `13.50` |
| priceList_PRIVADA | number | ⚠️ | `13.00` |

**⚠️ Obligatorio para productos de venta (fg)**

### Campos de Costos y Logística

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| costUnit | number | Costo de producción | `8.00` |
| weightPerUnit | number | Peso en kg | `0.75` |
| volumePerUnit | number | Volumen en L | `0.75` |
| casesPerPallet | number | Cajas por pallet | `80` |
| stdCost | number | Costo estándar | `8.00` |
| bottleMl | number | Mililitros (legacy) | `750` |
| caseUnits | number | Unidades por caja (legacy) | `6` |

### Ejemplo: Producto de Venta

```csv
item_santabrisa_750,SB-750,Santa Brisa 750ml,fg,bottle,true,true,6,15.00,15.00,12.50,14.00,10.00,13.50,13.00,8.00,0.75,0.75,80,8.00,750,6
```

### Ejemplo: Materia Prima

```csv
item_agave_nectar,AGV-500,Agave Nectar 500ml,raw,bottle,true,true,12,8.00,8.00,,,,,5.00,0.50,0.50,120,5.00,500,12
```

**Nota:** Materias primas no tienen precios por segmento (vacío).

---

## 🔗 Flujo Completo del Modelo de Colocación

### Escenario: Comercial crea pedido vía distribuidor

```
┌─────────────────────────────────────────────────────────┐
│ 1. USERS (plantilla_users.csv)                         │
│    user_comercial_juan = Juan Pérez                    │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│ 2. PARTIES (plantilla_parties.csv)                     │
│    party_dist_mahou = Distribuidora Mahou              │
│    party_bar_central = Bar Central SL                  │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│ 3. PARTY_ROLES (plantilla_partyRoles.csv) ⭐           │
│    Juan Pérez → trabaja para → Mahou                   │
│    (userId: user_comercial_juan)                       │
│    (partyId: party_dist_mahou)                         │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│ 4. ACCOUNTS (plantilla_accounts.csv)                   │
│    acc_bar_central:                                     │
│      - ownerId: user_comercial_juan (comercial)        │
│      - distributorPartyId: party_dist_mahou            │
│      - flow: PLACEMENT                                  │
│      - aliases: "central;bar centro"                    │
└────────────────┬────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│ 5. ITEMS (plantilla_items.csv)                         │
│    item_santabrisa_750:                                 │
│      - unitsPerCase: 6 (conversión cajas→botellas)     │
│      - priceList_HORECA: 12.50€                        │
└─────────────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────┐
│ RESULTADO: QuickLog puede crear pedidos                │
│                                                         │
│ Comercial Juan dice: "visitamos bar cental, 5 cajas"   │
│   ↓                                                     │
│ Santa Brain:                                            │
│   - Fuzzy match: "cental" → "Bar Central" (aliases)    │
│   - Conversión: 5 cajas × 6 = 30 botellas             │
│   - Precio: HORECA = 12.50€/botella                    │
│   - Total: 30 × 12.50€ = 375€                          │
│   ↓                                                     │
│ Pedido creado:                                          │
│   - accountId: acc_bar_central                         │
│   - flow: PLACEMENT                                     │
│   - distributorId: party_dist_mahou                    │
│   - createdById: user_comercial_juan                   │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Validaciones al Importar

### 1. Validación de Users

```typescript
- email debe ser único
- role debe ser: comercial, admin, ops, owner
- active debe ser boolean
```

### 2. Validación de Parties

```typescript
- kind debe ser: ORG o PERSON
- roles debe incluir al menos uno: DISTRIBUTOR, CUSTOMER, etc
- vat debe ser único si es ORG
- Si tiene rol DISTRIBUTOR → debe tener dirección completa
```

### 3. Validación de PartyRoles ⭐

```typescript
- partyId debe existir en parties
- userId debe existir en users
- role debe ser: SALESPERSON (para comerciales)
- No debe haber duplicados (userId + partyId únicos)
```

### 4. Validación de Accounts

```typescript
- partyId debe existir en parties
- ownerId debe existir en users
- segment debe ser válido: HORECA, RETAIL, etc
- stage debe ser válido: POTENCIAL, ACTIVA, etc
- flow debe ser: PLACEMENT o DIRECT

// Regla crítica PLACEMENT
if (flow === 'PLACEMENT') {
  - distributorPartyId OBLIGATORIO
  - distributorPartyId debe existir en parties
  - distributorPartyId debe tener rol DISTRIBUTOR
  - El ownerId debe tener partyRole con ese distributor
}

// Regla crítica DIRECT
if (flow === 'DIRECT') {
  - distributorPartyId debe estar VACÍO
}
```

### 5. Validación de Items

```typescript
- sku debe ser único
- category debe ser válido: fg, raw, pack, label, merch
- uom debe ser válido: bottle, unit, case, etc

// Para productos de venta (fg)
if (category === 'fg') {
  - unitsPerCase OBLIGATORIO
  - priceList_HORECA OBLIGATORIO
  - priceList_RETAIL OBLIGATORIO
  - priceList_DISTRIBUTOR OBLIGATORIO
}
```

---

## 🚨 Errores Comunes

### Error 1: PartyRole sin crear

```
❌ Account con distributorPartyId pero sin partyRole

Solución: Crear entrada en plantilla_partyRoles.csv que vincule
el comercial (ownerId) con el distribuidor (distributorPartyId)
```

### Error 2: PLACEMENT sin distribuidor

```
❌ Account con flow=PLACEMENT pero distributorPartyId vacío

Solución: Agregar distributorPartyId o cambiar flow a DIRECT
```

### Error 3: DIRECT con distribuidor

```
❌ Account con flow=DIRECT pero tiene distributorPartyId

Solución: Vaciar distributorPartyId o cambiar flow a PLACEMENT
```

### Error 4: Item sin precios por segmento

```
❌ Item de venta (fg) sin priceList_HORECA, etc

Solución: Agregar precios para todos los segmentos
```

### Error 5: Aliases mal formateados

```
❌ aliases con espacios o caracteres raros

Solución: Usar formato "alias1;alias2;alias3" sin espacios extras
```

---

## 📊 Ejemplo Completo Mínimo

### 1. plantilla_users.csv

```csv
id,name,email,role,active,createdAt,updatedAt
user_juan,Juan Pérez,juan@sb.com,comercial,true,2025-01-01T00:00:00.000Z,2025-01-01T00:00:00.000Z
```

### 2. plantilla_parties.csv

```csv
id,name,kind,roles,legalName,vat,billingAddress_street,billingAddress_city,billingAddress_zip,billingAddress_province,billingAddress_country,email_1,email_1_isPrimary,phone_1,phone_1_isPrimary,createdAt,updatedAt
party_dist,Mahou,ORG,DISTRIBUTOR,Mahou SA,B123,Calle 1,Madrid,28001,Madrid,España,info@m.es,true,912345678,true,2025-01-01T00:00:00.000Z,2025-01-01T00:00:00.000Z
party_cliente,Bar X,ORG,CUSTOMER,Bar X SL,B456,Calle 2,Madrid,28002,Madrid,España,bar@x.es,true,913456789,true,2025-01-01T00:00:00.000Z,2025-01-01T00:00:00.000Z
```

### 3. plantilla_partyRoles.csv

```csv
id,partyId,userId,role,isActive,createdAt
role_1,party_dist,user_juan,SALESPERSON,true,2025-01-01T00:00:00.000Z
```

### 4. plantilla_accounts.csv

```csv
id,name,partyId,segment,stage,flow,ownerId,distributorPartyId,aliases,source,createdAt,updatedAt
acc_bar,Bar X,party_cliente,HORECA,ACTIVA,PLACEMENT,user_juan,party_dist,"bar;bar x",CRM,2025-01-01T00:00:00.000Z,2025-01-01T00:00:00.000Z
```

### 5. plantilla_items.csv

```csv
id,sku,name,category,uom,active,isActive,unitsPerCase,priceBase,priceList_HORECA,priceList_RETAIL,priceList_DISTRIBUTOR,costUnit
item_sb,SB-750,Santa Brisa,fg,bottle,true,true,6,15.00,12.50,14.00,10.00,8.00
```

---

## 📚 Referencias

- **SSOT**: `src/domain/ssot.ts` - Definiciones de tipos
- **Modelo de Colocación**: `DISTRIBUTOR_FLOW_MODEL.md`
- **Santa Brain**: `SANTA_BRAIN_INTELLIGENCE.md`
- **Sistema de Precios**: `PRICING_SYSTEM.md`

---

## ✅ Checklist Pre-Importación

- [ ] Todas las plantillas tienen datos de ejemplo válidos
- [ ] Los IDs son consistentes entre plantillas
- [ ] Cada comercial tiene al menos un partyRole
- [ ] Cada account PLACEMENT tiene distributorPartyId
- [ ] Cada account DIRECT NO tiene distributorPartyId
- [ ] Todos los items fg tienen precios por segmento
- [ ] Los aliases están bien formateados (separados por `;`)
- [ ] Las fechas están en formato ISO correcto
- [ ] Los emails son únicos

---

**Documento creado por**: Sistema de Desarrollo  
**Última actualización**: 8 de Enero de 2025
