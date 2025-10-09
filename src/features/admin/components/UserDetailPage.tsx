"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import { PageShell } from "@/components/shared/PageShell";
import { SBButton, Input, Select } from "@/components/ui";
import { Save, ArrowLeft, TrendingUp, TrendingDown, Target, DollarSign, MapPin, Truck } from "lucide-react";
import type { User, UserRole } from "@/domain/ssot";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

type Props = {
  userId: string;
};

export function UserDetailPage({ userId }: Props) {
  const router = useRouter();
  const { data, saveAllCollections } = useData();
  
  const users = useMemo(() => data?.users || [], [data]);
  const parties = useMemo(() => data?.parties || [], [data]);
  const partyRoles = useMemo(() => data?.partyRoles || [], [data]);
  const interactions = useMemo(() => data?.interactions || [], [data]);
  const orders = useMemo(() => data?.ordersSellOut || [], [data]);
  const accounts = useMemo(() => data?.accounts || [], [data]);
  const posTactics = useMemo(() => data?.posTactics || [], [data]);
  const marketingEvents = useMemo(() => data?.marketingEvents || [], [data]);

  const user = useMemo(() => users.find(u => u.id === userId), [users, userId]);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('comercial');
  const [active, setActive] = useState(true);
  const [managerId, setManagerId] = useState('');
  
  // KPI Baseline (objectives)
  const [revenueTarget, setRevenueTarget] = useState(0);
  const [unitsTarget, setUnitsTarget] = useState(0);
  const [visitsTarget, setVisitsTarget] = useState(0);
  
  // Assigned distributors
  const [assignedDistributors, setAssignedDistributors] = useState<Array<{ partyId: string; priority: number }>>([]);
  
  // Permissions
  const [viewPermissions, setViewPermissions] = useState<string[]>([]);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);

  const MODULES = [
    { id: 'dashboard-personal', label: '📊 Dashboard Personal' },
    { id: 'accounts', label: '👥 Cuentas' },
    { id: 'sell-out', label: '💰 Sell-Out' },
    { id: 'sell-in', label: '🚚 Sell-In' },
    { id: 'marketing', label: '📢 Marketing' },
    { id: 'production', label: '🏭 Producción' },
    { id: 'quality', label: '✅ Calidad' },
    { id: 'warehouse', label: '📦 Logística' },
    { id: 'cashflow', label: '💵 Finanzas' },
    { id: 'admin', label: '⚙️ Admin' },
  ];

  // Load user data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email || '');
      setRole(user.role);
      setActive(user.active);
      setManagerId(user.managerId || '');
      setRevenueTarget(user.kpiBaseline?.revenue || 0);
      setUnitsTarget(user.kpiBaseline?.unitsSold || 0);
      setVisitsTarget(user.kpiBaseline?.visits || 0);
      setAssignedDistributors(user.assignedDistributors || []);
      setViewPermissions(user.permissions?.view || ['dashboard-personal']);
      setEditPermissions(user.permissions?.edit || []);
    }
  }, [user]);

  // Calculate KPIs for comercial users
  const kpis = useMemo(() => {
    if (!user || user.role !== 'comercial') return null;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const userInteractions = interactions.filter(i => 
      i.userId === user.id && 
      new Date(i.createdAt) >= thirtyDaysAgo
    );

    const userAccounts = accounts.filter(a => a.ownerId === user.id);
    const userAccountIds = new Set(userAccounts.map(a => a.id));
    
    const userOrders = orders.filter(o => {
      if (new Date(o.createdAt) < thirtyDaysAgo) return false;
      if (o.createdById === user.id) return true;
      if (o.accountId && userAccountIds.has(o.accountId)) return true;
      return false;
    });

    const revenue = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const visits = userInteractions.filter(i => i.kind === 'VISITA').length;
    const unitsSold = userOrders.reduce((sum, o) => 
      sum + o.lines.reduce((lineSum, l) => lineSum + l.qty, 0), 0
    );

    const activeAccounts = userAccounts.filter(a => a.stage === 'ACTIVA').length;
    const potentialAccounts = userAccounts.filter(a => a.stage === 'POTENCIAL').length;

    const completedInteractions = userInteractions.filter(i => i.status === 'done').length;
    const taskCompletionRate = userInteractions.length > 0 
      ? (completedInteractions / userInteractions.length) * 100 
      : 0;

    const userPosTactics = posTactics.filter(pt => 
      pt.createdById === user.id && 
      new Date(pt.createdAt) >= thirtyDaysAgo &&
      pt.status !== 'cancelled'
    );
    const posItemsDelivered = userPosTactics.reduce((sum, pt) => sum + (pt.qtyPlanned || 0), 0);
    const posCost = userPosTactics.reduce((sum, pt) => sum + (pt.actualCost || 0), 0);

    const userEvents = marketingEvents.filter(e => 
      e.ownerUserId === user.id && 
      new Date(e.createdAt) >= thirtyDaysAgo &&
      e.status !== 'cancelled'
    );

    return {
      revenue,
      revenueVsTarget: revenueTarget > 0 ? ((revenue - revenueTarget) / revenueTarget) * 100 : 0,
      unitsSold,
      unitsVsTarget: unitsTarget > 0 ? ((unitsSold - unitsTarget) / unitsTarget) * 100 : 0,
      visits,
      visitsVsTarget: visitsTarget > 0 ? ((visits - visitsTarget) / visitsTarget) * 100 : 0,
      activeAccounts,
      potentialAccounts,
      taskCompletionRate,
      totalInteractions: userInteractions.length,
      posItemsDelivered,
      posCost,
      eventsCount: userEvents.length,
    };
  }, [user, interactions, orders, accounts, posTactics, marketingEvents, revenueTarget, unitsTarget, visitsTarget]);

  // Get distributors for assignment
  const distributorParties = useMemo(() => {
    return parties.filter(p => {
      const roles = partyRoles.filter(pr => pr.partyId === p.id && pr.isActive);
      return roles.some(r => r.role === 'DISTRIBUTOR');
    });
  }, [parties, partyRoles]);

  const handleSave = async () => {
    if (!user) return;
    
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser: User = {
        ...user,
        name: name.trim(),
        email: email.trim() || undefined,
        role,
        active,
        managerId: managerId || undefined,
        kpiBaseline: role === 'comercial' ? {
          revenue: revenueTarget,
          unitsSold: unitsTarget,
          visits: visitsTarget,
        } : undefined,
        assignedDistributors: role === 'comercial' ? assignedDistributors : undefined,
        permissions: {
          view: viewPermissions,
          edit: editPermissions,
        },
      };

      await saveAllCollections({ users: [updatedUser] });
      toast.success("Usuario actualizado correctamente");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el usuario");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddDistributor = (partyId: string) => {
    if (assignedDistributors.some(d => d.partyId === partyId)) return;
    setAssignedDistributors([
      ...assignedDistributors,
      { partyId, priority: assignedDistributors.length + 1 }
    ]);
  };

  const handleRemoveDistributor = (partyId: string) => {
    setAssignedDistributors(assignedDistributors.filter(d => d.partyId !== partyId));
  };

  const handleToggleView = (moduleId: string) => {
    setViewPermissions(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleToggleEdit = (moduleId: string) => {
    setEditPermissions(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
    // Si activas edit, también activa view automáticamente
    if (!editPermissions.includes(moduleId) && !viewPermissions.includes(moduleId)) {
      setViewPermissions(prev => [...prev, moduleId]);
    }
  };

  if (!user) {
    return (
      <PageShell title="Usuario no encontrado">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No se encontró el usuario</p>
          <Link href="/admin/users">
            <SBButton variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a lista
            </SBButton>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell 
      title={`👤 ${user.name}`}
      actions={
        <div className="flex gap-2">
          <Link href="/admin/users">
            <SBButton variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </SBButton>
          </Link>
          <SBButton onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </SBButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPIs - Solo para Comerciales */}
        {user && user.role === 'comercial' && kpis && (
          <div className="sb-card">
            <div className="sb-card__header">
              <h3 className="text-lg font-semibold">📊 KPIs (últimos 30 días)</h3>
            </div>
            <div className="sb-card__content">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Revenue */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Revenue</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {kpis.revenue.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
                  </div>
                  {revenueTarget > 0 && (
                    <div className={`text-xs flex items-center gap-1 mt-1 ${kpis.revenueVsTarget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpis.revenueVsTarget >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(kpis.revenueVsTarget).toFixed(0)}% vs {revenueTarget.toLocaleString()}€
                    </div>
                  )}
                </div>

                {/* Units */}
                <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-cyan-600" />
                    <span className="text-sm font-medium text-cyan-900">Unidades</span>
                  </div>
                  <div className="text-2xl font-bold text-cyan-900">
                    {kpis.unitsSold}
                  </div>
                  {unitsTarget > 0 && (
                    <div className={`text-xs flex items-center gap-1 mt-1 ${kpis.unitsVsTarget >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>
                      {kpis.unitsVsTarget >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(kpis.unitsVsTarget).toFixed(0)}% vs {unitsTarget}
                    </div>
                  )}
                </div>

                {/* Visits */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Visitas</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {kpis.visits}
                  </div>
                  {visitsTarget > 0 && (
                    <div className={`text-xs flex items-center gap-1 mt-1 ${kpis.visitsVsTarget >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {kpis.visitsVsTarget >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(kpis.visitsVsTarget).toFixed(0)}% vs {visitsTarget}
                    </div>
                  )}
                </div>

                {/* Accounts */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Cuentas</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {kpis.activeAccounts}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    activas (+{kpis.potentialAccounts} potenciales)
                  </div>
                </div>
              </div>

              {/* Secondary metrics */}
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Tareas completadas:</span>
                  <span className="ml-2 font-semibold">{kpis.taskCompletionRate.toFixed(0)}%</span>
                  <span className="text-gray-500 text-xs ml-1">({kpis.totalInteractions} total)</span>
                </div>
                {kpis.posItemsDelivered > 0 && (
                  <div>
                    <span className="text-gray-600">POS colocado:</span>
                    <span className="ml-2 font-semibold">{kpis.posItemsDelivered} items ({kpis.posCost.toFixed(0)}€)</span>
                  </div>
                )}
                {kpis.eventsCount > 0 && (
                  <div>
                    <span className="text-gray-600">Eventos:</span>
                    <span className="ml-2 font-semibold">{kpis.eventsCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Información Básica */}
        <div className="sb-card">
          <div className="sb-card__header">
            <h3 className="text-lg font-semibold">Información Básica</h3>
          </div>
          <div className="sb-card__content space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Nombre *</span>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Email</span>
                <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Rol *</span>
                <Select value={role} onChange={e => setRole(e.target.value as UserRole)}>
                  <option value="comercial">🎯 Comercial</option>
                  <option value="admin">⚙️ Admin</option>
                  <option value="ops">🔧 Ops</option>
                  <option value="owner">👑 Owner</option>
                </Select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Manager</span>
                <Select value={managerId} onChange={e => setManagerId(e.target.value)}>
                  <option value="">Sin manager</option>
                  {users.filter(u => u.id !== user.id && u.active).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </Select>
              </label>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Usuario Activo</span>
              </label>
            </div>
          </div>
        </div>

        {/* Objetivos - Solo para Comerciales */}
        {user && user.role === 'comercial' && (
          <div className="sb-card">
            <div className="sb-card__header">
              <h3 className="text-lg font-semibold">🎯 Objetivos Mensuales</h3>
            </div>
            <div className="sb-card__content">
              <div className="grid grid-cols-3 gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">Revenue Objetivo (€)</span>
                  <Input
                    type="number"
                    value={revenueTarget}
                    onChange={e => setRevenueTarget(Number(e.target.value))}
                    placeholder="10000"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">Unidades Objetivo</span>
                  <Input
                    type="number"
                    value={unitsTarget}
                    onChange={e => setUnitsTarget(Number(e.target.value))}
                    placeholder="500"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">Visitas Objetivo</span>
                  <Input
                    type="number"
                    value={visitsTarget}
                    onChange={e => setVisitsTarget(Number(e.target.value))}
                    placeholder="20"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Distribuidores Asignados - Solo para Comerciales */}
        {user && user.role === 'comercial' && (
          <div className="sb-card">
            <div className="sb-card__header">
              <h3 className="text-lg font-semibold">
                <Truck className="w-5 h-5 inline mr-2" />
                Distribuidores Asignados
              </h3>
            </div>
            <div className="sb-card__content space-y-4">
              <div className="flex flex-wrap gap-2">
                {assignedDistributors.map(dist => {
                  const party = parties.find(p => p.id === dist.partyId);
                  return (
                    <span
                      key={dist.partyId}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-900 rounded-lg text-sm"
                    >
                      {party?.name || dist.partyId}
                      <button
                        onClick={() => handleRemoveDistributor(dist.partyId)}
                        className="hover:text-red-600 transition-colors font-bold"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Añadir Distribuidor</label>
                <Select
                  value=""
                  onChange={e => e.target.value && handleAddDistributor(e.target.value)}
                >
                  <option value="">Selecciona un distribuidor...</option>
                  {distributorParties
                    .filter(p => !assignedDistributors.some(d => d.partyId === p.id))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Zonas Asignadas - Solo para Comerciales */}
        {user && user.role === 'comercial' && (
          <div className="sb-card">
            <div className="sb-card__header">
              <h3 className="text-lg font-semibold">
                <MapPin className="w-5 h-5 inline mr-2" />
                Zonas y Territorio
              </h3>
            </div>
            <div className="sb-card__content">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Cuentas por Provincia</h4>
                  {(() => {
                    const userAccounts = accounts.filter(a => a.ownerId === user.id);
                    const byProvince = userAccounts.reduce((acc, account) => {
                      const party = parties.find(p => p.id === account.partyId);
                      const province = party?.billingAddress?.province || 'Sin especificar';
                      acc[province] = (acc[province] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    
                    return Object.entries(byProvince)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([province, count]) => (
                        <div key={province} className="flex justify-between py-1 text-sm">
                          <span className="text-gray-600">{province}</span>
                          <span className="font-semibold">{count} cuentas</span>
                        </div>
                      ));
                  })()}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Cuentas por Ciudad</h4>
                  {(() => {
                    const userAccounts = accounts.filter(a => a.ownerId === user.id);
                    const byCity = userAccounts.reduce((acc, account) => {
                      const party = parties.find(p => p.id === account.partyId);
                      const city = party?.billingAddress?.city || 'Sin especificar';
                      acc[city] = (acc[city] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    
                    return Object.entries(byCity)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([city, count]) => (
                        <div key={city} className="flex justify-between py-1 text-sm">
                          <span className="text-gray-600">{city}</span>
                          <span className="font-semibold">{count} cuentas</span>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline de Actividad - Solo para Comerciales */}
        {user && user.role === 'comercial' && (
          <div className="sb-card">
            <div className="sb-card__header">
              <h3 className="text-lg font-semibold">📅 Actividad Reciente (últimos 7 días)</h3>
            </div>
            <div className="sb-card__content">
              {(() => {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                
                const recentInteractions = interactions
                  .filter(i => i.userId === user.id && new Date(i.createdAt) >= sevenDaysAgo)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10);

                if (recentInteractions.length === 0) {
                  return (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      No hay actividad reciente registrada
                    </p>
                  );
                }

                return (
                  <div className="space-y-3">
                    {recentInteractions.map(interaction => {
                      const account = accounts.find(a => a.id === interaction.accountId);
                      const kindLabels: Record<string, string> = {
                        VISITA: '📍 Visita',
                        LLAMADA: '📞 Llamada',
                        EMAIL: '📧 Email',
                        WHATSAPP: '💬 WhatsApp',
                        OTRO: '📝 Otro',
                        COBRO: '💰 Cobro',
                        EVENTO_MKT: '🎉 Evento'
                      };
                      
                      return (
                        <div key={interaction.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                          <div className="text-xs text-gray-500 w-20 flex-shrink-0">
                            {new Date(interaction.createdAt).toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: 'short' 
                            })}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {kindLabels[interaction.kind] || interaction.kind}
                              </span>
                              {interaction.status === 'done' && (
                                <span className="text-xs text-green-600">✓ Completada</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">
                              {account?.name || 'Cuenta no encontrada'}
                            </p>
                            {interaction.note && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {interaction.note}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Permisos de Acceso - Todos los usuarios */}
        <div className="sb-card">
          <div className="sb-card__header">
            <h3 className="text-lg font-semibold">🔐 Permisos de Acceso</h3>
          </div>
          <div className="sb-card__content">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-sm font-medium text-gray-600 mb-3">
                <div>Módulo</div>
                <div className="text-center">Ver</div>
                <div className="text-center">Editar</div>
              </div>
              <div className="space-y-2.5">
                {MODULES.map(module => (
                  <div key={module.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                    <span className="text-sm">{module.label}</span>
                    <input
                      type="checkbox"
                      checked={viewPermissions.includes(module.id)}
                      onChange={() => handleToggleView(module.id)}
                      className="w-4 h-4 justify-self-center"
                    />
                    <input
                      type="checkbox"
                      checked={editPermissions.includes(module.id)}
                      onChange={() => handleToggleEdit(module.id)}
                      className="w-4 h-4 justify-self-center"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4 italic">
                ℹ️ Al activar "Editar" se activa automáticamente "Ver"
              </p>
            </div>
          </div>
        </div>

        {/* Movilidad GPS - Solo para Comerciales */}
        {user && user.role === 'comercial' && (
          <div className="sb-card">
            <div className="sb-card__header">
              <h3 className="text-lg font-semibold">
                <MapPin className="w-5 h-5 inline mr-2" />
                Movilidad y Rutas
              </h3>
            </div>
            <div className="sb-card__content">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-3">
                  📍 <strong>Análisis de movilidad GPS</strong>
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Visitas registradas (mes):</span>
                    <span className="font-semibold">{kpis?.visits || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuentas únicas visitadas:</span>
                    <span className="font-semibold">
                      {(() => {
                        const now = new Date();
                        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        const recentVisits = interactions.filter(i => 
                          i.userId === user.id && 
                          i.kind === 'VISITA' &&
                          new Date(i.createdAt) >= thirtyDaysAgo
                        );
                        const uniqueAccounts = new Set(recentVisits.map(i => i.accountId));
                        return uniqueAccounts.size;
                      })()}
                    </span>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-600 italic">
                      Para análisis detallado de rutas GPS, mapa de calor y estadísticas de desplazamiento, 
                      consulta el módulo de análisis de movilidad.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
