# Propuesta de Extensión para SSOT v2.1

## 1. Resumen

Esta propuesta describe las adiciones y mejoras sugeridas para el Single Source of Truth (SSOT) v2.1, con el objetivo de enriquecer las capacidades de los módulos de Ventas, Tareas y Proyectos. Los cambios se centran en añadir campos que mejoren la trazabilidad, la inteligencia de negocio y la automatización.

## 2. Cambios Propuestos

### 2.1. `TaskSchema` (Tareas)

Se propone añadir los siguientes campos a la interfaz `Task`:

-   `dependencies`: Un array de IDs de tareas que deben ser completadas antes de que esta tarea pueda ser iniciada.
-   `estimatedHours`: Un número que representa las horas estimadas para completar la tarea.
-   `loggedHours`: Un número que representa las horas reales dedicadas a la tarea.

**Justificación**:

-   `dependencies`: Permitirá crear flujos de trabajo más complejos y automatizar el cambio de estado de las tareas.
-   `estimatedHours` y `loggedHours`: Facilitará el seguimiento del rendimiento y la planificación de recursos.

### 2.2. `ProjectSchema` (Proyectos)

Se propone añadir los siguientes campos a la interfaz `Project`:

-   `health`: Un indicador del estado del proyecto (`'ON_TRACK'`, `'AT_RISK'`, `'OFF_TRACK'`).
-   `kpis`: Un objeto para almacenar los KPIs clave del proyecto.

**Justificación**:

-   `health`: Proporcionará una visión rápida del estado de los proyectos y permitirá a los gerentes identificar problemas a tiempo.
-   `kpis`: Permitirá un seguimiento más detallado del rendimiento del proyecto y facilitará la generación de informes.

### 2.3. `OrderSellOutSchema` (Ventas)

Se propone añadir los siguientes campos a la interfaz `OrderSellOut`:

-   `shippingMethod`: Una cadena que describe el método de envío.
-   `paymentMethod`: Una cadena que describe el método de pago.

**Justificación**:

-   `shippingMethod` y `paymentMethod`: Mejorará la trazabilidad de los pedidos y permitirá un análisis más detallado de las preferencias de los clientes.

## 3. Impacto

Estos cambios enriquecerán los modelos de datos existentes y proporcionarán una base más sólida para el desarrollo de nuevas funcionalidades. El impacto en el código existente debería ser mínimo, ya que los nuevos campos son aditivos.

## 4. Próximos Pasos

1.  Revisar y aprobar la propuesta.
2.  Actualizar los esquemas Zod en `src/domain/ssot-v2-plus-schemas.ts`.
3.  Modificar las interfaces correspondientes en `src/domain/ssot.ts`.
4.  Ajustar los componentes de la interfaz de usuario para reflejar los nuevos campos.
