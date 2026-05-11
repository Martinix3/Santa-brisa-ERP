"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useEffect, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Textarea, Input, Checkbox, Label } from "@/components/ui/ui-primitives";
import { submitProtocolCheck } from "@/server/actions/compliance.actions";

type Step = { id: string; order: number; title: string; required: boolean; kind: "CHECK" | "MEASURE" | "VERIFY_DOC" | "PHOTO" | "SIGN" | "INPUT"; rule?: any };
type Protocol = { id: string; name: string; steps: Step[] };
type Run = { id: string; checks: Array<any>; status: "OPEN" | "BLOCKED" | "COMPLETED" };

export function ProtocolRunPanel({ runId, protocolId, title, onClose }: { runId: string; protocolId: string; title: string; onClose: () => void }) {
  const [proto, setProto] = useState<Protocol | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const p = await fetch(`/api/protocols/${protocolId}`).then(r => r.json());
      const r = await fetch(`/api/protocol-runs/${runId}`).then(r => r.json());
      setProto(p);
      setRun(r);
    })();
  }, [protocolId, runId]);

  const submit = (step: Step, payload: any) => {
    startTransition(async () => {
      await submitProtocolCheck({ runId, stepId: step.id, ...payload, passed: payload.passed ?? true }, 'demo-user');
      setRun(r => r ? { ...r, checks: [...r.checks, { stepId: step.id, ...payload, at: new Date().toISOString() }] } : r);
    });
  };

  if (!proto || !run) return null;
  const done = new Set(run.checks.map(c => c.stepId));
  const allRequiredPassed = proto.steps.filter(s => s.required).every(s => run.checks.find(c => c.stepId === s.id)?.passed);

  return (
    <Dialog>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[65vh] overflow-auto">
          {proto.steps.sort((a, b) => a.order - b.order).map(step => (
            <div key={step.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{step.order}. {step.title}</div>
                {done.has(step.id) && <span className="text-xs text-emerald-600">registrado</span>}
              </div>
              <StepInput step={step} onSubmit={(payload: any) => submit(step, payload)} disabled={done.has(step.id)} />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button disabled={!allRequiredPassed || isPending} onClick={() => fetch(`/api/protocol-runs/${runId}/complete`, { method: "POST" }).then(() => onClose())}>
            Completar protocolo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepInput({ step, onSubmit, disabled }: { step: Step; onSubmit: (payload: any) => void; disabled: boolean }) {
  if (disabled) return <div className="text-xs text-muted-foreground">Ya registrado</div>;
  switch (step.kind) {
    case "CHECK":
      return (
        <div className="flex items-center gap-2">
          <Checkbox id={step.id} onCheckedChange={(v: any) => onSubmit({ passed: !!v, value: !!v })} />
          <Label htmlFor={step.id}>Confirmar</Label>
        </div>
      );
    case "MEASURE":
      return (
        <div className="flex gap-2">
          <Input placeholder={step.rule?.measure?.unit || "valor"} onBlur={(e) => onSubmit({ value: e.target.value, unit: step.rule?.measure?.unit, passed: true })} />
        </div>
      );
    case "INPUT":
      return (
        <Textarea placeholder={step.rule?.input?.placeholder || "anota aquí…"} onBlur={(e) => onSubmit({ value: e.target.value, passed: true })} />
      );
    case "VERIFY_DOC":
      return <Button size="sm" onClick={() => onSubmit({ passed: true })}>Adjuntar/Validar documento</Button>;
    case "PHOTO":
      return <Button size="sm" onClick={() => onSubmit({ passed: true })}>Subir fotos</Button>;
    case "SIGN":
      return <Button size="sm" onClick={() => onSubmit({ passed: true, signature: { by: "me", role: step.rule?.sign?.role } })}>Firmar</Button>;
  }
}
