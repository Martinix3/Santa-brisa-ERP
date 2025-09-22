
# Santa Brisa ERP - Resumen de Funcionalidades

Este documento proporciona un resumen de lo que hace cada página o módulo principal dentro de la aplicación Santa Brisa ERP.

---

## Módulos Principales

### 🏠 Personal
- **`/dashboard-personal`**: Tu centro de mando personal. Muestra un resumen de **tus tareas pendientes, atrasadas y futuras**. Es la primera página que ves al iniciar sesión para organizar tu día.
- **`/agenda`**: Gestiona tu tiempo y tus tareas.
    - `/calendar`: Una vista de calendario de todas las interacciones y eventos programados.
    - `/tasks`: Un tablero Kanban (Atrasadas, Programadas, Hechas) con todas las tareas del equipo.

### 📈 Ventas (Sales)
- **`/dashboard-ventas`**: El pulso del equipo comercial. Muestra **KPIs de ventas globales**, una carrera de objetivos entre comerciales y gráficos sobre la evolución de las ventas y el mix de productos.
- **`/accounts`**: Tu base de datos de clientes (CRM).
    - `/`: Lista y filtra todas las cuentas por estado (Activa, Potencial, etc.), comercial o ciudad.
    - `/[accountId]`: La ficha de un cliente específico, con sus KPIs, información de contacto y un historial de toda la actividad (pedidos, visitas, llamadas).
- **`/orders`**: Un listado de todos los pedidos de venta, tanto los de venta directa como los de colocación a través de distribuidores.

### 📢 Marketing
- **`/marketing/dashboard`**: Resumen de la actividad de marketing, con KPIs sobre eventos y campañas online.
- **`/marketing/events`**: Gestiona los **eventos de marketing presenciales**. Permite crear nuevos eventos y registrar sus resultados (coste, asistentes, leads).
- **`/marketing/online`**: Seguimiento de las **campañas de publicidad online** (Instagram, Google Ads, etc.). Permite registrar presupuesto, gasto y métricas clave como el ROAS.
- **`/marketing/influencers`**: Módulo para la gestión de colaboraciones con influencers.
    - `/dashboard`: Un panel visual para la gestión de las colaboraciones.
    - `/collabs`: Un listado detallado de todas las colaboraciones y su estado.

### 🏭 Producción (Production)
- **`/production/dashboard`**: Panel de control de la fábrica. Muestra **órdenes de producción activas**, lotes pendientes de control de calidad y alertas.
- **`/production/bom`**: El recetario. Aquí se definen y gestionan las **listas de materiales (Bill of Materials)** para cada producto, especificando ingredientes y costes.
- **`/production/execution`**: El corazón de la producción. Permite crear, planificar y ejecutar órdenes de producción, consumiendo materias primas y generando lotes de producto terminado.
- **`/production/traceability`**: Una herramienta de auditoría para **trazar un lote** desde el origen de sus materias primas hasta su venta final, mostrando cada paso en una línea de tiempo.

### ✅ Calidad (Quality)
- **`/quality/dashboard`**: Panel de control de calidad. Ofrece una vista rápida de los **lotes en cuarentena**, liberados y rechazados.
- **`/quality/release`**: La mesa de laboratorio. Aquí es donde el equipo de calidad introduce los resultados de los análisis para **decidir si un lote se libera** para la venta o se rechaza.

### 📦 Almacén (Warehouse)
- **`/warehouse/dashboard`**: Resumen del estado del almacén. Muestra KPIs como el **valor total del inventario**, unidades en stock y envíos pendientes.
- **`/warehouse/inventory`**: Vista detallada del **stock actual**, agrupado por tipo de producto (terminado, materia prima, packaging). Muestra cantidades, lotes y fechas de caducidad.
- **`/warehouse/logistics`**: Gestiona los **envíos a clientes**. Permite validar pedidos, asignar lotes, generar albaranes y etiquetas, y marcar los pedidos como enviados.

### ⚙️ Administración (Admin)
- **`/users`**: Página para la **gestión de usuarios** del sistema. Permite añadir, editar o eliminar usuarios y asignarles roles.
- **`/admin/kpi-settings`**: Permite a los administradores configurar **valores base para los KPIs** de los comerciales (ej. añadir un histórico de ventas a un nuevo comercial).
- **`admin/sku-management`**: Un maestro de productos para ver todos los **SKUs, sus categorías y los lotes asociados**.

### 🛠️ Desarrollo (Dev)
- **`/tools/ssot-accounts-editor`**: Una herramienta para editar directamente los datos de las cuentas, útil para desarrollo y corrección rápida de datos.
- **`/dev/...`**: Varias páginas internas para desarrolladores, como un visor de datos, un panel de integraciones y tests de integridad del sistema.

---

## 🏛️ Arquitectura y Decisiones Clave

Esta sección documenta los principios de arquitectura y las lecciones aprendidas durante el desarrollo.

### 1. Modelo de Datos Party-Centric (SSOT)

El núcleo del CRM se basa en un modelo **Party-Centric**.

*   **Party**: Representa una entidad única (persona u organización), identificada por su CIF/NIF. Contiene datos maestros como el nombre legal, direcciones y contactos. Una `Party` solo existe una vez.
*   **PartyRole**: Define la relación de negocio con una `Party` (ej. `CUSTOMER`, `SUPPLIER`, `INFLUENCER`). Una `Party` puede tener múltiples roles.

Este modelo evita la duplicación de contactos y proporciona una visión 360º real de cada entidad.

### 2. Integración con Holded (Asíncrona y Robusta)

La integración con sistemas externos como Holded se gestiona a través de una **cola de trabajos asíncrona** para garantizar la resiliencia y no bloquear la UI.

*   **Cola de Trabajos**: Se utiliza una colección `jobs` en Firestore. Cuando una acción necesita una interacción con Holded (ej. crear una factura), se encola un nuevo documento en `jobs`.
*   **Workers**: Funciones de servidor (`/src/server/workers/*.ts`) procesan estos trabajos en segundo plano. Un despachador (simulado por ahora) se encarga de ejecutar los trabajos pendientes.
*   **Flujo de Facturación**:
    1.  UI: Un pedido en el CRM se marca como `Confirmado`.
    2.  Backend: Se encola un trabajo `CREATE_HOLDED_INVOICE` con el `orderId`.
    3.  Worker: El worker `holded.createInvoice.ts` se ejecuta, crea el contacto en Holded si no existe (usando `external.holdedContactId` para la idempotencia), genera la factura y actualiza el pedido en el CRM con el ID de la factura de Holded.
*   **Flujo de Gastos**:
    1.  Un cron job (simulado) encola un trabajo `SYNC_HOLDED_PURCHASES`.
    2.  El worker `holded.syncPurchases.ts` descarga las facturas de compra, crea o actualiza las `Parties` de proveedores y guarda los datos en la colección `expenses` del CRM.

### 3. Lecciones Aprendidas de Desarrollo

*   **Compatibilidad de Tipos entre Genkit y Zod**: Se detectó que Genkit utiliza una versión "brandeada" de Zod que causa errores de tipo en tiempo de compilación.
    *   **Solución**: En lugar de intentar unificar las dependencias de Zod, la solución más limpia es hacer un `cast` de nuestros esquemas de Zod a `any` en el punto exacto donde se pasan a las funciones de Genkit (`defineTool`, `definePrompt`). Esto satisface a TypeScript sin afectar la validación en tiempo de ejecución.
    *   **Ejemplo**: `inputSchema: miSchemaZod as any`
*   **Uso de `server-only` y `use client`**: Es vital ser estricto con los límites cliente/servidor. Las funciones que acceden a secretos (`process.env`) o a la base de datos con credenciales de admin deben estar en archivos con la directiva `'use server'` o en la carpeta `src/server`. La importación accidental de código de servidor en un componente de cliente es una fuente común de errores.
*   **Modelo de Datos**: Cualquier cambio en el SSOT (`src/domain/ssot.ts`) tiene un efecto en cascada. Es crucial actualizar los datos de prueba (`mock-data.ts`) y revisar los componentes que consumen esos datos inmediatamente después de un cambio para evitar errores de tipo en tiempo de compilación.
