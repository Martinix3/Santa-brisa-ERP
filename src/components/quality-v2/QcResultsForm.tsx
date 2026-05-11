"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useMemo, useState } from "react";

type Param = { id:string; code:string; name:string; unit?:string };
type Plan = { id:string; name:string; parameters:{ parameterId:string }[] };

export function QcResultsForm({
  parameters,
  plans,
  onChange
}:{ parameters: Param[]; plans: Plan[]; onChange:(rows:Array<{parameterId:string; methodId:string; value:number|string; status:"OK"|"FAIL"|"NA"; unit?:string}>)=>void }) {
  const [planId, setPlanId] = useState<string>(plans[0]?.id || "");
  const planParams = useMemo(() => {
    const p = plans.find(p=>p.id===planId);
    const ids = (p?.parameters||[]).map(pp=>pp.parameterId);
    return parameters.filter(param => ids.includes(param.id));
  }, [planId, plans, parameters]);

  const [rows, setRows] = useState<Record<string, { value:string; status:"OK"|"FAIL"|"NA" }>>({});

  const update = (pid:string, patch:Partial<{value:string; status:"OK"|"FAIL"|"NA"}>) => {
    const next = { ...rows, [pid]: { value: rows[pid]?.value || "", status: rows[pid]?.status || "OK", ...patch } };
    setRows(next);
    const out = Object.entries(next).map(([parameterId, r]) => ({
      parameterId,
      methodId: "AUTO",
      value: r.value,
      status: r.status,
      unit: parameters.find(p=>p.id===parameterId)?.unit,
    }));
    onChange(out);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Plan de Calidad</label>
        <select 
          className="sb-select w-full" 
          value={planId} 
          onChange={e=>setPlanId(e.target.value)}
        >
          <option value="">Selecciona plan…</option>
          {plans.map(p=>(<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
      </div>

      <div className="sb-table-wrap">
        <table className="sb-table">
          <thead>
            <tr>
              <th>Parámetro</th>
              <th>Valor</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {planParams.map(p => {
              const r = rows[p.id];
              return (
                <tr key={p.id} className="hover:bg-secondary/30">
                  <td>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.code} {p.unit && <span className="sb-badge--default ml-2">{p.unit}</span>}
                    </div>
                  </td>
                  <td>
                    <input 
                      className="sb-input w-full" 
                      placeholder="valor…" 
                      value={r?.value ?? ""} 
                      onChange={e=>update(p.id,{ value: e.target.value })} 
                    />
                  </td>
                  <td>
                    <select 
                      className="sb-select w-full" 
                      value={r?.status ?? "OK"} 
                      onChange={e=>update(p.id,{ status:e.target.value as "OK"|"FAIL"|"NA" })}
                    >
                      <option value="OK">✓ OK</option>
                      <option value="FAIL">✗ FAIL</option>
                      <option value="NA">− N/A</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {planParams.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-6 text-sm text-muted-foreground">
                  Este plan no tiene parámetros o no hay plan seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
