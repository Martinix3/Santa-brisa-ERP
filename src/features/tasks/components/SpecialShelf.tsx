"use client";

import type { TaskNew } from "@/domain/ssot";
import { Star, AlertTriangle } from "lucide-react";
import { DEPT_META } from "@/domain/ssot";

interface SpecialShelfProps {
  title: string;
  emoji: string;
  items: TaskNew[];
  onTaskClick?: (task: TaskNew) => void;
}

export function SpecialShelf({ title, emoji, items, onTaskClick }: SpecialShelfProps) {
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          {title}
        </h3>
        <span className="sb-badge sb-badge--primary">{items.length}</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.slice(0, 9).map((task) => {
          const deptMeta = DEPT_META[task.department];
          
          return (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="sb-card hover-raise cursor-pointer transition-all"
            >
              <div className="sb-card__header flex items-center justify-between pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {task.isPriority && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                      <Star className="w-3 h-3 fill-current" />
                      PRIO
                    </span>
                  )}
                  {task.slaBucket === "OVERDUE" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                      <AlertTriangle className="w-3 h-3" />
                      VENCIDA
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {task.dueAt
                      ? new Date(task.dueAt).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })
                      : "Sin fecha"}
                  </span>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: deptMeta.color,
                    color: deptMeta.textColor,
                  }}
                >
                  {deptMeta.label}
                </span>
              </div>

              <div className="sb-card__content space-y-2">
                <div className="font-medium text-sm line-clamp-2">{task.title}</div>
                
                {task.desc && (
                  <div className="text-xs text-gray-600 line-clamp-2">
                    {task.desc}
                  </div>
                )}

                {task.progress !== undefined && task.progress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progreso</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {task.priority && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        task.priority === "URGENT"
                          ? "bg-red-100 text-red-700"
                          : task.priority === "HIGH"
                          ? "bg-orange-100 text-orange-700"
                          : task.priority === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {task.priority}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 9 && (
        <div className="text-center text-sm text-muted-foreground">
          Y {items.length - 9} más...
        </div>
      )}
    </section>
  );
}
