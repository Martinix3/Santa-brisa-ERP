"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useData } from "@/lib/dataprovider";
import { createTask } from "@/features/tasks/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Save, X } from "lucide-react";
import Link from "next/link";
import { UserSelector } from "@/features/tasks/components/UserSelector";

export default function NewTaskPage() {
  const { currentUser, data } = useData();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    desc: "",
    status: "BACKLOG" as const,
    priority: "MEDIUM" as const,
    department: "PERSONAL" as const,
    dueAt: "",
    assignedToId: currentUser?.id || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!currentUser?.id) {
      alert("Usuario no autenticado");
      return;
    }

    if (!formData.title.trim()) {
      alert("El título es requerido");
      return;
    }

    setLoading(true);

    try {
      const result = await createTask({
        title: formData.title,
        desc: formData.desc || undefined,
        status: formData.status,
        priority: formData.priority,
        department: formData.department,
        source: "MANUAL",
        dueAt: formData.dueAt || undefined,
        assignedToId: formData.assignedToId || currentUser.id,
        createdById: currentUser.id,
      });

      if (result.ok) {
        router.push("/calendario");
      } else {
        alert(result.error || "Error al crear la tarea");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al crear la tarea");
    } finally {
      setLoading(false);
    }
  }

  const users = data?.users || [];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header Glass */}
      <div className="sb-header-glass p-5 md:p-6">
        <div className="flex items-center gap-4">
          <Link href="/calendario">
            <button className="h-10 w-10 rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 hover:scale-105 transition-all">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Nueva Tarea</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-5">
        {/* Título y Descripción */}
        <div className="sb-card-glass-light p-5 space-y-4">
          <div>
            <label className="sb-label">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ej: Llamar a cliente importante"
              className="sb-input"
              required
            />
          </div>

          <div>
            <label className="sb-label">
              Descripción
            </label>
            <textarea
              value={formData.desc}
              onChange={(e) =>
                setFormData({ ...formData, desc: e.target.value })
              }
              placeholder="Detalles adicionales..."
              className="sb-textarea"
            />
          </div>
        </div>

        {/* Departamento (Visual con colores) */}
        <div className="sb-card-glass-light p-5">
          <label className="sb-label mb-3">Departamento</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: 'PERSONAL', label: 'Personal' },
              { value: 'VENTAS', label: 'Ventas' },
              { value: 'MARKETING', label: 'Marketing' },
              { value: 'LOGISTICA', label: 'Logística' },
              { value: 'PRODUCCION', label: 'Producción' },
              { value: 'CALIDAD', label: 'Calidad' },
              { value: 'FINANZAS', label: 'Finanzas' },
              { value: 'ADMIN', label: 'Admin' },
            ].map((dept) => {
              const isSelected = formData.department === dept.value;
              return (
                <button
                  key={dept.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, department: dept.value as any })}
                  className={`dept-${dept.value} relative p-3 rounded-xl border-2 transition-all hover:scale-105 text-sm font-medium`}
                  style={{
                    backgroundColor: `rgb(var(--dept-bg) / ${isSelected ? '0.9' : '0.6'})`,
                    borderColor: `rgb(var(--dept-border) / ${isSelected ? '0.8' : '0.4'})`,
                    color: `rgb(var(--dept-text))`,
                  }}
                >
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  {dept.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Estado y Prioridad */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="sb-card-glass-subtle p-5">
            <label className="sb-label">Estado</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as any,
                })
              }
              className="sb-select"
            >
              <option value="BACKLOG">Backlog</option>
              <option value="DRAFT">Borrador</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="BLOCKED">Bloqueada</option>
              <option value="DONE">Completada</option>
            </select>
          </div>

          <div className="sb-card-glass-subtle p-5">
            <label className="sb-label">Prioridad</label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as any,
                })
              }
              className="sb-select"
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>
        </div>

        {/* Fecha límite */}
        <div className="sb-card-glass-subtle p-5">
          <label className="sb-label">Fecha límite</label>
          <input
            type="date"
            value={formData.dueAt}
            onChange={(e) =>
              setFormData({ ...formData, dueAt: e.target.value })
            }
            className="sb-input"
          />
        </div>

        {/* User Selector */}
        {users.length > 0 && (
          <div className="sb-card-glass-light p-5">
            <UserSelector
              users={users}
              selectedUserId={formData.assignedToId}
              onSelect={(userId) => setFormData({ ...formData, assignedToId: userId })}
              currentUserRole={currentUser?.role}
              disabled={loading}
            />
          </div>
        )}

        {/* Actions */}
        <div className="sb-card-glass-light p-5">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {loading ? "Creando..." : "Crear Tarea"}
            </button>
            <Link href="/calendario" className="flex-shrink-0">
              <button
                type="button"
                className="h-11 px-5 rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm text-sm font-medium hover:bg-background/80 hover:scale-105 transition-all flex items-center gap-2"
              >
                <X size={18} />
                Cancelar
              </button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
