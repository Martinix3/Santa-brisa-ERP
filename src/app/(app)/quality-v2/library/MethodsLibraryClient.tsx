"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAnalysisMethod, createAnalysisParameter } from "@/server/actions/analysis-library.actions";
import type { AnalysisMethod, AnalysisParameter } from "@/domain/ssot-v2-plus-schemas";
import { validateSchema, AnalysisMethodSchema, AnalysisParameterSchema } from "@/domain/ssot-v2-plus-schemas";
import { toast } from "sonner";

type Props = {
  methods: AnalysisMethod[];
  parameters: AnalysisParameter[];
};

export function MethodsLibraryClient({ methods = [], parameters = [] }: Props) {
  const router = useRouter();
  const [mName, setMName] = useState("");
  const [pName, setPName] = useState("");
  const [isCreatingMethod, setIsCreatingMethod] = useState(false);
  const [isCreatingParameter, setIsCreatingParameter] = useState(false);

  return (
    <main className="p-4 md:p-6 space-y-5">
      <header className="sb-header-glass p-5">
        <h1>Biblioteca de Métodos</h1>
        <p className="text-muted-foreground">Gestión de métodos y parámetros de análisis</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="sb-card-glass-light p-5 space-y-4">
          <h3 className="font-semibold">Métodos de Análisis</h3>
          <div className="flex gap-2">
            <input 
              className="sb-input" 
              placeholder="Nombre método…" 
              value={mName} 
              onChange={e=>setMName(e.target.value)} 
            />
            <button 
              className="sb-btn--primary" 
              disabled={isCreatingMethod}
              onClick={async ()=>{ 
                if (!mName.trim()) {
                  toast.error("El nombre del método es requerido");
                  return;
                }
                
                setIsCreatingMethod(true);
                
                try {
                  const methodData = { 
                    name: mName.trim(), 
                    code: mName.trim().toUpperCase(),
                    isCriticalByDefault: false
                  };
                  
                  // Validación básica client-side
                  if (methodData.code.length < 2) {
                    toast.error("El código debe tener al menos 2 caracteres");
                    return;
                  }
                  
                  const result = await createAnalysisMethod(methodData, "system");
                  
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  
                  toast.success("Método creado correctamente");
                  setMName("");
                  
                  // Refrescar la página para mostrar el nuevo método
                  router.refresh();
                } finally {
                  setIsCreatingMethod(false);
                }
              }}
            >
              {isCreatingMethod ? "Añadiendo..." : "Añadir"}
            </button>
          </div>

          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m)=>(
                  <tr key={m.id} className="hover:bg-secondary/30">
                    <td className="font-medium">{m.code}</td>
                    <td>{m.name}</td>
                    <td>
                      <span className="sb-badge--success">{m.status}</span>
                    </td>
                  </tr>
                ))}
                {methods.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-sm text-muted-foreground">
                      No hay métodos registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sb-card-glass-light p-5 space-y-4">
          <h3 className="font-semibold">Parámetros de Análisis</h3>
          <div className="flex gap-2">
            <input 
              className="sb-input" 
              placeholder="Nombre parámetro…" 
              value={pName} 
              onChange={e=>setPName(e.target.value)} 
            />
            <button 
              className="sb-btn--primary" 
              disabled={isCreatingParameter}
              onClick={async ()=>{
                if (!pName.trim()) {
                  toast.error("El nombre del parámetro es requerido");
                  return;
                }
                
                if (!methods[0]?.id) {
                  toast.error("Debe existir al menos un método primero");
                  return;
                }
                
                setIsCreatingParameter(true);
                
                try {
                  const paramData = { 
                    name: pName.trim(), 
                    code: pName.trim().toUpperCase(), 
                    methodId: methods[0].id, 
                    isCritical: false 
                  };
                  
                  const result = await createAnalysisParameter(paramData, "system");
                  
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  
                  toast.success("Parámetro creado correctamente");
                  setPName("");
                  
                  // Refrescar la página para mostrar el nuevo parámetro
                  router.refresh();
                } finally {
                  setIsCreatingParameter(false);
                }
              }}
            >
              {isCreatingParameter ? "Añadiendo..." : "Añadir"}
            </button>
          </div>

          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Unidad</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map((p)=>(
                  <tr key={p.id} className="hover:bg-secondary/30">
                    <td className="font-medium">{p.code}</td>
                    <td>{p.name}</td>
                    <td className="text-sm text-muted-foreground">{p.unit || "-"}</td>
                  </tr>
                ))}
                {parameters.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-sm text-muted-foreground">
                      No hay parámetros registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
