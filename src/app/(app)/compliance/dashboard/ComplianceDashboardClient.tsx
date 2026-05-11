"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useMemo, useState } from "react";
import { Card, Button, Badge } from "@/components/ui/ui-primitives";
import { ProtocolRunPanel } from "@/components/compliance/ProtocolRunPanel";
import { startProtocolRun } from "@/server/actions/compliance.actions";

type Schedule = {
  id: string;
  protocolId: string;
  protocolCode: string;
  protocolName: string;
  category: string;
  nextDueDate: string;
  status: "SCHEDULED" | "DUE" | "OVERDUE" | "PAUSED";
};

export function ComplianceDashboardClient({ schedules }: { schedules: Schedule[] }) {
  const [run, setRun] = useState<{ runId: string; protocolId: string; title: string } | null>(null);

  const byCategory = useMemo(() => {
    return schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
      (acc[s.category] ||= []).push(s);
      return acc;
    }, {});
  }, [schedules]);

  async function onStart(protocolId: string, title: string) {
    const res: any = await startProtocolRun({ protocolId }, 'demo-user');
    if (res?.error) return;
    setRun({ runId: res.runId, protocolId, title });
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(byCategory).map(([cat, list]) => (
          <Card key={cat} className="p-4">
            <header className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{labelCat(cat)}</h3>
              <Badge variant={list.some(s => s.status === 'OVERDUE') ? 'destructive' : 'secondary'}>
                {list.filter(s => s.status === 'OVERDUE').length} vencidos
              </Badge>
            </header>
            <div className="space-y-2">
              {list.slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{s.protocolCode} · {s.protocolName}</div>
                    <div className="text-xs text-muted-foreground">
                      Próximo: {new Date(s.nextDueDate).toLocaleDateString()} · {s.status}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onStart(s.protocolId, s.protocolName)}>Ejecutar</Button>
                </div>
              ))}
              {list.length === 0 && <div className="text-sm text-muted-foreground p-2">Sin protocolos en esta categoría</div>}
            </div>
          </Card>
        ))}
      </div>

      {run && (
        <ProtocolRunPanel
          runId={run.runId}
          protocolId={run.protocolId}
          title={run.title}
          onClose={() => setRun(null)}
        />
      )}
    </div>
  );
}

function labelCat(c: string) {
  const map: any = { PLAGAS: "Plagas", AGUAS: "Aguas", LIMPIEZA: "Limpieza", FORMACION: "Formación", TEMPERATURA: "Temperatura", MANTENIMIENTO: "Mantenimiento", CALIBRACION: "Calibración", AUDITORIA: "Auditorías", PRODUCCION: "Producción", RND: "I+D" };
  return map[c] ?? c;
}
