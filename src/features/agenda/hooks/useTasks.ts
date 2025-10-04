// src/features/agenda/hooks/useTasks.ts
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// === TIPOS ===
export interface Task {
  id: string;
  title: string;
  dueAt: string;
  priority: number;
  dept: string;
  accountId?: string;
  accountName?: string;
  status: 'open' | 'done';
  tags?: string[];
  source?: string;
  assigneeName?: string;
}

export interface TaskAggregates {
  overdue: number;
  next: number;
  byDay: Record<string, number>; // YYYY-MM-DD -> count
}

export interface TaskApiResponse {
  tasks: Task[];
  aggregates: TaskAggregates;
  meta: {
    generatedAt: string;
    filtersEcho: Record<string, any>;
    nextCursor: string | null;
  };
}

export type TaskFilters = {
  from?: string;
  to?: string;
  dept?: string;
  mine?: boolean;
  assignees?: string[];
  accountId?: string;
  status?: 'open' | 'done' | 'all';
  source?: string[];
  hasAccount?: boolean;
  q?: string;
  view?: 'day' | 'week' | 'month';
  tz?: string;
  limit?: number;
  cursor?: string;
};

const FILTERS_KEY = 'sb_tasks_filters';

// === HOOK ===

export function useTasks() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousFiltersRef = useRef<TaskFilters>({});

  const [filters, setFilters] = useState<TaskFilters>(() => {
    // 1. Cargar desde querystring
    const params = new URLSearchParams(searchParams.toString());
    const queryFilters: Record<string, any> = {};
    params.forEach((value, key) => {
        if (key.endsWith('[]')) {
            const cleanKey = key.slice(0, -2);
            if (!queryFilters[cleanKey]) queryFilters[cleanKey] = [];
            queryFilters[cleanKey].push(value);
        } else {
            queryFilters[key] = value;
        }
    });

    if (Object.keys(queryFilters).length > 0) return queryFilters;

    // 2. Fallback a localStorage
    if (typeof window !== 'undefined') {
        try {
            const saved = localStorage.getItem(FILTERS_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error("Failed to parse filters from localStorage", e); }
    }
    
    // 3. Default
    return { view: 'week', status: 'open' };
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [aggregates, setAggregates] = useState<TaskAggregates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Efecto para sincronizar filtros con URL y localStorage
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, v));
        } else {
          params.set(key, String(value));
        }
      }
    });

    const query = params.toString();
    // Use replace para no añadir al historial del navegador
    router.replace(`${pathname}?${query}`);

    if (typeof window !== 'undefined') {
        localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    }
    
    // Telemetry
    if (JSON.stringify(previousFiltersRef.current) !== JSON.stringify(filters)) {
      console.info('[useTasks] task_filter_changed', {
          changed: Object.fromEntries(Object.entries(filters).filter(([key, value]) => (previousFiltersRef.current as any)[key] !== value)),
          newFilters: filters 
      });
      previousFiltersRef.current = filters;
    }

  }, [filters, pathname, router]);

  // Efecto para hacer fetch de los datos cuando cambian los filtros
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(`${key}[]`, v));
          } else {
            params.set(key, String(value));
          }
        }
      });
      // Telemetría mínima
      console.info(`[useTasks] view_loaded`, { filters, view: filters.view });

      try {
        const res = await fetch(`/api/tasks?${params.toString()}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data: TaskApiResponse = await res.json();
        setTasks(data.tasks);
        setAggregates(data.aggregates);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch tasks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]); // Dependencia en el objeto de filtros serializado para detectar cambios

  return { filters, setFilters, tasks, aggregates, isLoading, error };
}
