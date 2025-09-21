# Lógica del Inventario: Productos, Materiales y Producción

Este documento explica cómo se conectan las diferentes partes del sistema para gestionar el inventario, desde la materia prima hasta el producto vendido.

---

## 1. Las Entidades Clave

El sistema se organiza en torno a varios conceptos fundamentales que trabajan juntos.

### A. Los Catálogos: El "QUÉ" tenemos

Son las listas maestras de todos los artículos que manejamos.

*   #### `materials`
    *   **Propósito**: Es el catálogo de **todo lo que no es producto final de venta**. Incluye materias primas (agave, zumo de limón), material de embalaje (botellas, tapones, cajas) y material de marketing (vasos, posavasos).
    *   **Ejemplo**: Un registro en `materials` podría ser "Botella de vidrio 750ml" con el SKU `PKG-BOTTLE-PILOT`.

*   #### `products`
    *   **Propósito**: Es el catálogo de **lo que vendes a tus clientes** (producto terminado o *Finished Good*).
    *   **Ejemplo**: Un registro en `products` es "Santa Brisa 750ml" con el SKU `SB-750`.

### B. La Receta: El "CÓMO" se hace

*   #### `billOfMaterials` (BOM)
    *   **Propósito**: Es la **receta de un producto**. Define qué `materials` y en qué cantidades se necesitan para producir una cantidad base de un `product`.
    *   **Conexión**: Vincula un `product` (por su SKU) con una lista de `materials` (por sus IDs/SKUs).
    *   **Ejemplo**: La BOM para `SB-750` dice: "Para hacer 100 litros de Santa Brisa, necesitas 20kg de `RM-AGAVE-MV`, 80L de `RM-LEMON-UI`, 133 botellas `PKG-BOTTLE-PILOT`, etc.".

### C. La Ejecución: La "ACCIÓN" de fabricar

*   #### `productionOrders`
    *   **Propósito**: Es una **orden de trabajo** para fabricar una cantidad específica de un producto. Es el evento que inicia el proceso de transformación.
    *   **Conexión**: Una `ProductionOrder` se basa en una `BillOfMaterial` para saber qué consumir.
    *   **Ejemplo**: "Producir 200 litros de `SB-750` usando la receta `bom_sb750`".

### D. El Stock Real: El "DÓNDE" y el "ADN" del inventario

Aquí es donde reside el estado actual y la historia de tu stock físico.

*   #### `lots`
    *   **Propósito**: Es el **certificado de nacimiento** de cada lote. Cada vez que recibes materia prima de un proveedor o terminas una producción, se genera un `Lot` con un ID único (ej. `230110-SB-750-01`).
    *   **Información Clave**: Almacena datos inmutables como la fecha de creación, la fecha de caducidad y, muy importante, su **estado de calidad (`qcStatus`)**: `hold` (en cuarentena), `release` (aprobado para uso/venta) o `reject` (rechazado).

*   #### `inventory`
    *   **Propósito**: Es la **foto en tiempo real de tu almacén**. Representa el estado actual del stock.
    *   **Estructura**: Cada `InventoryItem` es una línea que dice: "Del lote `X`, tengo `Y` cantidad en la ubicación `Z`".
    *   **Ejemplo**: `{ sku: 'SB-750', lotNumber: '230215-SB-750-01', qty: 150, locationId: 'FG/MAIN' }` significa que tienes 150 botellas de ese lote en el almacén de producto terminado.

*   #### `stockMoves`
    *   **Propósito**: Es el **libro de contabilidad (ledger)** de cada movimiento. Mientras `inventory` te dice el *estado final*, `stockMoves` te cuenta la *historia* de cómo se llegó ahí.
    *   **Ejemplo**: Cuando se completa una orden de producción, se generan dos tipos de `stockMoves`:
        1.  **Salida (`production_out`)**: Se resta la cantidad de materias primas (agave, limón...) del almacén de materias primas (`RM/MAIN`).
        2.  **Entrada (`production_in`)**: Se suma la cantidad de producto terminado al almacén correspondiente (`FG/MAIN`).

---

## 2. El Flujo Completo (Ejemplo Práctico)

1.  **Planificación**: Necesitas más Santa Brisa. Creas una **`ProductionOrder`** para fabricar 200 litros de `SB-750`.
2.  **Reserva**: El sistema consulta la **`BillOfMaterial`** (`bom_sb750`) y calcula que necesita 40kg de agave (`RM-AGAVE-MV`). Comprueba el **`inventory`** para ver si hay suficiente `RM-AGAVE-MV` con estado `release` en sus respectivos `lots`.
3.  **Consumo**: Al iniciar la producción, se crean **`StockMove`** de tipo `production_out` para descontar los 40kg de agave del inventario. El `inventory` se actualiza para reflejar la nueva cantidad.
4.  **Creación**: Una vez terminada la producción, se genera un nuevo **`Lot`** para el producto `SB-750`, por ejemplo, `240801-SB-750-01`. Este lote se crea con `qcStatus: 'hold'` (en cuarentena).
5.  **Entrada a Stock**: Se crea un **`StockMove`** de tipo `production_in` para añadir las botellas producidas al `inventory`, asociadas al nuevo lote y normalmente en una ubicación de cuarentena (`QC/AREA`).
6.  **Control de Calidad**: El equipo de calidad realiza los análisis sobre una muestra del lote `240801-SB-750-01`.
7.  **Liberación**: Si todo es correcto, el `qcStatus` del **`Lot`** se actualiza a `release`. A menudo, esto dispara otro **`StockMove`** para mover las botellas de la ubicación `QC/AREA` a `FG/MAIN` (almacén de producto terminado), dejándolas disponibles para la venta.
8.  **Venta**: Cuando se vende un pedido que incluye este lote, se crea un último **`StockMove`** de tipo `sale` para descontar las unidades vendidas del `inventory`.

Este ciclo asegura una trazabilidad completa, desde el origen de los ingredientes hasta el cliente final.