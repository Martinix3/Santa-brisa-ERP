# 💰 Sistema de Precios Multi-Nivel - Guía de Configuración

## 📊 Cómo Funciona

El sistema Santa Brain ahora usa **precios diferenciados por segmento** automáticamente.

### Estructura de Productos (items collection)

Para cada producto en Firestore, puedes definir precios por segmento:

```javascript
{
  id: "item_margarita_mix",
  name: "Margarita Mix 750ml",
  sku: "MM-750",
  category: "fg",
  
  // PRECIO BASE (fallback)
  priceBase: 15.00,
  priceUnit: 15.00,  // Mantener para compatibilidad
  
  // PRECIOS POR SEGMENTO
  priceList: {
    RETAIL: 14.00,       // Tiendas retail
    HORECA: 12.50,       // Bares y restaurantes  
    DISTRIBUTOR: 10.00,  // Distribuidores
    ONLINE: 13.50,       // Venta online
    PRIVADA: 13.00       // Venta privada
  },
  
  // COSTO
  costUnit: 8.00
}
```

## 🎯 Lógica de Aplicación

Cuando Santa Brain crea un pedido:

1. **Obtiene el segmento de la cuenta**
   ```
   Account.segment = "HORECA"
   ```

2. **Busca el precio específico**
   ```
   price = item.priceList["HORECA"]  // 12.50€
   ```

3. **Si no existe, usa precio base**
   ```
   price = item.priceBase  // 15.00€
   ```

4. **Calcula total automáticamente**
   ```
   totalAmount = quantity × price
   ```

## 📝 Cómo Configurar Productos

### Opción 1: Manualmente en Firestore Console

1. Ir a Firebase Console → Firestore
2. Colección `items`
3. Para cada documento, añadir campo:
   ```
   priceList: {
     RETAIL: 14.00,
     HORECA: 12.50,
     DISTRIBUTOR: 10.00,
     ONLINE: 13.50
   }
   ```

### Opción 2: Por Import CSV

Crear CSV con estructura:
```csv
name,sku,priceBase,priceHORECA,priceRETAIL,priceDISTRIBUTOR,priceONLINE,costUnit
Margarita Mix 750ml,MM-750,15.00,12.50,14.00,10.00,13.50,8.00
Mojito Mix 750ml,MJ-750,14.00,11.50,13.00,9.50,12.50,7.50
```

Luego en script de importación, mapear a estructura:
```typescript
priceList: {
  HORECA: row.priceHORECA,
  RETAIL: row.priceRETAIL,
  DISTRIBUTOR: row.priceDISTRIBUTOR,
  ONLINE: row.priceONLINE
}
```

### Opción 3: Con Script de Migración

```typescript
// scripts/add-price-lists.ts
import { adminDb as db } from '@/server/firebase';

const products = [
  {
    sku: "MM-750",
    priceList: {
      RETAIL: 14.00,
      HORECA: 12.50,
      DISTRIBUTOR: 10.00,
      ONLINE: 13.50
    }
  },
  // ... más productos
];

async function updatePrices() {
  for (const product of products) {
    const itemsSnapshot = await db.collection('items')
      .where('sku', '==', product.sku)
      .get();
    
    if (!itemsSnapshot.empty) {
      const itemId = itemsSnapshot.docs[0].id;
      await db.collection('items').doc(itemId).update({
        priceList: product.priceList
      });
      console.log(`✅ Updated ${product.sku}`);
    }
  }
}

updatePrices();
```

## 🚀 Ejemplos de Uso

### Ejemplo 1: Cuenta HORECA con Pedido

```
Usuario: "He visitado Bar Nuevo, pidieron 5 cajas de Margarita Mix"

Sistema:
→ Cuenta: Bar Nuevo (HORECA)
→ Busca item "Margarita Mix"
→ Precio: item.priceList.HORECA = 12.50€
→ Total: 5 × 12.50€ = 62.50€
```

### Ejemplo 2: Cuenta RETAIL con Pedido

```
Usuario: "Tienda El Sol quiere 10 cajas de Mojito Mix"

Sistema:
→ Cuenta: Tienda El Sol (RETAIL)  
→ Busca item "Mojito Mix"
→ Precio: item.priceList.RETAIL = 13.00€
→ Total: 10 × 13.00€ = 130.00€
```

### Ejemplo 3: Sin Precio Específico

```
Sistema:
→ Cuenta: Bar Central (HORECA)
→ Busca item "Producto Nuevo"
→ Precio HORECA no definido
→ Fallback: item.priceBase = 15.00€
→ Total: 5 × 15.00€ = 75.00€
```

## ✅ Ventajas del Sistema

1. **Automático**: Santa Brain aplica el precio correcto sin intervención
2. **Flexible**: Cada producto puede tener precios diferentes por segmento
3. **Escalable**: Fácil añadir nuevos segmentos o productos
4. **Compatible**: Si no hay priceList, usa priceBase/priceUnit

## 🔮 Futuras Mejoras

### Precios Especiales por Cliente (Fase 2)

```javascript
// Nueva collection: pricingRules
{
  id: "rule_123",
  type: "ACCOUNT_SPECIAL",
  accountId: "acc_bar_especial",
  itemId: "item_margarita_mix",
  specialPrice: 11.00,
  validFrom: "2025-01-01",
  validUntil: "2025-12-31"
}
```

### Descuentos por Volumen (Fase 2)

```javascript
{
  type: "VOLUME_DISCOUNT",
  itemId: "item_margarita_mix",
  tiers: [
    { minQty: 50, discount: 0.05 },   // 5%
    { minQty: 100, discount: 0.10 },  // 10%
    { minQty: 200, discount: 0.15 }   // 15%
  ]
}
```

## 📊 Monitoreo

Para verificar que funciona correctamente, revisa:

1. **Pedidos creados con Santa Brain**:
   - Ir a ordersSellOut collection
   - Verificar que `lines[].priceUnit` sea correcto
   - Verificar que `totalAmount` esté bien calculado

2. **Por segmento**:
   ```
   HORECA → 12.50€
   RETAIL → 14.00€
   DISTRIBUTOR → 10.00€
   ```

## 🎯 Acción Inmediata

**Para empezar a usar el sistema:**

1. Elige 2-3 productos principales
2. Añádeles el campo `priceList` en Firestore
3. Prueba con Santa Brain
4. Verifica que los precios sean correctos
5. Extiende al resto del catálogo

¡El sistema ya está funcionando! Solo necesitas configurar los productos.
