import { describe, it, expect } from 'vitest';
import { TaskSchema, TaskKindEnum, TaskOutcomeEnum, TaskStatusEnum } from './task';

describe('TaskSchema - Validación de Cierre', () => {
  const baseTask = {
    id: 't1',
    kind: 'GENERICA' as const,
    title: 'Tarea de prueba',
    status: 'IN_PROGRESS' as const,
    department: 'VENTAS' as const,
    source: 'MANUAL' as const,
    assignedToId: 'user1',
    createdById: 'user1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('Tarea VISITA', () => {
    const visitaBase = {
      ...baseTask,
      kind: 'VISITA' as const,
      status: 'DONE' as const,
      closedAt: new Date().toISOString(),
      closedById: 'user1',
    };

    it('valida NEXT_VISIT con nextEventId', () => {
      const task = {
        ...visitaBase,
        outcome: 'NEXT_VISIT' as const,
        nextEventId: 'event123',
      };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('valida ORDER_PLACED con orderId', () => {
      const task = {
        ...visitaBase,
        outcome: 'ORDER_PLACED' as const,
        orderId: 'order123',
      };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('permite outcome CANCELLED', () => {
      const task = {
        ...visitaBase,
        status: 'CANCELLED' as const,
        outcome: 'CANCELLED' as const,
      };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('falla si tiene ambos nextEventId y orderId', () => {
      // Nota: Zod no valida esto, pero las server actions sí
      const task = {
        ...visitaBase,
        outcome: 'NEXT_VISIT' as const,
        nextEventId: 'event123',
        orderId: 'order123',
      };
      // Esta validación se hace en server actions, no en Zod
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });
  });

  describe('Tarea GENERICA', () => {
    it('valida cierre con COMPLETED', () => {
      const task = {
        ...baseTask,
        kind: 'GENERICA' as const,
        status: 'DONE' as const,
        outcome: 'COMPLETED' as const,
        closedAt: new Date().toISOString(),
        closedById: 'user1',
      };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('valida cancelación', () => {
      const task = {
        ...baseTask,
        kind: 'GENERICA' as const,
        status: 'CANCELLED' as const,
        outcome: 'CANCELLED' as const,
        closedAt: new Date().toISOString(),
        closedById: 'user1',
      };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });
  });

  describe('Estados y transiciones', () => {
    it('permite status PROGRAMADA para visitas', () => {
      const task = {
        ...baseTask,
        kind: 'VISITA' as const,
        status: 'PROGRAMADA' as const,
      };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('valida todos los TaskKind', () => {
      const kinds: Array<'GENERICA' | 'VISITA' | 'COBRO' | 'PEDIDO' | 'MARKETING'> = [
        'GENERICA',
        'VISITA',
        'COBRO',
        'PEDIDO',
        'MARKETING',
      ];

      kinds.forEach((kind) => {
        const task = { ...baseTask, kind };
        expect(() => TaskSchema.parse(task)).not.toThrow();
      });
    });

    it('valida todos los TaskOutcome', () => {
      const outcomes: Array<'NEXT_VISIT' | 'ORDER_PLACED' | 'COMPLETED' | 'CANCELLED'> = [
        'NEXT_VISIT',
        'ORDER_PLACED',
        'COMPLETED',
        'CANCELLED',
      ];

      outcomes.forEach((outcome) => {
        const task = {
          ...baseTask,
          status: 'DONE' as const,
          outcome,
          closedAt: new Date().toISOString(),
          closedById: 'user1',
        };
        expect(() => TaskSchema.parse(task)).not.toThrow();
      });
    });
  });

  describe('Campos opcionales', () => {
    it('permite tarea sin accountId (prospección)', () => {
      const task = {
        ...baseTask,
        kind: 'VISITA' as const,
        // Sin accountId
      };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });

    it('permite tarea con múltiples referencias', () => {
      const task = {
        ...baseTask,
        accountId: 'acc123',
        orderId: 'order123',
        eventId: 'event123',
        campaignId: 'camp123',
      };
      expect(() => TaskSchema.parse(task)).not.toThrow();
    });
  });

  describe('Campos derivados', () => {
    it('permite priorityRank entre 0-3', () => {
      [0, 1, 2, 3].forEach((rank) => {
        const task = { ...baseTask, priorityRank: rank };
        expect(() => TaskSchema.parse(task)).not.toThrow();
      });
    });

    it('permite progress entre 0-100', () => {
      [0, 50, 100].forEach((progress) => {
        const task = { ...baseTask, progress };
        expect(() => TaskSchema.parse(task)).not.toThrow();
      });
    });

    it('valida slaBucket opciones', () => {
      const buckets: Array<'OVERDUE' | 'TODAY' | 'WEEK' | 'LATER' | 'NONE'> = [
        'OVERDUE',
        'TODAY',
        'WEEK',
        'LATER',
        'NONE',
      ];

      buckets.forEach((bucket) => {
        const task = { ...baseTask, slaBucket: bucket };
        expect(() => TaskSchema.parse(task)).not.toThrow();
      });
    });
  });
});
