"use client";

import { useState, useCallback } from "react";
import type { TaskNew } from "@/domain/ssot";
import { createTask, updateTask } from "@/features/tasks/actions";

interface OptimisticTask extends TaskNew {
  _optimistic?: boolean;
  _failed?: boolean;
  _retrying?: boolean;
}

export function useOptimisticTasks(initialTasks: TaskNew[]) {
  const [tasks, setTasks] = useState<OptimisticTask[]>(initialTasks);
  const [retryQueue, setRetryQueue] = useState<Map<string, () => Promise<void>>>(new Map());

  const generateTmpId = () => `tmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addTaskOptimistic = useCallback(async (taskData: Partial<TaskNew>) => {
    const tmpId = generateTmpId();
    
    // Add optimistic task immediately
    const optimisticTask: OptimisticTask = {
      ...taskData,
      id: tmpId,
      _optimistic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as OptimisticTask;

    setTasks((prev) => [optimisticTask, ...prev]);

    // Try to create in background
    try {
      const result = await createTask(taskData);
      
      if (result.ok && result.task) {
        // Replace tmp with real task
        setTasks((prev) =>
          prev.map((t) => (t.id === tmpId ? result.task! : t))
        );
      } else {
        // Mark as failed
        setTasks((prev) =>
          prev.map((t) =>
            t.id === tmpId ? { ...t, _failed: true, _optimistic: false } : t
          )
        );

        // Add to retry queue
        const retryFn = async () => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === tmpId ? { ...t, _retrying: true, _failed: false } : t
            )
          );

          const retryResult = await createTask(taskData);
          
          if (retryResult.ok && retryResult.task) {
            setTasks((prev) =>
              prev.map((t) => (t.id === tmpId ? retryResult.task! : t))
            );
            setRetryQueue((prev) => {
              const newQueue = new Map(prev);
              newQueue.delete(tmpId);
              return newQueue;
            });
          } else {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === tmpId ? { ...t, _failed: true, _retrying: false } : t
              )
            );
          }
        };

        setRetryQueue((prev) => new Map(prev).set(tmpId, retryFn));
      }
    } catch (error) {
      console.error("Error creating task:", error);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === tmpId ? { ...t, _failed: true, _optimistic: false } : t
        )
      );
    }

    return tmpId;
  }, []);

  const updateTaskOptimistic = useCallback(async (taskId: string, updates: Partial<TaskNew>) => {
    // Store original task for rollback
    const originalTask = tasks.find((t) => t.id === taskId);
    if (!originalTask) return;

    // Apply optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, ...updates, updatedAt: new Date().toISOString(), _optimistic: true }
          : t
      )
    );

    // Try to update in background
    try {
      const result = await updateTask({ id: taskId, ...updates });
      
      if (result.ok && result.task) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? result.task! : t))
        );
      } else {
        // Rollback on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? originalTask : t))
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? originalTask : t))
      );
    }
  }, [tasks]);

  const retryFailed = useCallback(async (taskId: string) => {
    const retryFn = retryQueue.get(taskId);
    if (retryFn) {
      await retryFn();
    }
  }, [retryQueue]);

  const removeFailed = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setRetryQueue((prev) => {
      const newQueue = new Map(prev);
      newQueue.delete(taskId);
      return newQueue;
    });
  }, []);

  const syncTasks = useCallback((newTasks: TaskNew[]) => {
    setTasks(newTasks);
  }, []);

  return {
    tasks,
    addTaskOptimistic,
    updateTaskOptimistic,
    retryFailed,
    removeFailed,
    syncTasks,
    hasFailedTasks: tasks.some((t) => t._failed),
  };
}
