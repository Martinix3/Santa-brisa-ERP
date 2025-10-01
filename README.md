and# Santa Brisa ERP - Resumen del Proyecto

## 1. Resumen Ejecutivo

**Santa Brisa ERP** es un sistema de gestión interna (ERP/CRM) diseñado a medida para unificar todas las operaciones de la empresa en una única plataforma web moderna y reactiva. El objetivo es centralizar los datos de **Ventas, Marketing, Producción, Calidad y Logística** en una única fuente de verdad (Single Source of Truth, SSOT) para mejorar la eficiencia, la toma de decisiones y la trazabilidad.

**Pilares Clave:**
*   **Visión 360º:** Un modelo de datos "Party-Centric" que asegura un registro único por cada cliente, proveedor o contacto, eliminando duplicados.
*   **Operaciones Conectadas:** Flujos de trabajo que enlazan un pedido de venta con la planificación de producción, el consumo de materias primas, el control de calidad del lote y la logística de envío.
*   **Integraciones Asíncronas:** Conexión robusta con sistemas externos como **Holded** (facturación, contabilidad) y **Shopify** (e-commerce) a través de una cola de trabajos que garantiza la resiliencia del sistema.
*   **Inteligencia Artificial:** Incorporación de capacidades de IA con **Genkit** para automatizar tareas, enriquecer datos y generar análisis predictivos sobre ventas, producción y marketing.

**Tecnología:**
Construido sobre un stack moderno con **Next.js, React y Firebase (Firestore)**, el sistema está diseñado para ser rápido, escalable y accesible desde cualquier lugar.

---

## 2. Módulos Principales

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

## 3. Arquitectura y Decisiones Clave

*   **Modelo de Datos Unificado (SSOT)**: El núcleo del sistema es un `Single Source of Truth` definido en TypeScript (`/src/domain/ssot.ts`). Cualquier cambio en este modelo se propaga por toda la aplicación, garantizando la consistencia. El CRM se basa en un modelo **Party-Centric**, donde una entidad (persona/organización) es única y puede tener múltiples roles (cliente, proveedor).

*   **Integración con Holded (Asíncrona)**: Las interacciones con sistemas externos como Holded (facturas, gastos) no bloquean la interfaz. Se gestionan mediante una **cola de trabajos en segundo plano** (`/src/server/queue`), lo que asegura que el sistema siga funcionando incluso si los servicios externos están lentos o caídos.

*   **Límites Cliente/Servidor Estrictos**: Se utiliza la directiva `'use server'` de Next.js para delimitar claramente el código que se ejecuta en el servidor (acceso a BBDD, secretos) del que se ejecuta en el cliente. Esto mejora la seguridad y el rendimiento.

*   **Componentes Reactivos**: La interfaz se construye con React y componentes de **ShadCN UI**. Un `DataProvider` centralizado gestiona el estado de los datos y los distribuye a los componentes, que se actualizan automáticamente cuando la información cambia.