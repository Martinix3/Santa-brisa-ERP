/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { z } from 'zod';
import { Id, LotCode, zDate, MedText, zNum, SmallText } from './ssot-v2-plus-schemas';

// Especificaciones de un producto (para el ajuste de Gemini)
export const ProductSpecSchema = z.object({
  id: Id,
  itemId: Id,
  version: z.number().int().min(1),
  specType: z.enum(['ALCOHOL_ABV', 'BRIX', 'ACIDITY_PH', 'DENSITY']),
  target: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string(),
});

// Un ingrediente o material en la receta
export const BomLineSchema = z.object({
  id: Id,
  itemId: Id, // El SKU de la materia prima
  quantity: z.number().positive(),
  uom: z.string(),
  // Especificación requerida para esta línea (ej. "Tequila 40% ABV")
  // Esto permite a Gemini comparar con el COA del lote real.
  requiredSpec: ProductSpecSchema.optional(),
  cost: z.number().min(0), // Coste teórico de esta línea
});

// El "Libro de Recetas" (BOM - Bill of Materials)
export const BomSchema = z.object({
  id: Id,
  name: SmallText,
  description: MedText.optional(),
  version: z.number().int().min(1),

  // El SKU que ESTA receta produce
  outputItemId: Id,
  outputItemType: z.enum(['INTERMEDIATE', 'FG']), // Producción o Envasado
  outputQuantity: z.number().positive(), // Cantidad teórica (ej. "1000L")

  lines: z.array(BomLineSchema),

  // Protocolos de Calidad/Compliance a ejecutar ANTES de empezar
  preflightProtocolIds: z.array(Id).optional(),

  // Coste total teórico (calculado)
  theoreticalCost: z.number().min(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'RETIRED']),
  createdAt: zDate,
  updatedAt: zDate,
});

// La instancia de ejecución de una receta (Orden de Producción)
export const ProductionOrderSchema = z.object({
  id: Id,
  bomId: Id, // La receta que estamos usando
  bomVersion: z.number(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED']),

  // El lote de producto terminado que se creará
  targetLotCode: LotCode,
  targetItemId: Id,

  targetQuantity: z.number().positive(),
  actualQuantity: z.number().min(0).optional(),
  wasteQuantity: z.number().min(0).default(0),

  // Tiempos
  plannedStartDate: zDate,
  startedAt: zDate.optional(),
  pausedAt: zDate.optional(),
  completedAt: zDate.optional(),
  totalDurationMs: z.number().optional(),

  // IDs de los "pre-flight checks"
  protocolRunIds: z.array(Id).optional(),

  assignedTo: Id.optional(),
  notes: MedText.optional(),
});

// Un paso de ejecución real (registrado en el iPad)
export const ProductionStepLogSchema = z.object({
  id: Id,
  orderId: Id,
  stepTitle: z.string(), // Ej. "Añadir Tequila"
  targetQuantity: z.number(),

  // Lo que realmente pasó
  actualQuantity: z.number(),
  inputLotCode: LotCode,
  executedBy: Id,
  executedAt: zDate,

  // Desviación calculada
  deviation: z.number(),
});

// Incidencia registrada
export const IncidentSchema = z.object({
  id: Id,
  orderId: Id,
  stepId: Id.optional(),
  type: z.enum(['QUALITY', 'EQUIPMENT_FAILURE', 'MATERIAL_SHORTAGE', 'OTHER']),
  description: MedText,
  wasteQuantity: z.number().min(0).default(0),
  downtimeMs: z.number().min(0).default(0),
  reportedBy: Id,
  reportedAt: zDate,
  documentIds: z.array(Id).optional(), // Fotos del problema
});

// Eventos de trazabilidad
export const TraceEventSchema = z.object({
  id: Id,
  eventType: z.literal('PRODUCTION_TRANSFORM'),
  orderId: Id,
  inputLots: z.array(LotCode),
  outputLot: LotCode,
  occurredAt: zDate,
  by: Id,
});

// Movimientos de stock
export const StockMoveSchema = z.object({
  id: Id,
  itemId: Id,
  lotCode: LotCode,
  locationId: Id,
  quantity: z.number(), // Negativo para salida, Positivo para entrada
  reason: z.literal('PRODUCTION_CONSUMPTION')
    .or(z.literal('PRODUCTION_OUTPUT'))
    .or(z.literal('QC_BUCKET_MOVE')),
  orderId: Id.optional(),
  occurredAt: zDate,
  by: Id,
});
