"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import React, { useEffect, useState } from "react";
import { useData } from "@/lib/dataprovider";
import { CalendarioContent } from "@/components/tasks/CalendarioContent";
import { getTasksWithKPIs } from "@/features/tasks/actions";
import type { TaskWithKPIs, TasksKPIs } from "@/types/tasks";

export default function CalendarioPage() {
  const { currentUser } = useData();
  const [tasks, setTasks] = useState<TaskWithKPIs[]>([]);
  const [kpis, setKpis] = useState<TasksKPIs>({
    total: 0,
    today: 0,
    thisWeek: 0,
    overdue: 0,
    priority: 0,
    byStatus: { BACKLOG: 0, IN_PROGRESS: 0, DONE: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
      loadData();
    }
  }, [currentUser?.id]);

  async function loadData() {
    if (!currentUser?.id) return;
    
    setLoading(true);
    try {
      const data = await getTasksWithKPIs(currentUser.id);
      setTasks(data.tasks);
      setKpis(data.kpis);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!currentUser) {
    return (
      <div className="p-4 md:p-6">
        <div className="sb-card-glass-light p-12 text-center">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-5">
        <div className="sb-header-glass p-4 md:p-5 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i: number) => (
            <div key={i} className="sb-card-glass-light p-5">
              <div className="h-6 bg-gray-200 rounded mb-4" />
              <div className="space-y-2">
                {[...Array(3)].map((__, j) => (
                  <div key={j} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <CalendarioContent tasks={tasks} kpis={kpis} userId={currentUser.id} />;
}
