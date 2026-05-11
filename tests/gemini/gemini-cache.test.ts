/**
 * Tests para GeminiCache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiCache } from '@/lib/cache/gemini-cache';

describe('GeminiCache', () => {
  let cache: GeminiCache;
  
  beforeEach(() => {
    cache = new GeminiCache(10); // Small cache para testing
  });
  
  describe('get/set básico', () => {
    it('debe retornar null para key inexistente', async () => {
      const result = await cache.get('test-prompt', { foo: 'bar' });
      expect(result).toBeNull();
    });
    
    it('debe guardar y recuperar valor', async () => {
      const prompt = 'test prompt';
      const context = { user: 'user123' };
      const data = { result: 'test result' };
      
      await cache.set(prompt, context, data);
      const retrieved = await cache.get(prompt, context);
      
      expect(retrieved).toEqual(data);
    });
    
    it('debe generar misma key para mismo prompt y contexto', async () => {
      const prompt = 'test';
      const context = { a: 1, b: 2 };
      const data1 = { value: 'first' };
      const data2 = { value: 'second' };
      
      await cache.set(prompt, context, data1);
      await cache.set(prompt, context, data2); // Sobrescribe
      
      const result = await cache.get(prompt, context);
      expect(result).toEqual(data2);
    });
    
    it('debe generar diferentes keys para diferentes contextos', async () => {
      const prompt = 'test';
      const context1 = { user: 'user1' };
      const context2 = { user: 'user2' };
      const data1 = { value: 1 };
      const data2 = { value: 2 };
      
      await cache.set(prompt, context1, data1);
      await cache.set(prompt, context2, data2);
      
      const result1 = await cache.get(prompt, context1);
      const result2 = await cache.get(prompt, context2);
      
      expect(result1).toEqual(data1);
      expect(result2).toEqual(data2);
    });
  });
  
  describe('TTL (Time To Live)', () => {
    it('debe expirar entrada después de TTL', async () => {
      const prompt = 'test';
      const context = { foo: 'bar' };
      const data = { value: 'test' };
      
      // TTL de 1 segundo
      await cache.set(prompt, context, data, 1);
      
      // Inmediatamente debe estar disponible
      let result = await cache.get(prompt, context, 1);
      expect(result).toEqual(data);
      
      // Esperar 1.5 segundos
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Debe haber expirado
      result = await cache.get(prompt, context, 1);
      expect(result).toBeNull();
    });
    
    it('debe respetar diferentes TTLs', async () => {
      const prompt = 'test';
      const context1 = { id: 1 };
      const context2 = { id: 2 };
      
      await cache.set(prompt, context1, { value: 1 }, 1); // 1 segundo
      await cache.set(prompt, context2, { value: 2 }, 10); // 10 segundos
      
      // Esperar 1.5 segundos
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result1 = await cache.get(prompt, context1, 1);
      const result2 = await cache.get(prompt, context2, 10);
      
      expect(result1).toBeNull(); // Expirado
      expect(result2).toEqual({ value: 2 }); // Aún válido
    });
  });
  
  describe('Estadísticas', () => {
    it('debe trackear hits y misses', async () => {
      const prompt = 'test';
      const context = { foo: 'bar' };
      
      // Miss
      await cache.get(prompt, context);
      
      // Set
      await cache.set(prompt, context, { value: 'test' });
      
      // Hit
      await cache.get(prompt, context);
      
      // Miss (contexto diferente)
      await cache.get(prompt, { foo: 'baz' });
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(33.33, 1);
    });
    
    it('debe reportar tamaño correcto', async () => {
      await cache.set('prompt1', { id: 1 }, { value: 1 });
      await cache.set('prompt2', { id: 2 }, { value: 2 });
      await cache.set('prompt3', { id: 3 }, { value: 3 });
      
      const stats = cache.getStats();
      expect(stats.size).toBe(3);
      expect(stats.maxSize).toBe(10);
    });
  });
  
  describe('Clear', () => {
    it('debe limpiar todo el cache', async () => {
      await cache.set('p1', { id: 1 }, { v: 1 });
      await cache.set('p2', { id: 2 }, { v: 2 });
      
      let stats = cache.getStats();
      expect(stats.size).toBe(2);
      
      cache.clear();
      
      stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
  
  describe('LRU Eviction', () => {
    it('debe permitir agregar nuevas entradas cuando está lleno', async () => {
      const smallCache = new GeminiCache(3); // Máximo 3 entradas
      
      await smallCache.set('p1', { id: 1 }, { v: 1 });
      await smallCache.set('p2', { id: 2 }, { v: 2 });
      await smallCache.set('p3', { id: 3 }, { v: 3 });
      
      // Cache lleno (3/3)
      let stats = smallCache.getStats();
      expect(stats.size).toBe(3);
      
      // Agregar una cuarta (LRU hará evict automáticamente)
      await smallCache.set('p4', { id: 4 }, { v: 4 });
      
      // La cuarta entrada debe estar disponible
      const result = await smallCache.get('p4', { id: 4 });
      expect(result).toEqual({ v: 4 });
    });
  });
});
