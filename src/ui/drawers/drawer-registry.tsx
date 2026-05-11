/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/ui/drawers/drawer-registry.tsx
'use client';

import * as React from 'react';

/**
 * Drawer Registry - Sistema de Drawers Dinámicos
 * 
 * Permite abrir drawers desde cualquier widget/componente
 * sin necesidad de gestionar estado en cada uno.
 * 
 * Uso:
 * const { open } = useDrawer();
 * open('kpi-breakdown', { kpiId: 'sales' });
 */

export type DrawerId =
  | 'kpi-breakdown'
  | 'goal-whatif'
  | 'email-reply'
  | 'visit-reschedule'
  | 'account-kpis'
  | 'project-progress'
  | 'account-quickview'
  | 'activity'
  | 'visit-onsite'
  | 'task-edit'
  | 'move-stage'
  | 'opportunity'
  | 'new-order'
  | 'quick-order'
  | 'placement-order'
  | 'register-interaction'
  | 'register-pos'
  | 'register-event';

export type DrawerPayload = Record<string, unknown>;

export type OpenDrawer = (id: DrawerId, payload?: DrawerPayload) => void;

export const DrawerContext = React.createContext<{ 
  open: OpenDrawer; 
  close: () => void;
  current: { id: DrawerId; payload: DrawerPayload } | null;
}>({
  open: () => {},
  close: () => {},
  current: null
});

export const useDrawer = () => React.useContext(DrawerContext);
