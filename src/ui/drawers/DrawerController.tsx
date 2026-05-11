'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import React from 'react';
import { DrawerContext, DrawerId, DrawerPayload } from './drawer-registry';
import { TaskQuickEditDrawer } from './drawers/TaskQuickEditDrawer';
import { MoveStageDrawer } from './drawers/MoveStageDrawer';
import { OpportunityDrawer } from './drawers/OpportunityDrawer';
import { NewOrderDrawer } from './drawers/NewOrderDrawer';
import { PlacementOrderDrawer } from './drawers/PlacementOrderDrawer';
import { AccountQuickView } from './drawers/AccountQuickView';
import { RegisterInteractionDrawer } from './drawers/RegisterInteractionDrawer';
import { RegisterPOSDrawer } from './drawers/RegisterPOSDrawer';
import { RegisterEventDrawer } from './drawers/RegisterEventDrawer';
import { QuickOrderDrawer } from './drawers/QuickOrderDrawer';

// Stub drawers - implementación mínima para que compile
function KpiBreakdownDrawer({ kpiId, onClose }: any) {
  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Detalle KPI: {kpiId}</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>
      <div className="sb-drawer__body">
        <p className="text-sm opacity-70">Desglose del KPI (mock)</p>
      </div>
    </aside>
  );
}

function GoalWhatIfDrawer({ onClose }: any) {
  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Simular objetivo</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>
      <div className="sb-drawer__body">
        <p className="text-sm opacity-70">Simulación de objetivos (mock)</p>
      </div>
    </aside>
  );
}

function EmailReplyDrawer({ threadId, onClose }: any) {
  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Responder email</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>
      <div className="sb-drawer__body">
        <textarea className="sb-input min-h-40" placeholder="Escribe tu respuesta…" />
      </div>
      <footer className="sb-drawer__footer">
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cancelar</button>
        <button className="sb-btn sb-btn--primary">Enviar</button>
      </footer>
    </aside>
  );
}

function VisitRescheduleDrawer({ interactionId, onClose }: any) {
  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Reagendar visita</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>
      <div className="sb-drawer__body">
        <input type="datetime-local" className="sb-input" />
      </div>
      <footer className="sb-drawer__footer">
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cancelar</button>
        <button className="sb-btn sb-btn--primary">Reagendar</button>
      </footer>
    </aside>
  );
}

function AccountMiniKpisDrawer({ accountId, onClose }: any) {
  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>KPIs de la cuenta</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>
      <div className="sb-drawer__body">
        <p className="text-sm opacity-70">KPIs de cuenta: {accountId} (mock)</p>
      </div>
    </aside>
  );
}

function ProjectProgressDrawer({ projectId, onClose }: any) {
  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Progreso del proyecto</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>
      <div className="sb-drawer__body">
        <p className="text-sm opacity-70">Progreso: {projectId} (mock)</p>
      </div>
    </aside>
  );
}

function AccountQuickViewDrawer({ accountId, onClose }: any) {
  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Account QuickView</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>
      <div className="sb-drawer__body">
        <p className="text-sm opacity-70">Vista rápida: {accountId} (mock)</p>
      </div>
    </aside>
  );
}

function ActivityDrawer({ activityId, onClose }: any) {
  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Actividad</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>
      <div className="sb-drawer__body">
        <p className="text-sm opacity-70">Detalle actividad: {activityId} (mock)</p>
      </div>
    </aside>
  );
}

function VisitOnSiteDrawer({ accountId, onClose }: any) {
  return (
    <aside className="sb-drawer">
      <header className="sb-drawer__header">
        <h3>Visita en curso</h3>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>Cerrar</button>
      </header>
      <div className="sb-drawer__body">
        <p className="text-sm opacity-70">Visita: {accountId} (mock)</p>
      </div>
    </aside>
  );
}

export function DrawerController({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = React.useState<{ id: DrawerId; payload: DrawerPayload } | null>(null);
  const open = (id: DrawerId, payload: DrawerPayload = {}) => setCurrent({ id, payload });
  const close = () => setCurrent(null);

  return (
    <DrawerContext.Provider value={{ open, close, current }}>
      {children}
      {current?.id === 'kpi-breakdown' && (
        <KpiBreakdownDrawer {...current.payload} onClose={close} />
      )}
      {current?.id === 'goal-whatif' && (
        <GoalWhatIfDrawer {...current.payload} onClose={close} />
      )}
      {current?.id === 'email-reply' && (
        <EmailReplyDrawer {...current.payload} onClose={close} />
      )}
      {current?.id === 'visit-reschedule' && (
        <VisitRescheduleDrawer {...current.payload} onClose={close} />
      )}
      {current?.id === 'account-kpis' && (
        <AccountMiniKpisDrawer {...current.payload} onClose={close} />
      )}
      {current?.id === 'project-progress' && (
        <ProjectProgressDrawer {...current.payload} onClose={close} />
      )}
      {current?.id === 'account-quickview' && (
        <AccountQuickView {...(current.payload as any)} onClose={close} />
      )}
      {current?.id === 'activity' && (
        <ActivityDrawer {...current.payload} onClose={close} />
      )}
      {current?.id === 'visit-onsite' && (
        <VisitOnSiteDrawer {...current.payload} onClose={close} />
      )}
      {current?.id === 'task-edit' && (
        <TaskQuickEditDrawer {...current.payload} onClose={close} />
      )}
      {current?.id === 'move-stage' && (
        <MoveStageDrawer {...(current.payload as any)} onClose={close} />
      )}
      {current?.id === 'opportunity' && (
        <OpportunityDrawer {...(current.payload as any)} onClose={close} />
      )}
      {current?.id === 'new-order' && (
        <NewOrderDrawer {...(current.payload as any)} onClose={close} />
      )}
      {current?.id === 'placement-order' && (
        <PlacementOrderDrawer {...(current.payload as any)} onClose={close} />
      )}
      {current?.id === 'register-interaction' && (
        <RegisterInteractionDrawer {...(current.payload as any)} onClose={close} />
      )}
      {current?.id === 'register-pos' && (
        <RegisterPOSDrawer {...(current.payload as any)} onClose={close} />
      )}
      {current?.id === 'register-event' && (
        <RegisterEventDrawer {...(current.payload as any)} onClose={close} />
      )}
      {current?.id === 'quick-order' && (
        <QuickOrderDrawer {...(current.payload as any)} onClose={close} />
      )}
    </DrawerContext.Provider>
  );
}
