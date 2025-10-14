'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  getContact,
  getAccountStats,
  listOpenOpportunities,
  listRecentActivity,
  updateContact,
  listNotes,
  createNote,
  listContactPersons,
  createContactPerson,
  getBusinessAlerts,
  type ContactDetail,
  type AccountStats,
  type OpenOpportunity,
  type RecentActivity,
  type Note,
  type ContactPerson,
  type BusinessAlert,
} from './actions';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { EditAccountDialog } from '@/features/accounts/components/EditAccountDialog';
import { NewContactPersonDialog } from '@/features/accounts/components/NewContactPersonDialog';
import { NewNoteDialog } from '@/features/accounts/components/NewNoteDialog';
import { QuickActionsBar } from '@/features/accounts/components/QuickActionsBar';
import { BusinessAlertsCard } from '@/features/accounts/components/BusinessAlertsCard';
import QuickLogDrawer from '@/features/quicklog/QuickLogDrawer';
import { Edit } from 'lucide-react';

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const [year, setYear] = React.useState(new Date().getUTCFullYear());
  const [contact, setContact] = React.useState<ContactDetail | null>(null);
  const [stats, setStats] = React.useState<AccountStats | null>(null);
  const [opps, setOpps] = React.useState<OpenOpportunity[]>([]);
  const [activity, setActivity] = React.useState<RecentActivity[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [contactPersons, setContactPersons] = React.useState<ContactPerson[]>([]);
  const [alerts, setAlerts] = React.useState<BusinessAlert[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [contactDialogOpen, setContactDialogOpen] = React.useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = React.useState(false);
  const [quickLogOpen, setQuickLogOpen] = React.useState(false);
  const [quickLogTab, setQuickLogTab] = React.useState<string | undefined>();

  const loadData = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, s, o, act, n, cp, alts] = await Promise.all([
        getContact(id),
        getAccountStats(id, year),
        listOpenOpportunities(id),
        listRecentActivity(id),
        listNotes(id),
        listContactPersons(id),
        getBusinessAlerts(id),
      ]);
      setContact(c);
      setStats(s);
      setOpps(o);
      setActivity(act);
      setNotes(n);
      setContactPersons(cp);
      setAlerts(alts);
    } finally {
      setLoading(false);
    }
  }, [id, year]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Cargando contacto...</div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6 text-muted-foreground">Contacto no encontrado</div>
    );
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  // Extract primary email and phone
  const primaryEmail = contact.emails?.find(e => e.isPrimary)?.value || contact.emails?.[0]?.value;
  const primaryPhone = contact.phones?.find(p => p.isPrimary)?.value || contact.phones?.[0]?.value;
  const primaryAddress = contact.addresses?.[0];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header Glass */}
      <div className="sb-header-glass p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold truncate">{contact.displayName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {contact.fiscalId && (
                <span className="sb-kpi-badge px-3 py-1 text-xs font-medium">
                  {contact.fiscalId}
                </span>
              )}
              {contact.customer?.segment && (
                <span className="sb-kpi-badge px-3 py-1 text-xs font-medium">
                  {contact.customer.segment}
                </span>
              )}
              {contact.customer?.stage && (
                <span className="sb-kpi-badge px-3 py-1 text-xs font-semibold bg-primary/10 text-stage border-primary/20">
                  {contact.customer.stage}
                </span>
              )}
              {contact.customer?.placement === 'PLACEMENT' ? (
                <span className="sb-kpi-badge px-3 py-1 text-xs font-medium text-blue-600 border-blue-200">
                  Colocación
                </span>
              ) : contact.customer?.placement === 'DIRECT' ? (
                <span className="sb-kpi-badge px-3 py-1 text-xs font-medium">
                  Venta directa
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setEditDialogOpen(true)}
              className="h-10 w-10 rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 hover:scale-105 transition-all"
              aria-label="Editar contacto"
            >
              <Edit size={18} />
            </button>
            <button className="h-10 px-5 rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm text-sm font-medium hover:bg-background/80 hover:scale-105 transition-all">
              Nueva actividad
            </button>
            <button className="h-10 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/20">
              Crear factura
            </button>
          </div>
        </div>
      </div>

      {/* QuickActions Bar */}
      <QuickActionsBar
        onAction={(action) => {
          const tabMap: Record<string, string> = {
            'VISIT': 'VISITA',
            'ORDER': 'PEDIDO',
            'EVENT': 'EVENTO',
            'POS': 'POS',
          };
          setQuickLogTab(tabMap[action]);
          setQuickLogOpen(true);
        }}
      />

      {/* Business Alerts */}
      {alerts.length > 0 && (
        <BusinessAlertsCard
          alerts={alerts}
          onActionClick={(alert) => {
            setQuickLogTab(undefined);
            setQuickLogOpen(true);
          }}
        />
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Columna 1: KPIs + Gráfico */}
        <div className="space-y-5">
          {/* KPIs Principales (Dark Card) */}
          <div className="sb-card-glass-dark p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold opacity-90">Información General</h2>
              <select
                className="h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-xs backdrop-blur-sm hover:bg-white/10 transition-colors"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
              >
                {Array.from({ length: 4 }, (_, i) => new Date().getUTCFullYear() - i).map(
                  (y) => (
                    <option key={y} value={y} className="bg-gray-900">
                      {y}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="mb-6">
              <div className="text-xs opacity-70 mb-1">Ventas totales {year}</div>
              <div className="text-4xl font-bold tracking-tight">
                {formatCurrency(stats?.salesTotal ?? 0)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/8 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-xs opacity-70 mb-2">Cobrado</div>
                <div className="text-base font-bold truncate">
                  {formatCurrency(stats?.salesTotal ?? 0)}
                </div>
              </div>
              <div className="rounded-2xl bg-white/8 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-xs opacity-70 mb-2">A cuenta</div>
                <div className="text-base font-bold truncate">
                  {formatCurrency(stats?.onAccount ?? 0)}
                </div>
              </div>
              <div className="rounded-2xl bg-white/8 backdrop-blur-sm p-4 border border-white/10">
                <div className="text-xs opacity-70 mb-2">Pendiente</div>
                <div className="text-base font-bold truncate">
                  {formatCurrency(stats?.pendingToCollect ?? 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Ventas */}
          <div className="sb-card-glass-light p-6">
            <h3 className="text-sm font-semibold mb-4">Ventas mensuales</h3>
            <div className="h-48 -mx-2">
              {stats && stats.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthly}>
                    <XAxis dataKey="m" hide />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Mes ${label}`}
                      contentStyle={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sin datos
                </div>
              )}
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="sb-card-glass-subtle p-5">
            <h3 className="text-sm font-semibold mb-4">Datos de contacto</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Email</div>
                <div className="font-medium truncate">{primaryEmail || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Teléfono</div>
                <div className="font-medium">{primaryPhone || '—'}</div>
              </div>
              {primaryAddress && (primaryAddress.street || primaryAddress.city) && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Dirección</div>
                  <div className="font-medium text-xs leading-relaxed">
                    {primaryAddress.street || ''}
                    {primaryAddress.postalCode && `, ${primaryAddress.postalCode}`}
                    {primaryAddress.city && ` ${primaryAddress.city}`}
                    {primaryAddress.province && `, ${primaryAddress.province}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna 2: Actividades + Oportunidades */}
        <div className="space-y-5">
          {/* Próximas actividades */}
          <div className="sb-card-glass-light p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Próximas actividades</h3>
              <button className="h-8 px-4 rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm text-xs font-medium hover:bg-background/60 transition-all">
                + Nueva
              </button>
            </div>
            <div className="text-sm text-muted-foreground">
              Sin actividades pendientes
            </div>
          </div>

          {/* Oportunidades abiertas */}
          <div className="sb-card-glass-light p-5">
            <h3 className="text-sm font-semibold mb-4">Oportunidades abiertas</h3>
            <div className="space-y-2">
              {opps.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No hay oportunidades abiertas
                </div>
              )}
              {opps.map((opp) => (
                <div
                  key={opp.id}
                  className="flex items-center justify-between rounded-xl border border-border/30 bg-background/40 backdrop-blur-sm p-3 text-sm hover:bg-background/60 transition-all"
                >
                  <div className="flex-1 truncate">
                    <div className="font-medium truncate">{opp.title}</div>
                    <div className="text-xs text-muted-foreground">{opp.stage}</div>
                  </div>
                  <div className="font-semibold ml-2 whitespace-nowrap">
                    {formatCurrency(opp.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personas de contacto */}
          <div className="sb-card-glass-subtle p-5">
            <h3 className="text-sm font-semibold mb-4">Personas de contacto</h3>
            {contactPersons.length === 0 ? (
              <button 
                onClick={() => setContactDialogOpen(true)}
                className="h-9 px-4 rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm text-sm font-medium hover:bg-background/60 transition-all w-full"
              >
                + Añadir persona
              </button>
            ) : (
              <div className="space-y-2">
                {contactPersons.map((person) => (
                  <div
                    key={person.id}
                    className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                  >
                    <div className="font-medium text-sm">{person.name}</div>
                    {person.role && (
                      <div className="text-xs text-muted-foreground">{person.role}</div>
                    )}
                    {person.email && (
                      <div className="text-xs text-muted-foreground mt-1">{person.email}</div>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setContactDialogOpen(true)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all w-full"
                >
                  + Añadir otra persona
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: Notas + Actividad reciente */}
        <div className="space-y-5">
          {/* Notas */}
          <div className="sb-card-glass-light p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Notas</h3>
              <button 
                onClick={() => setNoteDialogOpen(true)}
                className="h-8 px-4 rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm text-xs font-medium hover:bg-background/60 transition-all"
              >
                + Nueva
              </button>
            </div>
            {notes.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin notas</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(note.createdAt).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-sm">{note.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actividad reciente */}
          <div className="sb-card-glass-light p-5">
            <h3 className="text-sm font-semibold mb-4">Actividad reciente</h3>
            <div className="space-y-3">
              {activity.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Sin actividad reciente
                </div>
              )}
              {activity.map((act) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-border/30 bg-background/30 backdrop-blur-sm p-3"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(act.when).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="font-medium text-sm mb-1">{act.kind}</div>
                  {act.summary && (
                    <div className="text-xs text-muted-foreground">{act.summary}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Portal del cliente */}
          <div className="sb-card-glass-subtle p-5">
            <h3 className="text-sm font-semibold mb-3">Portal del cliente</h3>
            <div className="text-xs text-muted-foreground mb-3">
              Acceso y visibilidad del cliente
            </div>
            <button className="h-9 px-4 rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm text-sm font-medium hover:bg-background/60 transition-all w-full">
              Ver portal
            </button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <EditAccountDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        account={contact ? {
          id: contact.id,
          name: contact.displayName,
          tradeName: contact.legalName || undefined,
          fiscalId: contact.fiscalId || undefined,
          segment: (contact.customer?.segment || 'HORECA') as any,
          flow: contact.customer?.placement === 'PLACEMENT' ? 'PLACEMENT' : 'DIRECT',
          stage: (contact.customer?.stage || 'POTENCIAL') as any,
          email: primaryEmail || undefined,
          phone: primaryPhone || undefined,
          mobile: undefined,
          addr: primaryAddress ? {
            street: primaryAddress.street,
            city: primaryAddress.city,
            province: primaryAddress.province,
            postalCode: primaryAddress.postalCode,
            country: primaryAddress.countryCode,
          } : undefined,
        } : undefined}
        onSave={async (data: any) => {
          await updateContact(id, {
            displayName: data.name,
            legalName: data.tradeName,
            fiscalId: data.fiscalId,
            customer: {
              segment: data.segment,
              stage: data.stage,
            },
            emails: data.email ? [{ value: data.email, isPrimary: true }] : [],
            phones: data.phone ? [{ value: data.phone, isPrimary: true }] : [],
            addresses: data.addr ? [{
              kind: 'billing',
              street: data.addr.street,
              city: data.addr.city,
              province: data.addr.province,
              postalCode: data.addr.postalCode,
              countryCode: data.addr.country || 'ES',
            }] : [],
          });
          await loadData();
        }}
      />

      <NewContactPersonDialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        accountId={id}
        onSave={async (data: any) => {
          await createContactPerson(data);
          await loadData();
        }}
      />

      <NewNoteDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        accountId={id}
        onSave={async (data: any) => {
          await createNote(data);
          await loadData();
        }}
      />

      <QuickLogDrawer
        open={quickLogOpen}
        onOpenChange={(open) => {
          setQuickLogOpen(open);
          if (!open) setQuickLogTab(undefined);
        }}
        accountId={id}
      />
    </div>
  );
}
