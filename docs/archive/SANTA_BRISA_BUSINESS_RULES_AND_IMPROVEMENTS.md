# Santa Brisa ERP - Reglas de Negocio y Mejoras Recomendadas

> Análisis completo del proyecto basado en auditorías técnicas y descripción del modelo de negocio

**Fecha:** 18 de Enero de 2025  
**Estado del proyecto:** Funcional con áreas de mejora identificadas

---

## ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Reglas de Negocio Formalizadas](#reglas-de-negocio-formalizadas)
3. [Áreas de Mejora Críticas](#áreas-de-mejora-críticas)
4. [Mejoras por Módulo](#mejoras-por-módulo)
5. [Roadmap de Implementación](#roadmap-de-implementación)

---

## RESUMEN EJECUTIVO

### Estado Actual
✅ **Fortalezas:**
- Sistema SSOT centralizado con tipos bien definidos
- Módulos core implementados (inventario, producción, ventas, calidad)
- Integraciones con Shopify, Holded, Sendcloud existentes
- Sistema de trazabilidad con TraceEvents
- IA Gemini con analyzers por dominio

⚠️ **Debilidades Críticas:**
- Falta de validación de QC Status antes de consumir lotes (riesgo operativo)
- Server actions stubbed en pedidos y logística (flujo incompleto)
- Hooks Gemini no implementados (automatizaciones ausentes)
- TraceEvents con tipos inconsistentes
- Santa Brain con lógica acoplada (+600 líneas)
- Conciliaciones R15 manuales/incompletas
- Portal de distribuidores sin acciones centralizadas

### Impacto en Negocio
- **Alto:** Consumo de lotes sin aprobar puede causar problemas de compliance y calidad
- **Alto:** Pedidos/envíos sin flujo end-to-end genera errores y retrabajos
- **Medio:** Falta de automatizaciones Gemini reduce eficiencia operativa
- **Medio:** Conciliaciones manuales aumentan carga administrativa

---

## REGLAS DE NEGOCIO FORMALIZADAS

### 1. AGUAS ABAJO - RECEPCIÓN Y CALIDAD

#### R1.1 - Recepción de Materiales
```typescript
interface ReceiptRule {
  // Entrada de materiales
  when: "Se recibe material del proveedor"
  then: {
    - Generar lote interno único (formato: SKU-YYMMDD-###)
    - Asignar categoría según tipo de material:
      * final_good → productos terminados para venta
      * merch → merchandising
      * raw → materias primas para producción
      * intermediate → productos intermedios
      * pack → packaging e insumos
    - Registrar:
      * Lote externo del proveedor (si aplica)
      * Albarán de entrega
      * Fechas (recepción, caducidad)
      * Costes unitarios
      * Responsable de recepción
      * Incidencias en recepción
      * Documentación adjunta
    - Crear TraceEvent tipo ARRIVED con fase RECEIPT
    - Establecer qcStatus = PENDING (hold automático)
  }
  validation: {
    - supplierPartyId debe existir en contacts
    - Categoría debe ser válida según ItemCategory
    - Cantidad debe ser > 0
    - Fechas: receivedAt <= expDate (si aplica)
  }
}
```

#### R1.2 - Generación de SKU Automático
```typescript
interface SkuGenerationRule {
  when: "Nuevo producto sin SKU existente"
  pattern: {
    final_good: "FG-[CATEGORY]-[SEQUENTIAL]"  // FG-SPIRITS-001
    raw: "RM-[SUBCATEGORY]-[SEQUENTIAL]"      // RM-HERBS-042
    pack: "PK-[TYPE]-[SEQUENTIAL]"            // PK-BOTTLE-750ML-001
    intermediate: "IP-[PRODUCT]-[SEQUENTIAL]" // IP-DISTILLATE-001
    merch: "MR-[ITEM]-[SEQUENTIAL]"           // MR-TSHIRT-L-001
  }
  rules: {
    - Verificar unicidad en collection items
    - Crear codeAlias para referencias alternativas
    - Registrar en TraceEvent con kind=ALERT, data.skuGenerated
  }
}
```

#### R1.3 - Control de Calidad Inicial (QC Hold)
```typescript
interface QcHoldRule {
  when: "Material recibido"
  then: {
    - qcStatus = PENDING
    - Bloquear consumo hasta liberación
    - Generar alerta en módulo Quality
    - Asignar a inspector QC según qcPlan del SKU
    - SLA: 24-48h según categoría
  }
  
  release_criteria: {
    document_review: {
      - COA del proveedor (Certificate of Analysis)
      - Especificaciones técnicas
      - Certificados (orgánico, kosher, etc.)
    }
    visual_inspection: {
      - Inspección de packaging
      - Verificación de etiquetado
      - Estado físico del material
    }
    analytical: {
      - Tests de parámetros críticos (según qcPlan)
      - Verificación organoléptica
      - Pruebas microbiológicas (si aplica)
    }
  }
  
  outcomes: {
    PASSED: {
      - qcStatus = PASSED
      - Material disponible para uso
      - TraceEvent: QC_TEST con result=PASS
      - Email: notificar a warehouse y producción
    }
    CONDITIONAL: {
      - qcStatus = CONDITIONAL
      - Disponible con restricciones
      - Documentar condiciones de uso
      - Notificar restricciones
    }
    FAILED: {
      - qcStatus = FAILED
      - Bloqueo permanente
      - Iniciar proceso de devolución/claim
      - Crear task para gestión de incidencia
      - TraceEvent: QC_TEST con result=FAIL
    }
    HOLD: {
      - qcStatus = HOLD
      - Investigación adicional requerida
      - Crear task para seguimiento
      - Establecer nueva fecha de revisión
    }
  }
}
```

#### R1.4 - Consumo de Lotes (CRÍTICO)
```typescript
interface LotConsumptionRule {
  when: "Producción o venta requiere consumir lote"
  
  CRITICAL_VALIDATION: {
    - MUST verificar qcStatus antes de consumir
    - ONLY permitir consumo si qcStatus in [PASSED, CONDITIONAL, WAIVED]
    - NEVER permitir consumo de PENDING, IN_PROGRESS, HOLD, FAILED
  }
  
  blocking_rule: {
    if (lot.qcStatus === 'PENDING') throw new Error('Lote pendiente de QC')
    if (lot.qcStatus === 'IN_PROGRESS') throw new Error('Lote en revisión QC')
    if (lot.qcStatus === 'HOLD') throw new Error('Lote retenido por Calidad')
    if (lot.qcStatus === 'FAILED') throw new Error('Lote rechazado - no disponible')
  }
  
  fefo_selection: {
    - Ordenar lotes disponibles por expDate ASC
    - Filtrar por qcStatus = PASSED
    - Priorizar lotes más antiguos (First Expired, First Out)
    - Considerar locationId si aplica
    - Validar qty disponible (onHand - reservedQty)
  }
  
  traceability: {
    - Registrar StockMove con reason='production_out' o 'sale'
    - Crear TraceEvent tipo CONSUME
    - Vincular a productionOrderId o orderId
    - Actualizar onHand y reservations
  }
}
```

### 2. AGUAS ABAJO - PRODUCCIÓN

#### R2.1 - Programación de Producción
```typescript
interface ProductionPlanningRule {
  when: "Crear orden de producción"
  then: {
    - Verificar disponibilidad de materiales (BOM)
    - Calcular stock necesario vs disponible
    - Identificar shortages (faltantes)
    - Reservar materiales (qty, lotNumber, locationId)
    - Generar alertas si:
      * Materiales críticos < threshold
      * Lotes próximos a caducar
      * Capacidad insuficiente
    - Estimar costes basado en BOM + overhead
    - Asignar responsable
    - Establecer scheduledFor
  }
  
  validations: {
    - bomId debe existir y estar activo
    - targetQuantity > 0
    - Todos los items del BOM deben tener stock suficiente
    - Responsable debe tener permisos de producción
  }
  
  reservations: {
    - Crear registros en reservations collection
    - Actualizar onHand.reservedQty
    - TTL de reserva: 7 días (auto-release si no se ejecuta)
  }
}
```

#### R2.2 - Ejecución de Producción
```typescript
interface ProductionExecutionRule {
  phases: {
    START: {
      - status = IN_PROGRESS
      - startedAt = now()
      - Validar todos los materiales reservados disponibles
      - TraceEvent: PRODUCTION_IN
    }
    
    CONSUME: {
      - Registrar consumos reales vs teóricos
      - Permitir ajustes de cantidad
      - Documentar mermas y desviaciones
      - TraceEvent: CONSUME por cada material
      - Actualizar onHand
    }
    
    OUTPUT: {
      - Generar nuevo lote para producto final
      - lotNumber = auto-generado
      - qcStatus = PENDING (requiere QC post-producción)
      - quantity = goodUnits (unidades buenas)
      - TraceEvent: OUTPUT
      - Crear onHand para nuevo lote
    }
    
    COMPLETE: {
      - status = DONE
      - completedAt = now()
      - Calcular KPIs:
        * efficiency = (actualOutput / targetOutput) * 100
        * yieldLoss = (theoretical - actual) / theoretical
        * costPerUnit = totalCost / goodUnits
        * duration = completedAt - startedAt
      - Liberar reservaciones no usadas
      - Cerrar orden
    }
  }
  
  tracking: {
    - Registrar incidencias (equipment, quality, material, safety)
    - Documentar desviaciones de protocolos
    - Verificar cumplimiento de checks
    - Fotografías de proceso (opcional)
    - Firmas digitales de responsables
  }
  
  genealogy: {
    - Crear LotGenealogyEdge vinculando:
      * parentLotNumber (materias primas consumidas)
      * childLotNumber (producto final generado)
    - TraceEvent: GENEALOGY_PARENT y GENEALOGY_CHILD
  }
}
```

#### R2.3 - Trazabilidad Completa
```typescript
interface TraceabilityRule {
  for_each_lot: {
    - Todos los eventos deben registrarse en traceEvents
    - Tipos requeridos: ARRIVED, QC_TEST, CONSUME, OUTPUT, SHIPMENT
    - Cada evento debe incluir:
      * at: ISODateString
      * phase: TraceEventPhase
      * kind: TraceEventKind
      * title: descripción breve
      * details: información detallada
      * links: {lotNumber, orderId, productionOrderId, etc}
      * data: payload específico
  }
  
  genealogy_tracking: {
    - Rastrear origen de materias primas
    - Identificar todos los productos finales generados
    - Vincular a órdenes de producción
    - Vincular a ventas/envíos
    - Permitir backward tracking (de producto final → materia prima)
    - Permitir forward tracking (de materia prima → productos finales)
  }
  
  quality_module_view: {
    - Mostrar cronología completa del lote
    - Listar todos los tests realizados
    - Mostrar decisiones de QC
    - Indicar consumos y salidas
    - Vincular documentación (COAs, fotos, certificados)
  }
}
```

---

### 3. AGUAS ARRIBA - MODELO COMERCIAL

#### R3.1 - Estructura de Canales
```typescript
interface CommercialChannelRule {
  core_business: {
    model: "B2B2C (Business to Distributor to Customer)"
    flow: "PLACEMENT"
    description: "Vendemos a distribuidores → Distribuidores venden a cuentas finales"
    
    actors: {
      santa_brisa: {
        role: "Brand owner & manufacturer"
        responsibilities: [
          "Producción de productos",
          "Gestión de calidad",
          "Marketing y activaciones",
          "Soporte a distribuidores",
          "POS tactics y eventos",
          "Generación de demanda"
        ]
      }
      
      distributor: {
        role: "Logistics & local sales"
        responsibilities: [
          "Compra de stock a Santa Brisa",
          "Almacenamiento y distribución",
          "Logística y entregas",
          "Facturación a cuentas finales",
          "Cobros a cuentas",
          "Reporting de sell-out"
        ]
      }
      
      account: {
        role: "End customer (HORECA/RETAIL)"
        types: ["Bar", "Restaurante", "Hotel", "Tienda especializada"]
        relationship: "Atendida por comercial de Santa Brisa + distribuidor asignado"
      }
    }
  }
  
  direct_channels: {
    online: {
      flow: "DIRECT"
      source: "Shopify"
      target: "Consumidor final B2C"
      logistics: "Santa Brisa gestiona envío"
      billing: "Santa Brisa factura directamente"
    }
    
    private_sales: {
      flow: "DIRECT"
      target: "Clientes corporativos, eventos especiales"
      logistics: "Santa Brisa gestiona"
      billing: "Santa Brisa factura"
    }
    
    direct_horeca: {
      flow: "DIRECT"
      description: "Ventas directas a cuentas sin intermediario"
      when: "Zonas sin distribuidor o cuentas estratégicas"
      logistics: "Santa Brisa gestiona"
    }
  }
}
```

#### R3.2 - Gestión de Cuentas
```typescript
interface AccountManagementRule {
  account_structure: {
    required_fields: {
      partyId: "FK a contacts (customer con rol CUSTOMER)"
      name: "Nombre comercial"
      segment: "HORECA | RETAIL | ONLINE | PRIVADA | DISTRIBUIDOR"
      stage: "POTENCIAL | ACTIVA | SEGUIMIENTO | FALLIDA | CERRADA | BAJA"
      ownerId: "Comercial responsable (FK a users)"
      flow: "DIRECT | PLACEMENT"
    }
    
    placement_accounts: {
      distributorPartyId: "REQUIRED - FK a distribuidor asignado"
      rules: {
        - Pedidos deben ir a través del distribuidor
        - Facturación la realiza el distribuidor
        - Santa Brisa hace seguimiento y activaciones
        - Comercial mantiene relación con la cuenta
      }
    }
    
    direct_accounts: {
      distributorPartyId: "NULL"
      rules: {
        - Pedidos directos a Santa Brisa
        - Facturación directa
        - Logística propia
      }
    }
  }
  
  account_lifecycle: {
    POTENCIAL: {
      actions: ["Prospección", "Primera visita", "Presentación"]
      kpis: {alert_if_no_action: 30} // días
    }
    
    ACTIVA: {
      definition: "Ha realizado al menos un pedido"
      actions: ["Visitas regulares", "Activaciones", "POS"]
      kpis: {
        alert_if_no_order: 45,    // días sin pedido
        alert_if_no_visit: 30,    // días sin visita
        min_visits_month: 2
      }
    }
    
    SEGUIMIENTO: {
      definition: "Cliente inactivo pero con potencial"
      actions: ["Reactivación", "Ofertas especiales"]
      kpis: {alert_if_no_contact: 15}
    }
    
    FALLIDA: {
      definition: "Descartada tras evaluación"
      actions: ["Archivar", "Documentar razones"]
    }
    
    CERRADA: {
      definition: "Relación comercial finalizada"
      actions: ["Cierre ordenado", "Cobros pendientes"]
    }
    
    BAJA: {
      definition: "Cliente de baja definitiva"
      reason: "Cierre del negocio, cambio de proveedor, etc"
    }
  }
  
  assignment_rules: {
    - Cada cuenta DEBE tener ownerId (comercial responsable)
    - Cuentas PLACEMENT DEBEN tener distributorPartyId
    - Comercial puede actuar temporalmente en cuentas de otro owner
    - Cambios de owner deben generar TraceEvent
    - Cambios de distribuidor requieren aprobación
  }
}
```

#### R3.3 - QuickLog y Santa Brain
```typescript
interface QuickLogRule {
  purpose: "Registro rápido de actividad comercial desde campo"
  
  input_methods: {
    voice: "Transcripción automática de nota de voz"
    text: "Entrada manual de texto"
    structured: "Formulario con campos predefinidos"
  }
  
  processing_flow: {
    1: "Captura de input (voz/texto)"
    2: "Clasificación con Gemini NLP"
    3: "Fuzzy matching de cuenta"
    4: "Extracción de entidades (productos, cantidades, fechas)"
    5: "Generación de registros automáticos"
    6: "Creación de tareas de seguimiento"
  }
  
  outputs: {
    interaction: {
      when: "Visita, llamada, email"
      generate: {
        - Registro en interactions
        - TraceEvent tipo SALE/fase SALE
        - Vinculación a accountId
        - Geo-localización si disponible
        - Fotos/documentos adjuntos
      }
    }
    
    order: {
      when: "Mención de pedido o venta"
      generate: {
        - OrderSellOut en estado open/confirmed
        - Líneas de pedido (items, qty, prices)
        - Asignación a distribuidor si PLACEMENT
        - Task de seguimiento para preparación
        - Alerta a logistics si directo
      }
    }
    
    pos_tactic: {
      when: "Instalación de material POS"
      generate: {
        - Registro en posTactics
        - Consumo de inventory de merch
        - Vinculación a campaña activa
        - Fotografías obligatorias
        - Tracking de ROI
      }
    }
    
    event: {
      when: "Activación, degustación, formación"
      generate: {
        - Registro en marketingEvents
        - Consumo de samples/botellas
        - Tracking de reach y conversión
        - Vinculación a cuentas participantes
      }
    }
    
    task: {
      auto_generation: {
        next_visit: "Si outcome = NEXT_VISIT"
        follow_up: "Si menciona seguimiento"
        payment: "Si menciona cobro pendiente"
        order_prep: "Si genera pedido"
      }
    }
  }
  
  intelligence: {
    gemini_nba: {
      - Analizar contexto de la interacción
      - Sugerir Next Best Action
      - Detectar riesgo de churn
      - Identificar oportunidades de upsell
      - Generar alertas proactivas
    }
  }
}
```

#### R3.4 - Portal de Distribuidores
```typescript
interface DistributorPortalRule {
  access: {
    who: "Usuarios con role=distribuidor"
    scope: "Solo ven datos de su distributorPartyId"
  }
  
  features: {
    orders: {
      view: "Pedidos generados por comerciales de Santa Brisa para sus cuentas"
      actions: {
        - Marcar como enviado (shipped)
        - Marcar como facturado (invoiced)
        - Subir albarán/factura
        - Registrar número de seguimiento
        - Solicitar información adicional
        - Reportar incidencias
      }
      workflow: {
        1: "Comercial genera pedido → status=confirmed"
        2: "Aparece en portal distribuidor"
        3: "Distribuidor prepara y envía"
        4: "Distribuidor marca shipped y sube albarán"
        5: "Distribuidor factura a cuenta final"
        6: "Distribuidor marca invoiced"
        7: "Distribuidor gestiona cobro"
      }
    }
    
    sell_out: {
      description: "Ventas del distribuidor a cuentas finales"
      upload: "CSV con campos: fecha, cuenta, sku, qty, precio, factura"
      purpose: "Visibilidad completa para Santa Brisa del sell-through"
      frequency: "Semanal o mensual según acuerdo"
      validation: {
        - accountId debe existir y estar asignado a este distribuidor
        - SKUs deben existir en items
        - Fechas coherentes
        - Cantidades > 0
      }
    }
    
    consignment: {
      description: "Stock en consigna gestionado por distribuidor"
      tracking: {
        - Stock actual en poder del distribuidor
        - Movimientos (recibido, vendido, devuelto)
        - Facturación solo de unidades vendidas
        - Devoluciones de stock no vendido
      }
    }
    
    payments: {
      view: "Estado de pagos a Santa Brisa"
      info: {
        - Facturas emitidas por Santa Brisa
        - Pagos realizados
        - Saldo pendiente
        - Vencimientos
        - Histórico
      }
    }
    
    marketing: {
      materials: "Acceso a catálogos, fichas técnicas, imágenes"
      campaigns: "Información de campañas activas"
      pos_materials: "Solicitud de material POS"
    }
    
    orders_creation: {
      allow: "Distribuidor puede generar pedidos a Santa Brisa"
      workflow: {
        1: "Distribuidor crea pedido en portal"
        2: "Pedido aparece en sistema Santa Brisa con source=DISTRIBUTOR"
        3: "Aprobación por ops/comercial
        4: "Pasa a logistics para preparación"
      }
    }
  }
  
  notifications: {
    - Nuevo pedido asignado
    - Cambios en pedidos
    - Recordatorio de sell-out pendiente
    - Alertas de stock bajo
    - Nuevas campañas disponibles
  }
}
```

### 4. AGUAS ARRIBA - PEDIDOS Y LOGÍSTICA

#### R4.1 - Flujo de Pedidos Completo
```typescript
interface OrderFlowRule {
  sources: {
    manual: "Entrada manual por comercial/ops"
    quicklog: "Generado desde QuickLog/Santa Brain"
    shopify: "Sincronizado desde tienda online"
    distributor_portal: "Creado por distribuidor"
    b2b_portal: "Portal B2B (futuro)"
  }
  
  lifecycle: {
    DRAFT: {
      description: "Borrador, en construcción"
      editable: true
      deletable: true
    }
    
    OPEN: {
      description: "Pedido creado, pendiente de confirmación"
      validations: [
        "accountId o partyId válido",
        "Líneas con itemId, qty, priceUnit",
        "Total calculado correctamente",
        "Flow definido (DIRECT/PLACEMENT)"
      ]
      actions: ["Editar", "Confirmar", "Cancelar"]
    }
    
    CONFIRMED: {
      description: "Pedido confirmado, pendiente de preparación"
      trigger: {
        - Validar disponibilidad de stock
        - Asignar lotes según FEFO
        - Reservar stock
        - Generar orden de picking
        - Crear task de order_prep para logistics
      }
      blocking: {
        - Si stock insuficiente → alerta
        - Si lotes no aprobados QC → bloquear
        - Si cuenta bloqueada → requiere aprobación
      }
    }
    
    PICKING: {
      description: "En preparación en almacén"
      actions: {
        - Imprimir orden de picking
        - Validar lotes asignados
        - Registrar qty preparada
        - Documentar incidencias
        - Inspección visual
      }
    }
    
    READY_TO_SHIP: {
      description: "Preparado, validado, listo para enviar"
      requirements: {
        - Orden de picking completada y aprobada
        - Albarán generado
        - Método de envío seleccionado
        - Dirección de envío confirmada
      }
      next_steps: {
        sendcloud: "Generar etiqueta y solicitar recogida automática"
        other_carrier: "Generar etiqueta y solicitar recogida por email"
        pickup: "Notificar cliente para recogida"
      }
    }
    
    SHIPPED: {
      description: "Enviado, en tránsito"
      data: {
        - Número de tracking
        - Carrier
        - Fecha de envío
        - ETA (estimated time of arrival)
      }
      tracking: {
        - Webhooks de carrier para updates
        - Notificaciones automáticas a cliente
        - Alertas de retrasos o incidencias
      }
    }
    
    DELIVERED: {
      description: "Entregado al cliente"
      trigger: {
        - Actualizar de webhooks carrier
        - Confirmar entrega
        - Solicitar feedback (opcional)
      }
    }
    
    INVOICED: {
      description: "Facturado (puede ser antes o después de envío)"
      integration: {
        - Sincronizar con Holded
        - Generar factura
        - Enviar a cliente
        - Registrar en financeLinks
      }
    }
    
    PAID: {
      description: "Pagado completamente"
      tracking: {
        - Registrar pagos en paymentLinks
        - Reconciliar con facturas
        - Actualizar DSO (Days Sales Outstanding)
      }
    }
    
    CANCELLED: {
      description: "Cancelado"
      rules: {
        - Antes de SHIPPED: cancelación sin coste
        - Después de SHIPPED: requiere devolución
        - Liberar reservaciones de stock
        - Notificar a todas las partes
        - Documentar razón de cancelación
      }
    }
    
    LOST: {
      description: "Pedido perdido (no se materializó)"
      analytics: "Usar para análisis de tasa de conversión"
    }
  }
  
  assignment_logic: {
    placement_order: {
      - Generar pedido con distributorPartyId
      - El distribuidor ve el pedido en su portal
      - Distribuidor gestiona logística y facturación
      - Santa Brisa descuenta stock
      - Santa Brisa factura al distribuidor (no a cuenta final)
    }
    
    direct_order: {
      - distributorPartyId = NULL
      - Santa Brisa gestiona logística completa
      - Santa Brisa factura a cuenta directamente
      - Descuento de stock igual
    }
  }
}
```

#### R4.2 - Logística y Preparación
```typescript
interface LogisticsFlowRule {
  picking_order: {
    when: "Pedido pasa a status=CONFIRMED"
    generate: {
      - PDF con orden de picking
      - Información del pedido (número, cliente, dirección)
      - Líneas con lotes recomendados (FEFO)
      - Espacio para firmas y validación
    }
  }
  
  preparation: {
    steps: [
      "1. Verificar orden de picking",
      "2. Localizar lotes asignados",
      "3. Verificar qcStatus = PASSED",
      "4. Verificar fechas de caducidad",
      "5. Inspección visual del producto",
      "6. Registrar qty real preparada",
      "7. Documentar incidencias si existen",
      "8. Empaquetar según tipo de envío",
      "9. Marcar orden como completada",
      "10. Validador firma y aprueba"
    ]
    
    validations: {
      - Todos los items deben estar preparados
      - Cantidades deben coincidir o justificar diferencias
      - Inspección visual OK
      - Packaging adecuado al método de envío
      - Documentación completa
    }
  }
  
  delivery_note: {
    generate: "Al validar orden de picking"
    content: {
      - Datos fiscales Santa Brisa
      - Datos cliente (billing y shipping)
      - Líneas del pedido con lotes usados
      - Totales
      - Firma mozo y validador
      - QR code para tracking
    }
  }
  
  shipping_label: {
    sendcloud: {
      - API para generar etiqueta
      - Selección automática de carrier según:
        * Peso y dimensiones
        * Destino
        * Tiempo de entrega requerido
        * Coste
      - Solicitud automática de recogida
      - Webhook para tracking updates
    }
    
    other_carriers: {
      - Template de etiqueta PDF
      - Email automático solicitando recogida
      - Tracking manual
    }
  }
  
  traceability: {
    - TraceEvent tipo SHIPMENT al enviar
    - Registrar carrier, tracking code
    - Vincular a lotNumbers usados
    - Actualizar onHand.qty
    - Crear StockMove con reason='ship'
  }
}
```

### 5. MARKETING Y POS TACTICS

#### R5.1 - Gestión de Campañas
```typescript
interface MarketingCampaignRule {
  types: {
    pos_tactics: {
      description: "Material POS en punto de venta"
      tracking: {
        - Coste de material
        - Fecha instalación
        - Cuenta asociada
        - Fotografías antes/después
        - Uplift de ventas (units, %)
        - ROI calculado
      }
    }
    
    events: {
      description: "Eventos, degustaciones, activaciones"
      tracking: {
        - Presupuesto y gasto real
        - Alcance estimado y real
        - Participantes
        - Samples distribuidos
        - Leads generados
        - Pedidos atribuidos
      }
    }
    
    online_campaigns: {
      description: "Campañas digitales (Meta, Google, TikTok)"
      tracking: {
        - Budget y spend por canal
        - Impressions, clicks, conversions
        - CPM, CPC, CPA, ROAS
        - Revenue atribuido
        - ROI por canal
      }
    }
    
    collaborations: {
      description: "Colaboraciones con influencers/creators"
      tracking: {
        - Tier del creator (nano, micro, mid, macro)
        - Compensación (product, fee, commission)
        - Deliverables (posts, stories, reels)
        - Alcance y engagement
        - Conversiones rastreables
        - CPE (Cost Per Engagement)
      }
    }
  }
  
  lifecycle: {
    PLANNED: "En planificación"
    APPROVED: "Aprobado presupuesto"
    ACTIVE: "En ejecución"
    COMPLETED: "Finalizado"
    ANALYZING: "Analizando resultados"
    CLOSED: "Cerrado con resultados documentados"
  }
  
  roi_calculation: {
    revenue_attributed: "Ventas directamente atribuibles"
    cost: "Inversión total (material + labor + fees)"
    roi: "(revenue - cost) / cost * 100"
    payback_period: "Tiempo para recuperar inversión"
  }
}
```

#### R5.2 - Control de Gastos
```typescript
interface ExpenseTrackingRule {
  categories: {
    marketing: [
      "POS materials",
      "Events & activations", 
      "Digital advertising",
      "Influencer collaborations",
      "Content creation",
      "Samples & giveaways"
    ]
    operations: [
      "Logistics & shipping",
      "Packaging materials",
      "Storage & warehousing",
      "Equipment & maintenance"
    ]
    production: [
      "Raw materials",
      "Labor",
      "Utilities",
      "Quality control"
    ]
  }
  
  approval_workflow: {
    - Solicitud con justificación
    - Aprobación según monto y departamento
    - Registro de gasto real
    - Vinculación a campañas/proyectos
    - Conciliación con facturas y pagos
  }
  
  reporting: {
    - Gasto por departamento
    - Gasto por campaña
    - Budget vs actual
    - ROI por inversión de marketing
    - Trending y proyecciones
  }
}
```

---

## 3. ÁREAS DE MEJORA CRÍTICAS

### PRIORIDAD ALTA (Implementar en 0-4 semanas)

#### 1. Validación de QC Status en Consumo de Lotes
**Problema:** Actualmente se pueden consumir lotes sin aprobar, generando riesgo de calidad y compliance.

**Solución:**
```typescript
// En src/lib/inventory.ts o donde se gestione consumo
export async function validateLotConsumption(lotNumber: string): Promise<void> {
  const lot = await getLot(lotNumber);
  
  if (!lot) {
    throw new Error(`Lote ${lotNumber} no encontrado`);
  }
  
  const approvedStatuses: QcStatus[] = ['PASSED', 'CONDITIONAL', 'WAIVED'];
  
  if (!approvedStatuses.includes(lot.qcStatus)) {
    throw new Error(
      `Lote ${lotNumber} no puede ser consumido. ` +
      `Estado actual: ${lot.qcStatus}. ` +
      `Solo se permiten estados: ${approvedStatuses.join(', ')}`
    );
  }
  
  if (lot.expDate && new Date(lot.expDate) < new Date()) {
    throw new Error(`Lote ${lotNumber} ha caducado`);
  }
}
```

**Implementar en:**
- `completeProductionOrder` (producción)
- `assignLotsToOrder` (ventas)
- `createShipment` (logística)

#### 2. Factory Centralizado de TraceEvents
**Problema:** TraceEvents se crean con tipos inconsistentes en diferentes partes del código.

**Solución:**
```typescript
// src/lib/trace/TraceEventFactory.ts
import { TraceEvent, TraceEventKind, TraceEventPhase } from '@/domain/ssot';
import { generateId, generateAlertKey } from '@/lib/utils';

interface CreateTraceEventParams {
  kind: TraceEventKind;
  phase: TraceEventPhase;
  title: string;
  details: string;
  links?: {
    lotNumber?: string;
    prodOrderId?: string;
    orderId?: string;
    shipmentId?: string;
    receiptId?: string;
  };
  data?: Record<string, any>;
  userId?: string;
}

export class TraceEventFactory {
  static async create(params: CreateTraceEventParams): Promise<TraceEvent> {
    const now = new Date().toISOString();
    
    const event: TraceEvent = {
      id: generateId('trace'),
      at: now,
      kind: params.kind,
      phase: params.phase,
      title: params.title,
      details: params.details,
      links: params.links || {},
      data: {
        ...params.data,
        alertKey: generateAlertKey(params.kind, params.phase),
        userId: params.userId,
        timestamp: now
      }
    };
    
    // Persistir en Firestore
    await db.collection('traceEvents').doc(event.id).set(event);
    
    // Opcional: Trigger Gemini analysis
    if (shouldTriggerGemini(params.kind, params.phase)) {
      await triggerGeminiAnalysis(event);
    }
    
    return event;
  }
  
  // Métodos helper para eventos comunes
  static async logReceipt(receiptId: string, data: any) {
    return this.create({
      kind: 'ARRIVED',
      phase: 'RECEIPT',
      title: 'Material recibido',
      details: `Recepción de material: ${data.supplierName}`,
      links: { receiptId },
      data
    });
  }
  
  static async logQcTest(lotNumber: string, result: 'PASS' | 'FAIL', data: any) {
    return this.create({
      kind: 'QC_TEST',
      phase: 'QC',
      title: `Test QC: ${result}`,
      details: `Resultado de test para lote ${lotNumber}`,
      links: { lotNumber },
      data: { ...data, result }
    });
  }
  
  static async logProductionConsume(prodOrderId: string, lotNumber: string, data: any) {
    return this.create({
      kind: 'CONSUME',
      phase: 'PRODUCTION',
      title: 'Consumo de material',
      details: `Lote ${lotNumber} consumido en producción`,
      links: { prodOrderId, lotNumber },
      data
    });
  }
  
  static async logProductionOutput(prodOrderId: string, newLotNumber: string, data: any) {
    return this.create({
      kind: 'OUTPUT',
      phase: 'PRODUCTION',
      title: 'Producción completada',
      details: `Generado lote ${newLotNumber}`,
      links: { prodOrderId, lotNumber: newLotNumber },
      data
    });
  }
  
  static async logShipment(shipmentId: string, orderId: string, data: any) {
    return this.create({
      kind: 'SHIPMENT',
      phase: 'DELIVERY',
      title: 'Envío realizado',
      details: `Pedido ${orderId} enviado`,
      links: { shipmentId, orderId },
      data
    });
  }
}
```

#### 3. Implementación Real de Server Actions de Pedidos
**Problema:** `placeOrder`, `assignLots`, `createShipment` son stubs.

**Solución - placeOrder completo:**
```typescript
// src/app/(app)/orders/actions.ts
export async function placeOrder(input: PlaceOrderInput): Promise<OrderSellOut> {
  // 1. Validar input
  const validated = PlaceOrderSchema.parse(input);
  
  // 2. Verificar disponibilidad de stock
  const stockCheck = await checkStockAvailability(validated.lines);
  if (!stockCheck.available) {
    throw new Error(`Stock insuficiente: ${stockCheck.missing.join(', ')}`);
  }
  
  // 3. Asignar lotes según FEFO
  const lotAssignments = await assignLotsFefo(validated.lines);
  
  // 4. Validar QC status de lotes asignados
  for (const assignment of lotAssignments) {
    await validateLotConsumption(assignment.lotNumber);
  }
  
  // 5. Crear pedido
  const order: OrderSellOut = {
    id: generateId('order'),
    docNumber: await generateOrderNumber(),
    accountId: validated.accountId,
    partyId: validated.partyId,
    flow: validated.flow,
    distributorPartyId: validated.distributorPartyId,
    status: 'confirmed',
    lines: validated.lines,
    totalAmount: calculateTotal(validated.lines),
    currency: 'EUR',
    source: validated.source || 'MANUAL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: validated.userId
  };
  
  // 6. Reservar stock
  await reserveStock(lotAssignments);
  
  // 7. Crear TraceEvent
  await TraceEventFactory.create({
    kind: 'SALE',
    phase: 'SALE',
    title: 'Pedido creado',
    details: `Pedido ${order.docNumber} para ${order.accountId}`,
    links: { orderId: order.id },
    data: { order, lotAssignments },
    userId: validated.userId
  });
  
  // 8. Crear task de preparación
  await createTask({
    kind: 'ORDER_PREP',
    title: `Preparar pedido ${order.docNumber}`,
    orderId: order.id,
    assignedToId: await getWarehouseResponsible(),
    department: 'ALMACEN',
    priority: 'MEDIUM',
    dueAt: addDays(new Date(), 1).toISOString()
  });
  
  // 9. Notificar
  if (order.flow === 'PLACEMENT' && order.distributorPartyId) {
    await notifyDistributor(order);
  }
  
  // 10. Gemini analysis (async)
  triggerGeminiOrderAnalysis(order).catch(console.error);
  
  // 11. Persistir
  await db.collection('ordersSellOut').doc(order.id).set(order);
  
  return order;
}
```

#### 4. Modularización de Santa Brain
**Problema:** `saveSantaBrainData` tiene +600 líneas con múltiples responsabilidades mezcladas.

**Solución - Arquitectura modular:**
```typescript
// src/server/santa-brain/services/account-resolver.service.ts
export class AccountResolverService {
  async resolveAccount(input: string): Promise<Account | null> {
    // Fuzzy matching mejorado
    // Creación de cuenta si no existe
    // Validaciones
  }
}

// src/server/santa-brain/services/interaction.service.ts
export class InteractionService {
  async recordInteraction(data: InteractionData): Promise<Interaction> {
    const interaction = await this.create(data);
    await TraceEventFactory.logInteraction(interaction);
    return interaction;
  }
}

// src/server/santa-brain/services/order.service.ts
export class OrderService {
  async recordOrder(data: OrderData): Promise<OrderSellOut> {
    // Usar placeOrder real
    return await placeOrder(data);
  }
}

// src/server/santa-brain/services/gemini-classifier.service.ts
export class GeminiClassifierService {
  async classify(input: string): Promise<Classification> {
    // NLP real con Gemini
    // Extracción de entidades
    // Determinación de intención
  }
}

// src/server/santa-brain/orchestrator.ts
export class SantaBrainOrchestrator {
  constructor(
    private accountResolver: AccountResolverService,
    private interactionService: InteractionService,
    private orderService: OrderService,
    private geminiClassifier: GeminiClassifierService
  ) {}
  
  async process(input: QuickLogInput): Promise<ProcessResult> {
    // 1. Clasificar input
    const classification = await this.geminiClassifier.classify(input.text);
    
    // 2. Resolver cuenta
    const account = await this.accountResolver.resolveAccount(input.accountHint);
    
    // 3. Ejecutar acciones según clasificación
    const results = [];
    
    if (classification.hasInteraction) {
      results.push(await this.interactionService.recordInteraction({
        accountId: account.id,
        ...classification.interactionData
      }));
    }
    
    if (classification.hasOrder) {
      results.push(await this.orderService.recordOrder({
        accountId: account.id,
        ...classification.orderData
      }));
    }
    
    // 4. Crear tasks automáticas
    const tasks = await this.createAutomaticTasks(classification, account);
    
    return {
      account,
      results,
      tasks,
      classification
    };
  }
}
```

### PRIORIDAD MEDIA (Implementar en 4-8 semanas)

#### 5. Hooks Gemini Reales
**Implementar observación → decisión → acción:**

```typescript
// src/server/gemini/hooks/quality-hook.ts
export async function analyzeQcRelease(lot: Lot, tests: QcTest[]): Promise<GeminiDecision> {
  const analysis = await gemini.analyze({
    domain: 'quality',
    context: {
      lot,
      tests,
      historicalData: await getHistoricalQcData(lot.itemId)
    },
    questions: [
      'Are all parameters within specifications?',
      'Are there any concerning trends?',
      'Should this lot be auto-approved?',
      'What corrective actions are needed?'
    ]
  });
  
  return {
    decision: analysis.decision, // APPROVE | HOLD | REJECT
    severity: analysis.severity,
    confidence: analysis.confidence,
    reasoning: analysis.reasoning,
    suggestedActions: analysis.actions,
    alertKey: generateAlertKey('QC_DECISION', lot.lotNumber)
  };
}

// src/server/gemini/hooks/warehouse-hook.ts
export async function analyzeInventoryLevel(item: Item, onHand: OnHandView[]): Promise<GeminiAlert> {
  // Detectar stock bajo, lotes próximos a caducar, etc.
  // Generar alertas y tareas automáticas
}

// src/server/gemini/hooks/sales-hook.ts
export async function analyzeAccountRisk(account: Account): Promise<GeminiInsight> {
  // Detectar riesgo de churn
  // Sugerir Next Best Action
  // Generar tasks preventivas
}
```

#### 6. Conciliaciones R15 Automatizadas
**Jobs diarios para reconciliación:**

```typescript
// src/server/jobs/reconciliation/R15.1-orders-invoices.ts
export async function reconcileOrdersVsInvoices(): Promise<ReconciliationReport> {
  // Comparar orders con invoices de Holded
  // Detectar discrepancias
  // Generar tasks de seguimiento
}

// src/server/jobs/reconciliation/R15.2-payments.ts
export async function reconcilePayments(): Promise<ReconciliationReport> {
  // Comparar facturas con pagos
  // Calcular DSO
  // Alertas de vencidos
}

// src/server/jobs/reconciliation/R15.3-stock-movements.ts
export async function reconcileStockMovements(): Promise<ReconciliationReport> {
  // Validar coherencia de onHand vs stockMoves
  // Detectar discrepancias
}

// src/server/jobs/reconciliation/R15.4-sell-out.ts
export async function reconcileSellOut(): Promise<ReconciliationReport> {
  // Comparar sell-in vs sell-out reportado por distribuidores
  // Detectar desviaciones
}
```

#### 7. Portal de Distribuidores - Acciones Centralizadas
```typescript
// src/server/actions/distributor.actions.ts
export async function updateOrderStatus(
  orderId: string,
  update: DistributorOrderUpdate,
  distributorUserId: string
): Promise<void> {
  // Validar que el distribuidor tenga permisos sobre este pedido
  // Actualizar status
  // Registrar TraceEvent
  // Notificar a Santa Brisa
}

export async function uploadSellOutData(
  distributorPartyId: string,
  csvData: string
): Promise<SellOutUploadResult> {
  // Parse CSV
  // Validar datos
  // Crear registros de sell-out
  // Generar reporte
}
```

---

## 4. MEJORAS POR MÓDULO

### MÓDULO: CALIDAD (Quality)

**Estado Actual:** ✅ Funcional con gaps
**Prioridad:** Alta

#### Mejoras Recomendadas:

1. **QC Plans Extensibles**
   - Actualmente limitado a RECEIPT y PRODUCTION
   - Extender triggers a: TRANSFER, SHIPMENT, PERIODIC, ON_DEMAND
   - Ver interface `QcPlan` en ssot.ts

2. **Auto-aprobación Inteligente**
   - Implementar reglas de auto-aprobación basadas en histórico
   - Gemini analiza patrones y recomienda
   - Reducir carga manual de QC

3. **Integración Cross-módulo**
   - QC debe poder bloquear producción/ventas/logística
   - Ver `qcPlan.integrations` en ssot.ts
   - Implementar en helpers de cada módulo

4. **Trazabilidad Visual**
   - Timeline interactiva de todos los eventos del lote
   - Genealogía visual (árbol de padres/hijos)
   - Exportable para auditorías

### MÓDULO: PRODUCCIÓN (Production)

**Estado Actual:** ✅ Funcional, necesita pulido
**Prioridad:** Media

#### Mejoras Recomendadas:

1. **Cálculo de Costes**
   - Implementar `LotCostSummary` completo
   - Tracking de mermas y rendimiento
   - Comparativa teórico vs real

2. **OEE (Overall Equipment Effectiveness)**
   - Calcular availability, performance, quality
   - Dashboards en tiempo real
   - Alertas de bottlenecks

3. **Protocolos Digitales**
   - Checklist digital durante producción
   - Firmas electrónicas
   - Fotografías obligatorias en pasos críticos

4. **Replanificación Automática**
   - Si falta material → Gemini sugiere alternativas
   - Si mermas altas → alerta y pausa
   - Optimización de batch sizes

### MÓDULO: VENTAS (Sales)

**Estado Actual:** ⚠️ Parcialmente implementado
**Prioridad:** Alta

#### Mejoras Recomendadas:

1. **Pipeline Visual Completo**
   - Kanban por stage con drag & drop
   - Filtros por comercial, región, distribuidor
   - Métricas en tiempo real

2. **Scoring Automático de Cuentas**
   - Health score basado en: pedidos, visitas, pagos
   - Riesgo de churn con IA
   - Priorización automática

3. **Next Best Action (NBA)**
   - Gemini sugiere próxima acción óptima
   - Basado en contexto e histórico
   - Integrado en QuickLog

4. **Sell-Out Tracking**
   - Visualización de sell-in vs sell-out
   - Por distribuidor, cuenta, producto
   - Alertas de stock estancado

### MÓDULO: LOGÍSTICA (Logistics)

**Estado Actual:** ⚠️ Stubs críticos
**Prioridad:** Alta

#### Mejoras Recomendadas:

1. **Flujo End-to-End Completo**
   - Implementar todas las server actions
   - Integración real con Sendcloud
   - Tracking automático

2. **Smart Carrier Selection**
   - Gemini recomienda carrier óptimo según:
     * Peso/dimensiones
     * Destino
     * Urgencia
     * Coste
     * SLA histórico

3. **Gestión de Incidencias**
   - Tracking de entregas fallidas
   - Re-rutas automáticas
   - Comunicación con cliente

4. **KPIs Logísticos**
   - OTIF (On Time In Full)
   - Coste por envío
   - Tiempo medio de preparación
   - Carrier performance

### MÓDULO: FINANZAS (Finance)

**Estado Actual:** ⚠️ Conciliaciones manuales
**Prioridad:** Media

#### Mejoras Recomendadas:

1. **Sync Bidireccional con Holded**
   - Pedidos → Presupuestos/Facturas
   - Facturas → Pagos
   - Estados sincronizados

2. **Cash Flow Forecasting**
   - Proyecciones basadas en pipeline
   - Alertas de liquidez
   - Análisis de DSO

3. **Gestión de Morosos**
   - Alertas automáticas de vencidos
   - Tasks de seguimiento
   - Bloqueo de nuevos pedidos

4. **Reporting Financiero**
   - P&L en tiempo real
   - Por canal, producto, región
   - Comparativas periodo anterior

### MÓDULO: MARKETING (Marketing)

**Estado Actual:** ✅ Básico funcional
**Prioridad:** Baja

#### Mejoras Recomendadas:

1. **ROI Tracking Avanzado**
   - Attribution modeling
   - Lifetime Value por campaña
   - A/B testing integrado

2. **Campaign Calendar**
   - Vista unificada de todas las campañas
   - Alertas de solapamientos
   - Gestión de presupuestos

3. **POS Tactics Automation**
   - Recomendación automática de POS
   - Basada en tipo de cuenta y ventas
   - ROI histórico por táctica

4. **Influencer Management**
   - CRM para creators
   - Tracking de deliverables
   - Performance metrics

---

## 5. ROADMAP DE IMPLEMENTACIÓN

### FASE 0 - FUNDACIÓN (Semanas 1-2)

**Objetivo:** Establecer bases sólidas para todas las mejoras

#### Entregables:
1. ✅ TraceEventFactory implementado y migración iniciada
2. ✅ businessRules.ts con thresholds configurables
3. ✅ Validación QC en consumo de lotes (CRÍTICO)
4. ✅ SystemConfig en Firestore
5. ✅ Documentación de reglas de negocio

#### Validación:
- Code review obligatorio
- Tests unitarios para validación QC
- Demo funcional del TraceEventFactory
- Auditoría de bloqueos QC efectivos

---

### FASE 1 - OPERACIONES CORE (Semanas 3-6)

**Objetivo:** Completar flujos end-to-end críticos

#### Track 1: Pedidos & Logística (Prioridad Alta)
- [ ] Implementar `placeOrder` completo con validaciones
- [ ] Implementar `assignLotsFefo` con validación QC
- [ ] Implementar `createShipment` completo
- [ ] Integración real Sendcloud (webhooks)
- [ ] Orden de picking PDF
- [ ] Albarán de entrega
- [ ] Tasks automáticas de preparación

#### Track 2: Calidad (Prioridad Alta)
- [ ] Hooks Gemini en QC (análisis automático)
- [ ] Auto-aprobación inteligente
- [ ] Emails automáticos de liberación/rechazo
- [ ] Tasks de seguimiento QC

#### Track 3: Trazabilidad (Prioridad Alta)
- [ ] Genealogía de lotes (GENEALOGY_PARENT/CHILD)
- [ ] Timeline visual en Quality module
- [ ] Backward/forward tracking funcional

#### Validación FASE 1:
- Walkthrough end-to-end: Pedido → Picking → Envío → Entrega
- Verificar bloqueos QC funcionan en todo el flujo
- Test de FEFO con lotes mezclados
- Checklist de accesibilidad en drawers
- Validación con equipo de ops y warehouse

---

### FASE 2 - INTELIGENCIA Y AUTOMATIZACIÓN (Semanas 7-10)

**Objetivo:** Activar Gemini y automatizaciones

#### Track 1: Santa Brain Refactor
- [ ] Modularizar en services
- [ ] Gemini NLP real para clasificación
- [ ] Fuzzy matching mejorado
- [ ] Unificar con TaskNew

#### Track 2: Gemini Hooks
- [ ] Quality analyzer activo
- [ ] Warehouse analyzer (stock bajo, caducidades)
- [ ] Sales analyzer (churn risk, NBA)
- [ ] Production analyzer (mermas, OEE)

#### Track 3: Tasks Automáticas
- [ ] De alertas Gemini
- [ ] De eventos de negocio
- [ ] De reglas configurables
- [ ] Dashboard de tasks por usuario

#### Validación FASE 2:
- Gemini debe generar al menos 10 insights útiles por día
- 80% de tasks automáticas debe ser relevante
- Reducción 30% en carga manual de análisis
- User feedback positivo en QuickLog

---

### FASE 3 - INTEGRACIONES (Semanas 11-13)

**Objetivo:** Sync perfecto con sistemas externos

#### Track 1: Holded Integration
- [ ] Sync bidireccional pedidos ↔ facturas
- [ ] Sync pagos automático
- [ ] Reconciliación daily job
- [ ] Dashboard de discrepancias

#### Track 2: Shopify Integration
- [ ] Importación automática de pedidos
- [ ] Actualización de stock
- [ ] Tracking de envíos
- [ ] Webhooks de eventos

#### Track 3: Sendcloud Integration
- [ ] Smart carrier selection
- [ ] Tracking webhooks
- [ ] Gestión de incidencias
- [ ] SLA monitoring

#### Track 4: Conciliaciones R15
- [ ] R15.1: Orders vs Invoices
- [ ] R15.2: Invoices vs Payments
- [ ] R15.3: Stock Movements
- [ ] R15.4: Sell-In vs Sell-Out
- [ ] Jobs automáticos diarios
- [ ] Reportes y alertas

#### Validación FASE 3:
- Tasa de error en sync < 1%
- Discrepancias detectadas < 48h
- Conciliaciones automáticas 90%+
- Runbook documentado

---

### FASE 4 - PORTAL DISTRIBUIDORES (Semanas 14-16)

**Objetivo:** Empoderar a distribuidores con self-service

#### Funcionalidades:
- [ ] Vista de pedidos asignados
- [ ] Actualización de status (shipped, invoiced)
- [ ] Upload de sell-out (CSV)
- [ ] Gestión de consigna
- [ ] Solicitud de materiales POS
- [ ] Dashboard de KPIs

#### Validación FASE 4:
- Onboarding de al menos 2 distribuidores piloto
- Reducción 50% en comunicaciones manuales
- Sell-out data actualizada semanalmente
- Net Promoter Score > 8

---

### FASE 5 - ANALYTICS Y OPTIMIZACIÓN (Semanas 17-20)

**Objetivo:** Dashboards y métricas para decisiones

#### Dashboards:
- [ ] Executive: Revenue, margins, cash flow
- [ ] Ops: OTIF, OEE, stock turns
- [ ] Sales: Pipeline, win rate, DSO
- [ ] Marketing: ROI por canal, CAC, LTV
- [ ] Quality: QC pass rate, lot traceability
- [ ] Logistics: Carrier performance, SLA

#### Gemini Advanced:
- [ ] Forecasting (ventas, producción, cash)
- [ ] Anomaly detection
- [ ] Recomendaciones proactivas
- [ ] What-if scenarios

#### Validación FASE 5:
- Todos los KPIs core en dashboards
- Gemini genera forecasts con <10% error
- Decisiones data-driven documentadas
- Retro y ajustes basados en métricas

---

## 6. MÉTRICAS DE ÉXITO

### Operaciones
- ✅ 0% de consumo de lotes sin aprobar QC
- 🎯 OTIF (On Time In Full) > 95%
- 🎯 Tiempo de preparación de pedidos < 2h
- 🎯 OEE producción > 80%

### Calidad
- 🎯 QC pass rate > 98%
- 🎯 Tiempo medio de QC < 24h
- 🎯 Trazabilidad completa 100% lotes
- 🎯 Auto-aprobaciones seguras > 60%

### Ventas
- 🎯 Pipeline conversion > 25%
- 🎯 Tiempo medio de cierre < 30 días
- 🎯 Churn rate < 10%
- 🎯 Visitas por comercial > 20/mes

### Finanzas
- 🎯 DSO < 45 días
- 🎯 Conciliaciones automáticas > 90%
- 🎯 Facturas emitidas < 48h post-envío
- 🎯 Errores en facturación < 1%

### Tecnología
- 🎯 Uptime > 99.5%
- 🎯 Response time < 500ms (p95)
- 🎯 Error rate < 0.1%
- 🎯 Test coverage > 80%

---

## 7. CONCLUSIONES Y PRÓXIMOS PASOS

### Resumen de Hallazgos

Tu proyecto Santa Brisa ERP es **sólido en fundamentos** pero tiene **gaps críticos en implementación**. La arquitectura SSOT es excelente, los tipos están bien definidos, y el modelo de negocio está claro. Sin embargo, varias piezas clave están stubbed o parcialmente implementadas.

### Principales Fortalezas
1. ✅ SSOT centralizado y bien estructurado
2. ✅ Modelo de negocio claro y documentado
3. ✅ Integraciones existentes (Shopify, Holded, Sendcloud)
4. ✅ Infraestructura Gemini preparada
5. ✅ Sistema de trazabilidad con TraceEvents

### Principales Debilidades
1. ⚠️ **CRÍTICO:** Falta validación QC en consumo de lotes
2. ⚠️ **CRÍTICO:** Server actions de pedidos/logística stubbed
3. ⚠️ Hooks Gemini no implementados
4. ⚠️ TraceEvents inconsistentes
5. ⚠️ Santa Brain monolítico
6. ⚠️ Conciliaciones manuales

### Recomendación de Priorización

**AHORA (Próximas 2 semanas):**
1. Implementar validación QC en consumo de lotes
2. Crear TraceEventFactory y migrar código existente
3. Implementar `placeOrder` completo
4. Documentar reglas de negocio (este documento)

**DESPUÉS (Semanas 3-8):**
1. Completar flujo end-to-end pedidos/logística
2. Activar hooks Gemini reales
3. Refactorizar Santa Brain
4. Implementar conciliaciones R15

**FINALMENTE (Semanas 9-20):**
1. Portal distribuidores completo
2. Dashboards y analytics
3. Optimizaciones y forecasting avanzado

### Beneficios Esperados

Con estas mejoras implementadas, esperas:
- ✅ **Compliance total** con estándares de calidad
- ✅ **Reducción 50%** en errores operativos
- ✅ **Automatización 70%** de tareas repetitivas
- ✅ **Visibilidad 100%** de toda la cadena de valor
- ✅ **Eficiencia 30%** en operaciones
- ✅ **Escalabilidad** para crecer 3x sin aumentar equipo

---

## 8. ANEXO - QUICK WINS (Victorias Rápidas)

Cosas que puedes implementar en 1-2 días para impacto inmediato:

### QW1: Validación QC Simple
```typescript
// Añadir en cualquier función que consuma lotes
const approvedStatuses = ['PASSED', 'CONDITIONAL', 'WAIVED'];
if (!approvedStatuses.includes(lot.qcStatus)) {
  throw new Error(`Lote ${lot.lotNumber} no aprobado`);
}
```

### QW2: TraceEvent Básico
```typescript
// Crear función helper simple
async function logEvent(kind, phase, title, data) {
  await db.collection('traceEvents').add({
    id: generateId(),
    at: new Date().toISOString(),
    kind, phase, title,
    details: JSON.stringify(data),
    data
  });
}
```

### QW3: Alert Simple en Calidad
```typescript
// En módulo Quality, mostrar alerta si hay lotes pendientes > 48h
const pendingLots = lots.filter(l => 
  l.qcStatus === 'PENDING' && 
  Date.now() - new Date(l.createdAt).getTime() > 48 * 3600 * 1000
);
if (pendingLots.length > 0) {
  // Mostrar badge en UI
}
```

### QW4: Dashboard Simple de Conciliaciones
```typescript
// Página que muestre:
// - Orders sin factura > 7 días
// - Facturas sin pago > 30 días
// - Stock discrepancies
// Queries simples de Firestore
```

### QW5: Email de Liberación QC
```typescript
// Al aprobar lote en quality.actions.ts
if (decision === 'APPROVED') {
  await sendEmail({
    to: ['warehouse@santabrisa.com', 'production@santabrisa.com'],
    subject: `Lote ${lotNumber} aprobado`,
    body: `El lote ${lotNumber} ha sido aprobado y está disponible para uso.`
  });
}
```

---

**Documento generado:** 18 de Enero de 2025  
**Próxima revisión:** Tras completar Fase 0  
**Mantenedor:** Equipo Santa Brisa ERP  
**Versión:** 1.0
