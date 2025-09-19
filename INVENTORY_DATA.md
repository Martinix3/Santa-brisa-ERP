# Colecciones de Datos para el Módulo de Inventario

Para que el sistema de gestión de inventario funcione de manera integral, se basa en las siguientes cinco colecciones de datos principales del `SantaData` SSOT. Cada una cumple un propósito específico para dar una visión completa del stock, su estado y su movimiento.

---

### 1. `inventory`

*   **Propósito:** Es el corazón del sistema. Representa el **estado actual y en tiempo real** del stock físico. Cada registro es una línea que dice "tengo X cantidad de este producto/material, de este lote, en esta ubicación".
*   **Tipo de Dato:** `InventoryItem[]`
*   **Campos Clave:** `sku`, `lotNumber`, `qty`, `locationId`.
*   **Cuándo se usa:**
    *   Para consultar la disponibilidad de un material antes de una orden de producción.
    *   Para saber cuánto stock hay en el almacén de producto terminado (`FG/MAIN`), materia prima (`RM/MAIN`), etc.
    *   Se actualiza constantemente con cada movimiento de stock.

### 2. `lots`

*   **Propósito:** Es el registro maestro de cada lote que se ha producido o recibido. Mientras que `inventory` dice *dónde está* un lote, `lots` dice *qué es* ese lote. Contiene información crítica que no cambia, como la fecha de producción, la fecha de caducidad y, muy importante, su estado de calidad.
*   **Tipo de Dato:** `Lot[]`
*   **Campos Clave:** `id` (el número de lote), `sku`, `quantity` (original), `expDate`, `quality.qcStatus`.
*   **Cuándo se usa:**
    *   Para la lógica FIFO (First-In, First-Out) al reservar materiales, ordenando por fecha de creación/recepción.
    *   Para verificar si un lote está `'release'` (liberado) y puede ser vendido, o si está `'hold'` (en cuarentena).
    *   Es la base para la trazabilidad.

### 3. `materials`

*   **Propósito:** Es el catálogo de **materias primas, packaging y otros consumibles**. Proporciona los datos maestros de los artículos que no son producto final.
*   **Tipo de Dato:** `Material[]`
*   **Campos Clave:** `id`, `sku`, `name`, `category`, `standardCost`.
*   **Cuándo se usa:**
    *   Para obtener el nombre, coste o categoría de un `sku` que aparece en el inventario o en una receta (BOM).
    *   Para diferenciar entre 'raw' (materia prima), 'packaging', etc.

### 4. `products`

*   **Propósito:** Similar a `materials`, pero para el **producto terminado**. Es el catálogo de los artículos que se venden.
*   **Tipo de Dato:** `Product[]`
*   **Campos Clave:** `sku`, `name`, `caseUnits`, `casesPerPallet`.
*   **Cuándo se usa:**
    *   Para obtener el nombre de un producto a partir de su `sku` en un pedido o en el inventario de producto terminado.
    *   Para conversiones de unidades (ej. de palets a cajas o de cajas a botellas).

### 5. `stockMoves`

*   **Propósito:** Es el **libro de registro (ledger)** de cada movimiento de inventario. Aunque no es necesaria para saber el stock *actual*, es indispensable para la auditoría y la trazabilidad. Registra cada entrada, salida, consumo o transferencia.
*   **Tipo de Dato:** `StockMove[]`
*   **Campos Clave:** `sku`, `lotId`, `qty`, `fromLocation`, `toLocation`, `reason`.
*   **Cuándo se usa:**
    *   Para depurar discrepancias de stock.
    *   Para reconstruir la historia de un lote específico (trazabilidad).
    *   Para analizar patrones de consumo o movimiento.
