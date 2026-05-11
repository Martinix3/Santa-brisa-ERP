// src/services/canonical/sku.service.ts
import { adminDb as db } from '@/server/firebase';
import { z } from 'zod';
import { ItemSchema } from '@/domain/ssot-v2-plus-schemas';

/**
 * Servicio canónico para gestión de SKUs
 * Implementa generación determinista y normalización
 */
export class SkuService {
  
  /**
   * Genera SKU determinista desde metadatos
   * Reemplaza generateSKU(category) basado en año+secuencia
   */
  static makeSku(params: {
    category: 'FG' | 'RAW' | 'PACK' | 'LABEL' | 'MERCH' | 'INTERMEDIATE' | 'CONSUMABLE';
    family?: string;
    variant?: string;
    size?: string | number;
    pack?: string | number;
  }): string {
    const { category, family, variant, size, pack } = params;
    
    /**
     * Normaliza segmento eliminando acentos y caracteres especiales
     */
    const segment = (x?: string | number) => String(x ?? '')
      .normalize('NFD')                    // Descomponer caracteres Unicode
      .replace(/\p{Diacritic}/gu, '')     // Eliminar diacríticos (acentos)
      .toUpperCase()                      // Mayúsculas
      .replace(/[^A-Z0-9]+/g, '-')        // Solo alfanuméricos, separados por guión
      .replace(/^-+|-+$/g, '');           // Eliminar guiones al inicio/final
    
    return [
      segment(category),
      segment(family),
      segment(variant),
      segment(size),
      segment(pack)
    ].filter(Boolean).join('-');
  }
  
  /**
   * Valida formato SKU canónico
   */
  static validateSku(sku: string): boolean {
    const normalized = sku.trim().toUpperCase();
    
    // Formato: 3-32 caracteres, solo A-Z, 0-9, guiones
    // No puede empezar o terminar con guión
    // No puede tener guiones consecutivos
    const pattern = /^[A-Z0-9]([A-Z0-9-]*[A-Z0-9])?$/;
    
    return pattern.test(normalized) && 
           normalized.length >= 3 && 
           normalized.length <= 32 &&
           !normalized.includes('--');  // No guiones dobles
  }
  
  /**
   * Normaliza SKU a formato canónico
   * Lanza error si el formato es inválido
   */
  static normalizeSku(sku: string): string {
    const normalized = sku.trim().toUpperCase();
    
    if (!SkuService.validateSku(normalized)) {
      throw new Error(`Invalid SKU format: "${sku}". Must be 3-32 chars, A-Z0-9 and hyphens only`);
    }
    
    return normalized;
  }

  /**
   * Verifica que un SKU sea único en la colección items
   * CRÍTICO: Solo usar dentro de db.runTransaction()
   */
  static async ensureSkuUnique(
    tx: FirebaseFirestore.Transaction,
    sku: string,
    excludeItemId?: string
  ): Promise<void> {
    const normalizedSku = SkuService.normalizeSku(sku);
    
    // Buscar SKUs existentes
    const snapshot = await tx.get(
      db.collection('items').where('sku', '==', normalizedSku)
    );
    
    // Verificar unicidad
    const conflictingItems = snapshot.docs.filter(doc => 
      excludeItemId ? doc.id !== excludeItemId : true
    );
    
    if (conflictingItems.length > 0) {
      const conflictingId = conflictingItems[0].id;
      throw new Error(
        `SKU "${normalizedSku}" already exists for item ${conflictingId}. ` +
        `SKUs must be unique across all items.`
      );
    }
  }

  /**
   * Extrae componentes del SKU (si sigue el patrón makeSku)
   */
  static parseSku(sku: string): {
    category?: string;
    family?: string;
    variant?: string;
    size?: string;
    pack?: string;
  } | null {
    
    if (!SkuService.validateSku(sku)) {
      return null;
    }
    
    const parts = sku.split('-');
    
    return {
      category: parts[0] || undefined,
      family: parts[1] || undefined,
      variant: parts[2] || undefined,
      size: parts[3] || undefined,
      pack: parts[4] || undefined
    };
  }

  /**
   * Sugiere SKU basado en nombre del producto
   * Útil para generar SKUs cuando no se tienen metadatos completos
   */
  static suggestSkuFromName(productName: string, category: string): string {
    const normalized = productName
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s]+/g, '')
      .split(/\s+/)
      .slice(0, 3)  // Max 3 palabras
      .map(word => word.slice(0, 4))  // Max 4 chars por palabra
      .join('-');
    
    return SkuService.makeSku({
      category: category.toUpperCase() as any,
      family: normalized
    });
  }

  /**
   * Migra SKUs legacy al nuevo formato
   * Intenta preservar la estructura existente si es válida
   */
  static migrateLegacySku(legacySku: string): string {
    // Si ya es válido, usar tal cual
    if (SkuService.validateSku(legacySku)) {
      return SkuService.normalizeSku(legacySku);
    }
    
    // Si no es válido, limpiar caracteres problemáticos
    const cleaned = legacySku
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Validar que el resultado sea válido
    if (SkuService.validateSku(cleaned)) {
      return cleaned;
    }
    
    // Si aún no es válido, generar uno básico
    return `MIGRATED-${cleaned.slice(0, 10)}-${Date.now() % 1000}`;
  }

  /**
   * Genera variante de SKU cuando hay colisión
   * Añade sufijo -V2, -V3, etc.
   */
  static generateVariantSku(baseSku: string, existingSkus: string[]): string {
    const normalizedBase = SkuService.normalizeSku(baseSku);
    
    // Si no hay colisión, devolver el original
    if (!existingSkus.includes(normalizedBase)) {
      return normalizedBase;
    }
    
    // Buscar próxima variante disponible
    for (let i = 2; i <= 99; i++) {
      const variant = `${normalizedBase}-V${i}`;
      if (!existingSkus.includes(variant)) {
        return variant;
      }
    }
    
    // Si llega aquí, hay demasiadas variantes
    throw new Error(
      `Too many SKU variants for base: ${normalizedBase}. ` +
      `Maximum 99 variants allowed.`
    );
  }

  /**
   * Crea un nuevo SKU y el item correspondiente en la base de datos.
   * Fundamental para la creación de BOMs.
   * @param name - El nombre del producto a crear.
   * @param type - El tipo de producto, 'INTERMEDIATE' o 'FG'.
   * @returns El ID del nuevo item creado.
   */
  static async createSku(
    name: string,
    type: 'INTERMEDIATE' | 'FG'
  ): Promise<string> {
    const sku = SkuService.suggestSkuFromName(name, type);

    const newItemData = {
      name,
      sku,
      type,
      // Valores por defecto para un nuevo item
      category: type === 'FG' ? 'finished_goods' : 'intermediate_goods',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validar con Zod antes de guardar
    const parsedItem = ItemSchema.partial().parse(newItemData);

    const newItemRef = await db.runTransaction(async (tx) => {
      await SkuService.ensureSkuUnique(tx, sku);
      const ref = db.collection('items').doc();
      tx.set(ref, parsedItem);
      return ref;
    });

    return newItemRef.id;
  }
}
