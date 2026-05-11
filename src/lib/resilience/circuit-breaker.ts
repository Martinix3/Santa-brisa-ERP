/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

/**
 * Circuit Breaker - Patrón de resiliencia para APIs externas
 * 
 * Estados:
 * - CLOSED: Funcionamiento normal
 * - OPEN: Bloqueando llamadas (API caída)
 * - HALF_OPEN: Probando si API se recuperó
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Fallos antes de abrir
  successThreshold: number;    // Éxitos para cerrar desde HALF_OPEN
  timeout: number;             // Tiempo en OPEN (ms)
  monitoringPeriod: number;    // Ventana de monitoreo (ms)
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  
  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}
  
  /**
   * Ejecuta una función protegida por el circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Si está OPEN, verificar si podemos intentar de nuevo
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker "${this.name}" is OPEN. Try again in ${Math.ceil((this.nextAttemptTime - Date.now()) / 1000)}s`);
      }
      // Transición a HALF_OPEN para probar
      this.state = CircuitState.HALF_OPEN;
      console.log(`[CircuitBreaker] ${this.name} transitioning to HALF_OPEN`);
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Maneja un éxito
   */
  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        console.log(`[CircuitBreaker] ${this.name} CLOSED (recovered)`);
      }
    }
  }
  
  /**
   * Maneja un fallo
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    // Si estábamos en HALF_OPEN, volvemos a OPEN inmediatamente
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.timeout;
      this.successes = 0;
      console.warn(`[CircuitBreaker] ${this.name} OPEN (half-open failed)`);
      return;
    }
    
    // Si llegamos al threshold, abrir circuito
    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.timeout;
      console.warn(`[CircuitBreaker] ${this.name} OPEN (threshold: ${this.failures}/${this.config.failureThreshold})`);
    }
  }
  
  /**
   * Obtiene el estado actual
   */
  getState(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime || null,
      nextAttemptTime: this.state === CircuitState.OPEN ? this.nextAttemptTime : null
    };
  }
  
  /**
   * Resetea el circuit breaker manualmente
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    console.log(`[CircuitBreaker] ${this.name} manually reset`);
  }
}

// Instancia global para Gemini API
export const geminiCircuitBreaker = new CircuitBreaker('gemini-api', {
  failureThreshold: 5,      // 5 fallos seguidos
  successThreshold: 2,       // 2 éxitos para recuperar
  timeout: 60000,            // 1 minuto en OPEN
  monitoringPeriod: 10000    // Ventana de 10 segundos
});
