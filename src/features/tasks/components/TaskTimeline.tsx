"use client";

import { useState } from "react";
import { MessageSquare, Clock, User, ArrowRight, CheckCircle2, Star, Calendar } from "lucide-react";
import type { TaskActivity } from "@/domain/ssot";
import { SBButton, Input } from "@/components/ui/ui-primitives";

interface TaskTimelineProps {
  activities: TaskActivity[];
  onAddComment: (comment: string) => void;
  disabled?: boolean;
}

export function TaskTimeline({
  activities,
  onAddComment,
  disabled = false,
}: TaskTimelineProps) {
  const [newComment, setNewComment] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  function handleAddComment() {
    if (!newComment.trim()) return;
    
    onAddComment(newComment.trim());
    setNewComment("");
    setIsAdding(false);
  }

  function getActivityIcon(kind: TaskActivity["kind"]) {
    switch (kind) {
      case "COMMENT":
        return <MessageSquare className="w-4 h-4" />;
      case "STATUS_CHANGE":
        return <ArrowRight className="w-4 h-4" />;
      case "ASSIGNMENT_CHANGE":
        return <User className="w-4 h-4" />;
      case "PRIORITY_CHANGE":
        return <Star className="w-4 h-4" />;
      case "DUE_DATE_CHANGE":
        return <Calendar className="w-4 h-4" />;
      case "SUBTASK_COMPLETED":
        return <CheckCircle2 className="w-4 h-4" />;
      case "CREATED":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  }

  function getActivityText(activity: TaskActivity): string {
    switch (activity.kind) {
      case "COMMENT":
        return activity.comment || "";
      case "STATUS_CHANGE":
        return `cambió el estado de ${activity.metadata?.from || "?"} a ${activity.metadata?.to || "?"}`;
      case "ASSIGNMENT_CHANGE":
        return `reasignó la tarea a ${activity.metadata?.to || "otro usuario"}`;
      case "PRIORITY_CHANGE":
        return `cambió la prioridad a ${activity.metadata?.to || "?"}`;
      case "DUE_DATE_CHANGE":
        return activity.metadata?.to
          ? `estableció la fecha límite: ${new Date(activity.metadata.to).toLocaleDateString()}`
          : "eliminó la fecha límite";
      case "SUBTASK_ADDED":
        return `añadió subtarea: "${(activity.metadata as any)?.subtaskTitle || ""}"`;
      case "SUBTASK_COMPLETED":
        return `completó subtarea: "${(activity.metadata as any)?.subtaskTitle || ""}"`;
      case "CREATED":
        return "creó esta tarea";
      default:
        return "realizó una acción";
    }
  }

  function getActivityColor(kind: TaskActivity["kind"]): string {
    switch (kind) {
      case "COMMENT":
        return "bg-blue-100 text-blue-600";
      case "STATUS_CHANGE":
        return "bg-green-100 text-green-600";
      case "ASSIGNMENT_CHANGE":
        return "bg-purple-100 text-purple-600";
      case "PRIORITY_CHANGE":
        return "bg-orange-100 text-orange-600";
      case "SUBTASK_COMPLETED":
        return "bg-green-100 text-green-600";
      case "CREATED":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  }

  function formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins}min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  return (
    <div className="space-y-4">
      {/* Add Comment Form */}
      <div className="space-y-2">
        <label className="sb-label">Añadir comentario</label>
        {isAdding ? (
          <div className="space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="sb-textarea min-h-[80px]"
              autoFocus
            />
            <div className="flex gap-2">
              <SBButton
                data-variant="primary"
                onClick={handleAddComment}
                disabled={!newComment.trim() || disabled}
              >
                Comentar
              </SBButton>
              <SBButton
                data-variant="ghost"
                onClick={() => {
                  setIsAdding(false);
                  setNewComment("");
                }}
              >
                Cancelar
              </SBButton>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            disabled={disabled}
            className="w-full text-left px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-500 hover:border-blue-400 hover:text-gray-700 transition-colors"
          >
            Escribe un comentario...
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <label className="sb-label">Actividad ({activities.length})</label>
        
        {activities.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No hay actividad aún
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activities.map((activity, index) => {
              const isComment = activity.kind === "COMMENT";
              const colorClass = getActivityColor(activity.kind);

              return (
                <div key={activity.id} className="flex gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    {getActivityIcon(activity.kind)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {activity.userName || "Usuario"}
                      </span>
                      {!isComment && (
                        <span className="text-sm text-gray-600">
                          {getActivityText(activity)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(activity.createdAt)}
                      </span>
                    </div>
                    
                    {isComment && activity.comment && (
                      <div className="mt-1 text-sm text-gray-700 bg-gray-50 rounded-md p-2 border border-gray-200">
                        {activity.comment}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
