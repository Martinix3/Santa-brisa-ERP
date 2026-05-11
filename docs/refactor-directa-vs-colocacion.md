
# Informe de Refactorización: Venta Directa vs. Colocación

Este documento resume los cambios realizados para implementar la distinción clave entre el flujo de **Venta Directa** (B2B/B2C gestionado por Santa Brisa) y el de **Colocación** (sell-out a través de distribuidores).

---

## 1. Objetivo y Justificación

El objetivo principal era modelar y dar soporte a dos realidades comerciales distintas dentro del mismo CRM:

1.  **Venta Directa**: El ciclo completo (pedido, envío, factura, cobro) es gestionado por Santa Brisa. Requiere control de stock, logística y finanzas.
2.  **Colocación (Sell-Out)**: El equipo comercial de Santa Brisa no vende *al* distribuidor, sino que ayuda al distribuidor a vender *al* punto de venta final (HORECA, retail). El objetivo no es la logística, sino el **desarrollo comercial**: registrar visitas, colocar pedidos que servirá el distribuidor y ejecutar acciones de marketing en el punto de venta (POS).

Esta refactorización separa estas dos lógicas para simplificar la interfaz, clarificar los datos y dar al equipo comercial las herramientas adecuadas para cada contexto.

---

## 2. Cambios en el Modelo de Datos (SSOT)

El núcleo de la refactorización ha sido adaptar el `Single Source of Truth` (`domain/ssot.ts`) para reflejar esta dualidad.

### `Account.flow: CommercialFlow`

-   Se ha añadido un nuevo campo a la interfaz `Account`: `flow: 'DIRECT' | 'PLACEMENT'`.
-   Este campo es ahora la **única fuente de verdad** para determinar a qué flujo pertenece una cuenta.
-   `flow: 'DIRECT'` para clientes a los que Santa Brisa vende y factura directamente.
-   `flow: 'PLACEMENT'` para clientes finales cuyo producto es suministrado por un distribuidor.

### `Account.distributorPartyId`

-   Este campo, que ya existía, se vuelve **crucial** para las cuentas de `PLACEMENT`. Indica qué distribuidor es responsable de servir los pedidos a esa cuenta.

### `OrderSellOut` Unificada

-   La colección `ordersSellOut` ahora alberga tanto los pedidos de colocación como los reportes de ventas de distribuidores.
-   El campo `flow: 'PLACEMENT'` se añade a los nuevos pedidos de colocación para identificarlos claramente.

---

## 3. Funcionalidades Implementadas para "Colocación"

Se ha desarrollado un conjunto de herramientas específicas para que el equipo comercial gestione el flujo de colocación de forma ágil.

### a. `QuickLog`: El Centro de Mando del Comercial

-   **Botón Global**: Se ha añadido un botón flotante (`+`) en la interfaz principal, visible solo para roles comerciales y administradores.
-   **Diálogo Unificado**: Este botón abre `QuickLogDialog`, un modal que permite registrar una **interacción** (visita, llamada) y, opcionalmente, un **pedido de colocación** en una única y rápida acción.
-   **Inteligencia de Flujo**: El `QuickLog` está diseñado para crear pedidos de `PLACEMENT` por defecto, asignando el `distributorId` correcto.

### b. `AccountBarDialog`: Acciones Rápidas desde la Lista

-   **Menú Contextual**: En la página de Cuentas (`/accounts`), cada cuenta en la lista ahora tiene un menú de acciones rápidas (`...`).
-   **Diálogo con Pestañas**: Este menú abre `AccountBarDialog`, un modal que permite elegir entre:
    1.  **Registrar Visita/Interacción**: Un formulario rápido para dejar constancia de una llamada o visita.
    2.  **Colocar Pedido**: Un mini-formulario para añadir los productos que el cliente ha pedido y que el distribuidor servirá.

### c. Panel `AccountPOS`: Operativa en la Ficha de Cliente

-   **Componente Dedicado**: Dentro de la página de detalle de una cuenta (`/accounts/[accountId]`), se ha añadido el nuevo panel `AccountPOS`.
-   **Desarrollo Comercial**: Incluye la `AccountDevCard`, que muestra un historial de las últimas interacciones y permite programar nuevas visitas.
-   **Pedido Rápido**: También contiene la `QuickPlacementOrderCard`, que ofrece la misma funcionalidad de colocación de pedidos que los diálogos anteriores, pero directamente en el contexto de la cuenta que se está visitando.

### d. Server Actions de Soporte

-   `placeOrder`: Se ha creado y/o adaptado la `server action` para que, al recibir un pedido de colocación, lo registre correctamente en la colección `ordersSellOut` con el `flow` y el `distributorId` adecuados.
-   `createInteraction`: La acción para registrar interacciones se ha estandarizado para ser utilizada desde todos los nuevos flujos.

---

## 4. Próximos Pasos Sugeridos

Con esta base implementada, el siguiente paso lógico es completar el ciclo de marketing en el punto de venta:

1.  **Desarrollar el Catálogo POS**: Implementar la gestión del `posCatalog` para definir tácticas estandarizadas (PLV, eventos, etc.).
2.  **Completar Tareas de Marketing**: Desarrollar los diálogos (`PosCompleteDialog`) que permitan registrar los KPIs resultantes de una táctica (unidades entregadas, asistentes a un evento, etc.).
3.  **Medir el ROI**: Con los datos de costes y resultados, el `Marketing Dashboard` podrá empezar a calcular métricas de impacto real como el **Uplift de Ventas** y el **Retorno de la Inversión (ROI)** por cada acción.
