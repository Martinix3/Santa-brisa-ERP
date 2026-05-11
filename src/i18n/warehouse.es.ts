/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Traducciones al español para el módulo de Almacén
 * FASE 19.1: GoodsReceipt Visual Mobile-First
 */

export const warehouseES = {
  goodsReceipt: {
    // Títulos
    title: "Nueva Recepción de Mercancía",
    subtitle: "Registra los productos recibidos del proveedor",
    
    // Campos principales
    receiptNumber: "Nº Albarán",
    supplier: "Proveedor",
    supplierSearch: "Buscar proveedor...",
    date: "Fecha de Recepción",
    purchaseOrder: "Nº Pedido de Compra",
    notes: "Notas Generales",
    
    // Sección de productos
    products: "Productos Recibidos",
    addProduct: "Añadir Producto",
    productSearch: "Buscar producto por nombre o SKU...",
    searchProduct: "Buscar producto por nombre o SKU...",
    searchProductHelper: "Escribe el nombre o SKU del producto",
    noProducts: "Aún no has añadido productos",
    noProductsFound: "No se encontraron productos",
    
    // Campos de producto
    sku: "SKU",
    product: "Producto",
    internalLot: "Lote Interno",
    externalLot: "Lote Externo",
    supplierLot: "Lote Proveedor",
    quantity: "Cantidad",
    cost: "Coste Unitario",
    totalCost: "Coste Total",
    uom: "Unidad",
    expiryDate: "Fecha de Caducidad",
    productionDate: "Fecha de Producción",
    
    // Categorías
    category: "Categoría",
    selectCategory: "Selecciona una categoría",
    categories: {
      finalGood: "Producto Terminado",
      merchandise: "Mercancía",
      raw: "Materia Prima",
      intermediate: "Intermedio",
      packaging: "Packaging",
    },
    
    // Fotos
    photos: "Fotos",
    photosOfReceipt: "Fotos del Albarán",
    photosOfProduct: "Fotos del Producto",
    takePhoto: "Tomar Foto",
    uploadImage: "Subir Imagen",
    uploadFromGallery: "Subir desde Galería",
    deletePhoto: "Eliminar Foto",
    noPhotos: "Sin fotos",
    photosCount: "{{count}} foto(s)",
    
    // Incidencias
    incident: "Incidencia",
    incidents: "Incidencias",
    reportIncident: "Reportar Incidencia (opcional)",
    noIncident: "Sin incidencias",
    incidentType: "Tipo de Incidencia",
    incidentTypes: {
      damage: "Daño/Rotura",
      shortage: "Faltante (cantidad menor)",
      wrongProduct: "Producto Incorrecto",
      expirySoon: "Caducidad Próxima",
      other: "Otro",
    },
    incidentDescription: "Descripción de la Incidencia",
    incidentDescriptionPlaceholder: "Describe el problema encontrado...",
    severity: "Severidad",
    severityLevels: {
      low: "Baja",
      medium: "Media",
      high: "Alta",
    },
    evidencePhotos: "Fotos de Evidencia",
    
    // Stock info
    stock: "Stock",
    stockAvailable: "Disponible: {{qty}} {{uom}}",
    outOfStock: "Sin stock",
    
    // Acciones
    create: "Crear Recepción",
    creating: "Creando...",
    cancel: "Cancelar",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    saving: "Guardando...",
    close: "Cerrar",
    expand: "Expandir",
    collapse: "Colapsar",
    
    // Mensajes
    success: "Recepción creada exitosamente",
    successWithNumber: "Recepción {{number}} creada exitosamente",
    error: "Error al crear la recepción",
    errorGeneric: "Ha ocurrido un error. Inténtalo de nuevo.",
    confirmCancel: "¿Seguro que quieres cancelar? Se perderán todos los cambios.",
    confirmDelete: "¿Seguro que quieres eliminar este producto?",
    uploadingPhotos: "Subiendo fotos...",
    photoUploadError: "Error al subir la foto",
    
    // Estados
    qcStatus: {
      qc_hold: "En Control de Calidad",
      approved: "Aprobado",
      rejected: "Rechazado",
    },
    
    // Placeholders
    placeholders: {
      receiptNumber: "Ej: ALB-2025-001",
      purchaseOrder: "Ej: PO-2025-001",
      notes: "Observaciones generales sobre la recepción...",
      supplierLot: "Lote del proveedor",
      quantity: "0",
      cost: "0.00",
    },
    
    // Validación
    validation: {
      receiptNumberRequired: "El número de albarán es obligatorio",
      supplierRequired: "Debes seleccionar un proveedor",
      dateRequired: "La fecha es obligatoria",
      atLeastOneProduct: "Debes añadir al menos un producto",
      skuRequired: "El SKU es obligatorio",
      productRequired: "Debes seleccionar un producto",
      quantityRequired: "La cantidad es obligatoria",
      quantityPositive: "La cantidad debe ser mayor a 0",
      quantityInvalid: "La cantidad no es válida",
      categoryRequired: "Debes seleccionar una categoría",
      costNonNegative: "El coste no puede ser negativo",
      incidentDescriptionRequired: "Describe la incidencia",
    },
    
    // Ayudas/Tips
    tips: {
      category: "Selecciona el tipo de producto recibido",
      photos: "Toma fotos del albarán para tener registro visual",
      incident: "Reporta cualquier problema encontrado en la recepción",
      internalLot: "Se genera automáticamente si lo dejas vacío",
      expiryDate: "Importante para productos perecederos",
    },
  },
  
  // Info general de warehouse
  warehouse: {
    title: "Almacén",
    inventory: "Inventario",
    receipts: "Recepciones",
    movements: "Movimientos",
    dashboard: "Panel de Control",
  },
} as const;

// Type para autocompletado
export type WarehouseTranslations = typeof warehouseES;

// Helper function para obtener traducción con parámetros
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = warehouseES;
  
  for (const k of keys) {
    value = value[k];
    if (value === undefined) return key;
  }
  
  if (typeof value !== 'string') return key;
  
  // Reemplazar parámetros
  if (params) {
    return Object.entries(params).reduce((str, [key, val]) => {
      return str.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
    }, value);
  }
  
  return value;
}
