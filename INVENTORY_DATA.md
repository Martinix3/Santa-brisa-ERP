# Colecciones de Datos para Producción, Inventario y Calidad

Este documento detalla las colecciones de datos principales del `SantaData` SSOT que son fundamentales para los módulos de **Inventario, Producción, Trazabilidad y Calidad**. Cada una cumple un propósito específico para dar una visión completa del ciclo de vida del producto.

---

### 1. Inventario: El Estado Actual del Stock

El módulo de inventario se centra en saber *qué tienes y dónde lo tienes* en tiempo real.

*   #### `inventory`
    *   **Propósito:** Es el corazón del sistema. Representa el **estado actual y en tiempo real** del stock físico. Cada registro es una línea que dice "tengo X cantidad de este SKU, de este lote, en esta ubicación".
    *   **Tipo de Dato:** `InventoryItem[]`
    *   **Cuándo se usa:** Para consultar la disponibilidad de un material, saber cuánto stock hay en cada almacén (`FG/MAIN`, `RM/MAIN`), etc. Se actualiza constantemente.

*   #### `stockMoves`
    *   **Propósito:** Es el **libro de registro (ledger)** de cada movimiento. Aunque no es necesaria para saber el stock *actual*, es indispensable para la auditoría y la trazabilidad. Registra cada entrada, salida, consumo o transferencia.
    *   **Tipo de Dato:** `StockMove[]`
    *   **Cuándo se usa:** Para depurar discrepancias de stock y para reconstruir la historia de un lote.

*   #### `goodsReceipts` (NUEVO)
    *   **Propósito:** Registra la **entrada de mercancía de un proveedor**. Contiene el número de albarán, el proveedor y los productos y lotes recibidos. Es el punto de partida para la trazabilidad de las materias primas.
    *   **Tipo de Dato:** `GoodsReceipt[]`
    *   **Cuándo se usa:** Al recibir un pedido de un proveedor. Desencadena la creación de `StockMove` de tipo `receipt`.


---

### 2. Producción: La Transformación de Materiales

El módulo de producción gestiona el proceso de convertir materias primas en producto terminado.

*   #### `productionOrders`
    *   **Propósito:** Es la orden de trabajo. Representa una **petición para fabricar un producto específico**. Contiene el objetivo de cantidad, el estado (`pending`, `wip`, `done`) y los resultados de la producción.
    *   **Tipo de Dato:** `ProductionOrder[]`
    *   **Cuándo se usa:** Es la entidad central para planificar, ejecutar y monitorizar la actividad de la fábrica.

*   #### `billOfMaterials` (BOMs o Recetas)
    *   **Propósito:** Define la **receta** de un producto. Especifica qué materias primas (`materials`) y en qué cantidades se necesitan para producir un lote de un SKU determinado.
    *   **Tipo de Dato:** `BillOfMaterial[]`
    *   **Cuándo se usa:** Se consulta al crear una `ProductionOrder` para saber qué materiales reservar y consumir del inventario.

---

### 3. Trazabilidad y Calidad: El Historial y ADN del Producto

Estos módulos se encargan de registrar la historia completa de un producto y verificar que cumple los estándares.

*   #### `lots`
    *   **Propósito:** Es el **registro maestro de cada lote** producido o recibido. Contiene información crítica que no cambia, como la fecha de producción, la fecha de caducidad y, muy importante, su **estado de calidad (`qcStatus`)**. Mientras que `inventory` dice *dónde está*, `lots` dice *qué es*.
    *   **Tipo de Dato:** `Lot[]`
    *   **Cuándo se usa:** Es la pieza central de la trazabilidad. Se usa para la lógica FIFO/FEFO y para verificar si un lote está liberado (`release`) o en cuarentena (`hold`).

*   #### `qaChecks`
    *   **Propósito:** Almacena los **resultados de los controles de calidad** realizados a un lote. Cada `QACheck` es un análisis concreto (ej. medición de pH, cata organoléptica) con sus resultados.
    *   **Tipo de Dato:** `QACheck[]`
    *   **Cuándo se usa:** Se consultan para decidir si un lote pasa de `hold` a `release`. Son la prueba documental de la calidad.

*   #### `traceEvents`
    *   **Propósito:** Es un **registro detallado y cronológico de eventos clave** en la vida de un lote o producto. A diferencia de `stockMoves`, puede registrar eventos que no implican movimiento de stock, como una inspección de calidad o el inicio de un proceso.
    *   **Tipo de Dato:** `TraceEvent[]`
    *   **Cuándo se usa:** En la vista de trazabilidad para construir la línea de tiempo completa de un lote, desde el origen de sus ingredientes hasta la venta final.

---

### Catálogos de Soporte

Estas colecciones actúan como diccionarios o tablas maestras para dar contexto al resto de datos.

*   #### `products`
    *   **Propósito:** Catálogo de **producto terminado** (lo que se vende). Contiene datos maestros como el nombre, las unidades por caja, etc.
    *   **Tipo de Dato:** `Product[]`

*   #### `materials`
    *   **Propósito:** Catálogo de **materias primas, packaging y otros consumibles** (lo que se compra o usa en producción).
    *   **Tipo de Dato:** `Material[]`

*   #### `users`
    *   **Propósito:** Lista de usuarios del sistema. Se usa para identificar quién realizó una acción (ej. un control de calidad, una orden de producción).
    *   **Tipo de Dato:** `User[]`
    
*   #### `suppliers`
    *   **Propósito:** Catálogo de **proveedores** de materias primas y otros materiales.
    *   **Tipo de Dato:** `Supplier[]`
