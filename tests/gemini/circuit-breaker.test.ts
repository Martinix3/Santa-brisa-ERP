/**
 * Tests para CircuitBreaker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitState } from '@/lib/resilience/circuit-breaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;
  
  beforeEach(() => {
    cb = new CircuitBreaker('test-breaker', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000, // 1 segundo
      monitoringPeriod: 1000
    });
  });
  
  describe('Estado CLOSED (normal)', () => {
    it('debe empezar en estado CLOSED', () => {
      const state = cb.getState();
      expect(state.state).toBe(CircuitState.CLOSED);
      expect(state.failures).toBe(0);
    });
    
    it('debe ejecutar función exitosamente', async () => {
      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
    });
    
    it('debe mantenerse CLOSED con fallos esporádicos', async () => {
      await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      await cb.execute(async () => 'success');
      await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      
      const state = cb.getState();
      expect(state.state).toBe(CircuitState.CLOSED);
    });
  });
  
  describe('Transición a OPEN', () => {
    it('debe abrir circuito después de threshold fallos', async () => {
      // 3 fallos consecutivos
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => {
          throw new Error('fail');
        }).catch(() => {});
      }
      
      const state = cb.getState();
      expect(state.state).toBe(CircuitState.OPEN);
      expect(state.failures).toBe(3);
    });
    
    it('debe bloquear llamadas cuando está OPEN', async () => {
      // Causar 3 fallos
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => {
          throw new Error('fail');
        }).catch(() => {});
      }
      
      // Siguiente llamada debe ser bloqueada
      await expect(
        cb.execute(async () => 'should not execute')
      ).rejects.toThrow('Circuit breaker "test-breaker" is OPEN');
    });
    
    it('debe resetear contador de fallos después de éxito', async () => {
      // 2 fallos
      await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      
      let state = cb.getState();
      expect(state.failures).toBe(2);
      
      // 1 éxito debe resetear
      await cb.execute(async () => 'success');
      
      state = cb.getState();
      expect(state.failures).toBe(0);
    });
  });
  
  describe('Estado HALF_OPEN', () => {
    it('debe transicionar de OPEN a HALF_OPEN después de timeout', async () => {
      // Causar 3 fallos para abrir
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => {
          throw new Error('fail');
        }).catch(() => {});
      }
      
      expect(cb.getState().state).toBe(CircuitState.OPEN);
      
      // Esperar timeout (1 segundo)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Siguiente llamada debe transicionar a HALF_OPEN
      const promise = cb.execute(async () => 'test');
      
      // Durante ejecución debería estar en HALF_OPEN
      // (esto es difícil de testear sin race conditions)
      
      await promise;
    });
    
    it('debe cerrar después de successThreshold éxitos en HALF_OPEN', async () => {
      // Abrir circuito
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => {
          throw new Error('fail');
        }).catch(() => {});
      }
      
      // Esperar timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // 2 éxitos (successThreshold = 2)
      await cb.execute(async () => 'success1');
      await cb.execute(async () => 'success2');
      
      const state = cb.getState();
      expect(state.state).toBe(CircuitState.CLOSED);
      expect(state.successes).toBe(0); // Reset después de cerrar
    });
    
    it('debe volver a OPEN si falla en HALF_OPEN', async () => {
      // Abrir circuito
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => {
          throw new Error('fail');
        }).catch(() => {});
      }
      
      // Esperar timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Intentar y fallar en HALF_OPEN
      await cb.execute(async () => {
        throw new Error('fail again');
      }).catch(() => {});
      
      const state = cb.getState();
      expect(state.state).toBe(CircuitState.OPEN);
    });
  });
  
  describe('Reset manual', () => {
    it('debe resetear completamente el circuit breaker', async () => {
      // Abrir circuito
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => {
          throw new Error('fail');
        }).catch(() => {});
      }
      
      expect(cb.getState().state).toBe(CircuitState.OPEN);
      
      // Reset manual
      cb.reset();
      
      const state = cb.getState();
      expect(state.state).toBe(CircuitState.CLOSED);
      expect(state.failures).toBe(0);
      expect(state.successes).toBe(0);
      
      // Debe poder ejecutar normalmente
      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
    });
  });
});
