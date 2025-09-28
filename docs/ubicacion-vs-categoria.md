# Informe: Ubicación vs. Categoría en el Inventario

Este documento aclara la diferencia fundamental entre los conceptos de **Ubicación (`locationId`)** y **Categoría (`category`)** en el sistema de gestión de Santa Brisa, explicando su propósito, cómo se relacionan y por qué ambos son cruciales.

---

## 1. El Concepto Clave: ¿Dónde vs. Qué?

La forma más sencilla de entender la diferencia es la siguiente:

*   **Ubicación**: Responde a la pregunta **"¿DÓNDE está?"**. Es un estado físico y temporal del stock.
*   **Categoría**: Responde a la pregunta **"¿QUÉ es?"**. Es una propiedad lógica e intrínseca del producto.

Un mismo producto (un "qué") puede estar en diferentes sitios ("dónde") a lo largo de su ciclo de vida.

---

## 2. Categoría (`category`)

La categoría es el ADN de un `Item`. Define su naturaleza y propósito dentro de la cadena de valor. Es un atributo del **maestro de productos** (`items`) y no cambia, independientemente de dónde se encuentre el stock.

### Propósito

*   **Clasificación Lógica**: Agrupa los productos según su función.
*   **Impulsa la Lógica de Negocio**: El sistema utiliza la categoría para saber qué se puede hacer con un producto.
    *   Solo los ítems de categoría `'fg'` (Finished Good / Producto Terminado) se pueden vender a clientes finales.
    *   Solo los ítems `'raw'` (Materia Prima) o `'pack'` (Packaging) se pueden usar en una orden de producción.

### Valores Típicos en `ssot.ts`

```typescript
export type ItemCategory = 
  | 'fg'           // Producto Terminado (lo que se vende)
  | 'raw'          // Materia Prima (ingredientes)
  | 'pack'         // Material de Embalaje (botellas, tapones, cajas)
  | 'intermediate' // Producto Intermedio (la mezcla antes de embotellar)
  | 'consumable'   // Consumibles de fábrica (material de limpieza, etc.)
  | 'merch';       // Merchandising (camisetas, vasos)
```

**Ejemplo**:
El ítem "Botella de vidrio 750ml" (SKU: `PKG-BOTTLE-PILOT`) **siempre** tendrá la categoría `'pack'`, ya esté en el camión del proveedor, en el almacén de materias primas o en la línea de envasado.

---

## 3. Ubicación (`locationId`)

La ubicación describe el **lugar físico y lógico** donde se encuentra una cantidad específica de un lote. Es un atributo del **inventario en tiempo real** (`onHand`) y cambia constantemente a través de los movimientos de stock (`stockMoves`).

### Propósito

*   **Gestión Física del Almacén**: Saber exactamente dónde está cada cosa para poder encontrarla (picking) o guardarla (put-away).
*   **Gestión de Estados**: Las ubicaciones no solo son físicas, también pueden representar un estado lógico. `QC/AREA` no es solo un sitio, significa "este stock está pendiente de revisión de calidad".
*   **Disponibilidad**: Permite saber cuánto stock está realmente disponible para la venta (`FG/MAIN`) vs. cuánto está bloqueado (`QC/HOLD` o `RETURNS`).

### Valores Típicos (Ejemplos de `locationId`)

*   `RM/MAIN`: Almacén principal de Materias Primas.
*   `PKG/MAIN`: Almacén principal de Packaging.
*   `FG/MAIN`: Almacén principal de Producto Terminado (listo para vender).
*   `QC/AREA`: Zona de cuarentena para control de calidad.
*   `PROD/LINEA1`: En la línea de producción 1 (consumo inminente).
*   `TRANSIT/IN`: Mercancía en tránsito de entrada.
*   `RETURNS/AREA`: Zona para devoluciones de cliente.

**Ejemplo**:
El lote `240801-SB-750-01` de "Santa Brisa 750ml" (categoría `'fg'`) puede tener:
*   100 unidades en la ubicación `QC/AREA` (recién producido, pendiente de análisis).
*   Tras ser aprobado, se moverá y tendrá 100 unidades en `FG/MAIN` (disponible para la venta).
*   2 unidades pueden estar en `SAMPLES/AREA` (apartado para muestras).

En todos los casos, la **categoría** del producto sigue siendo `'fg'`, pero su **ubicación** ha cambiado.

---

## 4. Relación y Flujo de Trabajo

La categoría y la ubicación trabajan juntas para orquestar los procesos. El sistema se basa en reglas que conectan ambas.

**Ejemplo de Flujo de Recepción de Materia Prima:**

1.  **Recepción**: Se recibe un pedido de "Agave" (categoría: `'raw'`).
2.  **Movimiento**: Se crea un `StockMove` para registrar la entrada.
3.  **Ubicación Inicial**: El `toLocation` de este movimiento es `QC/AREA`. Ahora hay X kg de Agave en la ubicación de cuarentena.
4.  **Control de Calidad**: El equipo de calidad analiza el lote.
5.  **Liberación**: Si el lote es aprobado, se crea otro `StockMove` (tipo `transfer`) desde `QC/AREA` hacia `RM/MAIN`.
6.  **Disponibilidad**: El Agave ahora está en la ubicación `RM/MAIN` y disponible para ser usado en producción.

En este flujo, la **categoría** `'raw'` nunca cambió, pero la **ubicación** evolucionó de `QC/AREA` a `RM/MAIN`, reflejando el cambio de estado del stock de "pendiente de revisión" a "disponible para uso".

## Conclusión

| Concepto      | Propósito Principal                               | ¿Cuándo cambia?                                  | Ejemplo en el SSOT                     |
| :------------ | :------------------------------------------------ | :----------------------------------------------- | :------------------------------------- |
| **Categoría** | Define **qué es** un producto (su naturaleza).    | Prácticamente **nunca**. Es parte del maestro.   | `Item.category: 'raw'`                 |
| **Ubicación** | Define **dónde está** el stock (su estado físico). | **Constantemente**, con cada `StockMove`.        | `OnHandView.locationId: 'FG/MAIN'`     |

Entender esta separación es clave para la integridad del inventario, la trazabilidad y la correcta ejecución de los procesos de producción y logística.
