"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { Check, Plus, Trash2, GripVertical } from "lucide-react";
import type { TaskSubtask } from "@/domain/ssot";
import { SBButton, Input } from "@/components/ui/ui-primitives";

interface TaskChecklistProps {
  subtasks: TaskSubtask[];
  onToggle: (subtaskId: string, completed: boolean) => void;
  onAdd: (title: string) => void;
  onDelete: (subtaskId: string) => void;
  disabled?: boolean;
}

export function TaskChecklist({
  subtasks,
  onToggle,
  onAdd,
  onDelete,
  disabled = false,
}: TaskChecklistProps) {
  const [newItemTitle, setNewItemTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  function handleAdd() {
    if (!newItemTitle.trim()) return;
    
    onAdd(newItemTitle.trim());
    setNewItemTitle("");
    setIsAdding(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleAdd();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewItemTitle("");
    }
  }

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>
              {completedCount} / {totalCount} completadas
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtasks List */}
      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
              subtask.completed
                ? "bg-gray-50 border-gray-200"
                : "bg-white border-gray-300 hover:bg-gray-50"
            }`}
          >
            {/* Drag Handle (visual only for now) */}
            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab flex-shrink-0" />

            {/* Checkbox */}
            <button
              onClick={() => onToggle(subtask.id, !subtask.completed)}
              disabled={disabled}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                subtask.completed
                  ? "bg-blue-500 border-blue-500"
                  : "border-gray-300 hover:border-blue-400"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {subtask.completed && <Check className="w-3 h-3 text-white" />}
            </button>

            {/* Title */}
            <span
              className={`flex-1 text-sm ${
                subtask.completed
                  ? "line-through text-gray-500"
                  : "text-gray-900"
              }`}
            >
              {subtask.title}
            </span>

            {/* Delete Button */}
            <button
              onClick={() => onDelete(subtask.id)}
              disabled={disabled}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Item */}
      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nueva subtarea..."
            className="sb-input flex-1"
            autoFocus
          />
          <SBButton
            data-variant="primary"
            onClick={handleAdd}
            disabled={!newItemTitle.trim()}
          >
            Añadir
          </SBButton>
          <SBButton
            data-variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewItemTitle("");
            }}
          >
            Cancelar
          </SBButton>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          disabled={disabled}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir subtarea
        </button>
      )}
    </div>
  );
}
