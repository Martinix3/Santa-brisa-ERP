// src/lib/trace/FirestoreTracer.ts
/**
 * Firestore Tracer - Intercepta y registra todas las operaciones de Firestore
 * 
 * Funciona como un Proxy sobre las colecciones de Firestore para:
 * 1. Registrar qué componente lee/escribe qué datos
 * 2. Validar la calidad de los datos en tiempo real
 * 3. Emitir eventos para el Inspector Visual
 */

import { 
  collection, 
  query, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  doc,
  Query,
  CollectionReference,
  DocumentReference,
  Firestore
} from 'firebase/firestore';
import type { SantaData } from '@/domain/ssot';

// ============================================================
// TIPOS
// ============================================================

export type TraceOperation = 'read' | 'write' | 'update' | 'delete';

export interface TraceEvent {
  id: string;
  timestamp: string;
  operation: TraceOperation;
  collection: string;
  documentId?: string;
  component?: string;
  stackTrace?: string;
  data?: any;
  quality: DataQuality;
  duration: number;
}

export interface DataQuality {
  valid: boolean;
  warnings: QualityWarning[];
  errors: QualityError[];
  score: number; // 0-100
}

export interface QualityWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium';
}

export interface QualityError {
  field: string;
  message: string;
  severity: 'high' | 'critical';
}

// ============================================================
// EVENT EMITTER
// ============================================================

type TraceEventHandler = (event: TraceEvent) => void;

class TraceEventBus {
  private listeners: TraceEventHandler[] = [];

  on(handler: TraceEventHandler) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }

  emit(event: TraceEvent) {
    this.listeners.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in trace event handler:', error);
      }
    });
  }

  clear() {
    this.listeners = [];
  }
}

export const traceEventBus = new TraceEventBus();

// ============================================================
// FIRESTORE TRACER
// ============================================================

export class FirestoreTracer {
  private static instance: FirestoreTracer;
  private enabled: boolean = false;
  private events: TraceEvent[] = [];
  private maxEvents: number = 1000;

  private constructor() {
    // Singleton
  }

  static getInstance(): FirestoreTracer {
    if (!FirestoreTracer.instance) {
      FirestoreTracer.instance = new FirestoreTracer();
    }
    return FirestoreTracer.instance;
  }

  enable() {
    this.enabled = true;
    console.log('🔍 FirestoreTracer ENABLED');
  }

  disable() {
    this.enabled = false;
    console.log('✅ FirestoreTracer DISABLED');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getEvents(): TraceEvent[] {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }

  // Wrapper para getDocs
  async tracedGetDocs<T>(
    queryRef: Query,
    componentName?: string
  ) {
    if (!this.enabled) {
      return getDocs(queryRef);
    }

    const startTime = performance.now();
    const collectionPath = this.getCollectionPath(queryRef);
    
    try {
      const snapshot = await getDocs(queryRef);
      const duration = performance.now() - startTime;
      
      // Validar cada documento
      const docs = snapshot.docs.map(doc => doc.data());
      const quality = this.validateDataQuality(collectionPath, docs);

      const event: TraceEvent = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        operation: 'read',
        collection: collectionPath,
        component: componentName || this.detectComponent(),
        stackTrace: this.getStackTrace(),
        data: { count: snapshot.size },
        quality,
        duration
      };

      this.recordEvent(event);
      return snapshot;

    } catch (error) {
      console.error('Trace error in getDocs:', error);
      throw error;
    }
  }

  // Wrapper para getDoc
  async tracedGetDoc(
    docRef: DocumentReference,
    componentName?: string
  ) {
    if (!this.enabled) {
      return getDoc(docRef);
    }

    const startTime = performance.now();
    const collectionPath = docRef.parent.path.split('/')[0];
    
    try {
      const snapshot = await getDoc(docRef);
      const duration = performance.now() - startTime;
      
      const data = snapshot.data();
      const quality = data 
        ? this.validateDataQuality(collectionPath, [data])
        : { valid: false, warnings: [], errors: [{ field: '_document', message: 'Document does not exist', severity: 'critical' as const }], score: 0 };

      const event: TraceEvent = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        operation: 'read',
        collection: collectionPath,
        documentId: docRef.id,
        component: componentName || this.detectComponent(),
        stackTrace: this.getStackTrace(),
        data: snapshot.exists() ? { exists: true } : { exists: false },
        quality,
        duration
      };

      this.recordEvent(event);
      return snapshot;

    } catch (error) {
      console.error('Trace error in getDoc:', error);
      throw error;
    }
  }

  // Wrapper para addDoc
  async tracedAddDoc(
    collectionRef: CollectionReference,
    data: any,
    componentName?: string
  ) {
    if (!this.enabled) {
      return addDoc(collectionRef, data);
    }

    const startTime = performance.now();
    const collectionPath = collectionRef.path;
    
    try {
      // Validar antes de escribir
      const quality = this.validateDataQuality(collectionPath, [data]);
      
      if (quality.errors.length > 0) {
        console.warn('⚠️ Writing data with quality errors:', quality.errors);
      }

      const docRef = await addDoc(collectionRef, data);
      const duration = performance.now() - startTime;

      const event: TraceEvent = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        operation: 'write',
        collection: collectionPath,
        documentId: docRef.id,
        component: componentName || this.detectComponent(),
        stackTrace: this.getStackTrace(),
        data: { preview: this.getDataPreview(data) },
        quality,
        duration
      };

      this.recordEvent(event);
      return docRef;

    } catch (error) {
      console.error('Trace error in addDoc:', error);
      throw error;
    }
  }

  // Wrapper para setDoc
  async tracedSetDoc(
    docRef: DocumentReference,
    data: any,
    componentName?: string
  ) {
    if (!this.enabled) {
      return setDoc(docRef, data);
    }

    const startTime = performance.now();
    const collectionPath = docRef.parent.path.split('/')[0];
    
    try {
      const quality = this.validateDataQuality(collectionPath, [data]);
      
      if (quality.errors.length > 0) {
        console.warn('⚠️ Setting doc with quality errors:', quality.errors);
      }

      await setDoc(docRef, data);
      const duration = performance.now() - startTime;

      const event: TraceEvent = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        operation: 'write',
        collection: collectionPath,
        documentId: docRef.id,
        component: componentName || this.detectComponent(),
        stackTrace: this.getStackTrace(),
        data: { preview: this.getDataPreview(data) },
        quality,
        duration
      };

      this.recordEvent(event);

    } catch (error) {
      console.error('Trace error in setDoc:', error);
      throw error;
    }
  }

  // Wrapper para updateDoc
  async tracedUpdateDoc(
    docRef: DocumentReference,
    data: any,
    componentName?: string
  ) {
    if (!this.enabled) {
      return updateDoc(docRef, data);
    }

    const startTime = performance.now();
    const collectionPath = docRef.parent.path.split('/')[0];
    
    try {
      const quality = this.validateDataQuality(collectionPath, [data]);

      await updateDoc(docRef, data);
      const duration = performance.now() - startTime;

      const event: TraceEvent = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        operation: 'update',
        collection: collectionPath,
        documentId: docRef.id,
        component: componentName || this.detectComponent(),
        stackTrace: this.getStackTrace(),
        data: { preview: this.getDataPreview(data) },
        quality,
        duration
      };

      this.recordEvent(event);

    } catch (error) {
      console.error('Trace error in updateDoc:', error);
      throw error;
    }
  }

  // ============================================================
  // VALIDACIÓN DE CALIDAD
  // ============================================================

  private validateDataQuality(collection: string, docs: any[]): DataQuality {
    const warnings: QualityWarning[] = [];
    const errors: QualityError[] = [];

    docs.forEach((doc, index) => {
      // Validación 1: Campos vacíos o undefined
      Object.entries(doc).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          warnings.push({
            field: key,
            message: `Campo "${key}" es null/undefined`,
            severity: 'medium'
          });
        }
        
        if (typeof value === 'string' && value.trim() === '') {
          warnings.push({
            field: key,
            message: `Campo "${key}" es string vacío`,
            severity: 'low'
          });
        }
      });

      // Validación 2: Campos requeridos según colección
      const requiredFields = this.getRequiredFields(collection);
      requiredFields.forEach(field => {
        if (!(field in doc) || doc[field] === null || doc[field] === undefined) {
          errors.push({
            field,
            message: `Campo requerido "${field}" faltante`,
            severity: 'high'
          });
        }
      });

      // Validación 3: Tipos incorrectos
      const typeValidations = this.getTypeValidations(collection);
      Object.entries(typeValidations).forEach(([field, expectedType]) => {
        if (field in doc && typeof doc[field] !== expectedType) {
          errors.push({
            field,
            message: `Campo "${field}" debe ser ${expectedType}, es ${typeof doc[field]}`,
            severity: 'high'
          });
        }
      });

      // Validación 4: Fechas inválidas
      if (collection !== 'users' && 'createdAt' in doc) {
        const createdAt = doc.createdAt;
        if (typeof createdAt === 'string') {
          const date = new Date(createdAt);
          if (isNaN(date.getTime())) {
            errors.push({
              field: 'createdAt',
              message: 'Fecha createdAt inválida',
              severity: 'high'
            });
          }
        }
      }
    });

    // Calcular score (0-100)
    const totalIssues = warnings.length + errors.length * 2;
    const maxIssues = docs.length * 10; // Máximo hipotético de issues
    const score = Math.max(0, Math.min(100, 100 - (totalIssues / maxIssues * 100)));

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      score: Math.round(score)
    };
  }

  // ============================================================
  // HELPERS PRIVADOS
  // ============================================================

  private getCollectionPath(queryRef: Query): string {
    // Extraer path de la query
    // Esto es una simplificación - en producción necesitaríamos un método más robusto
    return (queryRef as any)._query?.path?.accountTypes?.[0] || 'unknown';
  }

  private detectComponent(): string {
    // Intentar detectar el componente desde el stack trace
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    
    for (const line of lines) {
      // Buscar líneas que contengan rutas de componentes
      if (line.includes('/components/') || line.includes('/features/')) {
        const match = line.match(/\/([^/]+)\.(tsx?|jsx?):/);
        if (match) {
          return match[1];
        }
      }
    }
    
    return 'UnknownComponent';
  }

  private getStackTrace(): string {
    const stack = new Error().stack || '';
    return stack.split('\n').slice(0, 5).join('\n');
  }

  private generateId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDataPreview(data: any): any {
    // Crear una versión resumida de los datos
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const preview: any = {};
    Object.keys(data).slice(0, 5).forEach(key => {
      const value = data[key];
      if (typeof value === 'string' && value.length > 50) {
        preview[key] = value.substring(0, 50) + '...';
      } else {
        preview[key] = value;
      }
    });

    if (Object.keys(data).length > 5) {
      preview['...'] = `+${Object.keys(data).length - 5} more fields`;
    }

    return preview;
  }

  private recordEvent(event: TraceEvent) {
    this.events.push(event);
    
    // Limitar número de eventos en memoria
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Emitir evento para listeners
    traceEventBus.emit(event);

    // Log en consola si hay errores
    if (event.quality.errors.length > 0) {
      console.warn(`🔍 [Trace] Quality issues in ${event.collection}:`, event.quality.errors);
    }
  }

  private getRequiredFields(collection: string): string[] {
    const requiredFieldsMap: Record<string, string[]> = {
      accounts: ['id', 'name', 'partyId', 'stage', 'ownerId', 'flow'],
      parties: ['id', 'name', 'kind'],
      users: ['id', 'name', 'role', 'active'],
      ordersSellOut: ['id', 'accountId', 'status', 'lines', 'totalAmount'],
      interactions: ['id', 'userId', 'accountId', 'kind', 'status'],
      items: ['id', 'sku', 'name', 'category', 'uom', 'active'],
      lots: ['id', 'lotNumber', 'itemId', 'quantity', 'uom', 'qcStatus'],
      shipments: ['id', 'orderId', 'partyId', 'status', 'lines'],
    };

    return requiredFieldsMap[collection] || ['id'];
  }

  private getTypeValidations(collection: string): Record<string, string> {
    const typeValidationsMap: Record<string, Record<string, string>> = {
      accounts: {
        id: 'string',
        name: 'string',
        ownerId: 'string',
        isTarget: 'boolean'
      },
      users: {
        id: 'string',
        name: 'string',
        active: 'boolean'
      },
      ordersSellOut: {
        id: 'string',
        totalAmount: 'number'
      }
    };

    return typeValidationsMap[collection] || {};
  }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

export const firestoreTracer = FirestoreTracer.getInstance();
