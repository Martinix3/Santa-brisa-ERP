/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Rate Limiter - Control de tasa de peticiones
 * 
 * Usa algoritmo de ventana deslizante con LRU cache
 */

import { LRUCache } from 'lru-cache';

interface RateLimitInfo {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export class RateLimiter {
  private cache: LRUCache<string, RateLimitInfo>;
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {
    this.cache = new LRUCache({ max: 10000 });
  }
  
  /**
   * Verifica si una petición está permitida
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const info = this.cache.get(identifier);
    
    // Nueva ventana o ventana expirada
    if (!info || now > info.resetAt) {
      const resetAt = now + this.windowMs;
      this.cache.set(identifier, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt
      };
    }
    
    // Límite excedido
    if (info.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: info.resetAt,
        retryAfter: Math.ceil((info.resetAt - now) / 1000)
      };
    }
    
    // Incrementar contador
    info.count++;
    this.cache.set(identifier, info);
    
    return {
      allowed: true,
      remaining: this.maxRequests - info.count,
      resetAt: info.resetAt
    };
  }
  
  /**
   * Resetea el límite para un identificador
   */
  reset(identifier: string): void {
    this.cache.delete(identifier);
  }
  
  /**
   * Obtiene info actual sin incrementar contador
   */
  getInfo(identifier: string): RateLimitResult | null {
    const now = Date.now();
    const info = this.cache.get(identifier);
    
    if (!info || now > info.resetAt) {
      return null;
    }
    
    return {
      allowed: info.count < this.maxRequests,
      remaining: Math.max(0, this.maxRequests - info.count),
      resetAt: info.resetAt,
      retryAfter: info.count >= this.maxRequests 
        ? Math.ceil((info.resetAt - now) / 1000)
        : undefined
    };
  }
  
  /**
   * Limpia cache completo
   */
  clear(): void {
    this.cache.clear();
  }
}

// Instancias globales por endpoint
export const santaBrainLimiter = new RateLimiter(60, 60000); // 60 req/min
export const analyzersLimiter = new RateLimiter(10, 60000);  // 10 req/min
export const apiLimiter = new RateLimiter(100, 60000);      // 100 req/min general
