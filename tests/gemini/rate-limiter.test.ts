/**
 * Tests para RateLimiter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '@/lib/rate-limit/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  
  beforeEach(() => {
    limiter = new RateLimiter(5, 1000); // 5 requests per segundo para testing
  });
  
  describe('Límite básico', () => {
    it('debe permitir requests dentro del límite', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await limiter.checkLimit('user1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });
    
    it('debe bloquear requests que exceden el límite', async () => {
      // Usar el límite completo
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit('user1');
      }
      
      // La 6ta debe ser bloqueada
      const result = await limiter.checkLimit('user1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
    
    it('debe resetear después de la ventana de tiempo', async () => {
      // Usar el límite
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit('user1');
      }
      
      // Siguiente debe ser bloqueada
      let result = await limiter.checkLimit('user1');
      expect(result.allowed).toBe(false);
      
      // Esperar que expire la ventana (1 segundo)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Ahora debe permitir de nuevo
      result = await limiter.checkLimit('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });
  
  describe('Múltiples usuarios', () => {
    it('debe mantener límites separados por usuario', async () => {
      // Usuario 1 usa su límite
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit('user1');
      }
      
      // Usuario 1 bloqueado
      let result = await limiter.checkLimit('user1');
      expect(result.allowed).toBe(false);
      
      // Usuario 2 debe tener límite completo
      result = await limiter.checkLimit('user2');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });
  
  describe('getInfo', () => {
    it('debe retornar null para usuario sin historial', () => {
      const info = limiter.getInfo('new-user');
      expect(info).toBeNull();
    });
    
    it('debe retornar info actual sin incrementar contador', async () => {
      await limiter.checkLimit('user1');
      await limiter.checkLimit('user1');
      
      const info = limiter.getInfo('user1');
      expect(info).not.toBeNull();
      expect(info?.remaining).toBe(3); // 5 - 2 = 3
      
      // Verificar que no incrementó
      const info2 = limiter.getInfo('user1');
      expect(info2?.remaining).toBe(3); // Sigue siendo 3
    });
  });
  
  describe('reset', () => {
    it('debe resetear límite de un usuario específico', async () => {
      // Usar el límite
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit('user1');
      }
      
      // Bloqueado
      let result = await limiter.checkLimit('user1');
      expect(result.allowed).toBe(false);
      
      // Reset
      limiter.reset('user1');
      
      // Ahora debe permitir
      result = await limiter.checkLimit('user1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
    
    it('debe resetear solo el usuario especificado', async () => {
      await limiter.checkLimit('user1');
      await limiter.checkLimit('user2');
      
      limiter.reset('user1');
      
      // User1 reseteado
      let info = limiter.getInfo('user1');
      expect(info).toBeNull();
      
      // User2 no afectado
      info = limiter.getInfo('user2');
      expect(info).not.toBeNull();
    });
  });
  
  describe('clear', () => {
    it('debe limpiar todos los límites', async () => {
      await limiter.checkLimit('user1');
      await limiter.checkLimit('user2');
      await limiter.checkLimit('user3');
      
      limiter.clear();
      
      expect(limiter.getInfo('user1')).toBeNull();
      expect(limiter.getInfo('user2')).toBeNull();
      expect(limiter.getInfo('user3')).toBeNull();
    });
  });
});
