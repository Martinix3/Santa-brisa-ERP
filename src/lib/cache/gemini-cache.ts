/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Gemini Cache - Sistema de caché inteligente para respuestas de IA
 * 
 * Características:
 * - LRU (Least Recently Used) eviction
 * - TTL (Time To Live) configurable
 * - Keys deterministas basadas en hash
 * - Stats de cache hit/miss
 */

import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export class GeminiCache {
  private cache: LRUCache<string, CacheEntry<any>>;
  private hits = 0;
  private misses = 0;
  private maxSize: number;
  private currentSize = 0;
  
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.cache = new LRUCache({ max: maxSize });
  }
  
  /**
   * Genera key determinista basada en prompt + contexto
   */
  private generateKey(prompt: string, context: any): string {
    const hash = crypto.createHash('sha256');
    const normalizedContext = JSON.stringify(context, Object.keys(context).sort());
    hash.update(`${prompt}:${normalizedContext}`);
    return hash.digest('hex');
  }
  
  /**
   * Obtiene un valor del cache
   */
  async get<T>(
    prompt: string, 
    context: any,
    ttl: number = 3600 // 1 hora default
  ): Promise<T | null> {
    const key = this.generateKey(prompt, context);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Verificar TTL
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl * 1000) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.data as T;
  }
  
  /**
   * Guarda un valor en el cache
   */
  async set<T>(
    prompt: string,
    context: any,
    data: T,
    ttl: number = 3600
  ): Promise<void> {
    const key = this.generateKey(prompt, context);
    const existed = this.cache.has(key);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    if (!existed) {
      this.currentSize++;
    }
  }
  
  /**
   * Limpia el cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.currentSize = 0;
  }
  
  /**
   * Obtiene estadísticas del cache
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0
    };
  }
  
  /**
   * Invalida cache completo (por simplicidad)
   */
  invalidate(): number {
    const size = this.currentSize;
    this.clear();
    return size;
  }
}

// Instancia global del cache
export const geminiCache = new GeminiCache(1000);

// Limpiar cache cada 6 horas para evitar memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const stats = geminiCache.getStats();
    console.log('[GeminiCache] Cleanup triggered. Stats:', stats);
    
    // Si el cache está muy lleno, limpiar entradas antiguas
    if (stats.size > stats.maxSize * 0.9) {
      geminiCache.clear();
      console.log('[GeminiCache] Cache cleared due to high usage');
    }
  }, 6 * 60 * 60 * 1000); // 6 horas
}
