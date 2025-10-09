"use client";
import React, { useState, useMemo } from "react";
import { useData } from "@/lib/dataprovider";
import { PageShell } from "@/components/shared/PageShell";
import { SBButton, Input } from "@/components/ui";
import { Plus, Search, TrendingUp, TrendingDown, Target, CheckCircle2, MapPin, DollarSign } from "lucide-react";
import type { User, Interaction, OrderSellOut, Account, PartyRole } from "@/domain/ssot";
import Link from "next/link";
import { NewUserDialog } from "./NewUserDialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function UsersManagementPage() {
  const router = useRouter();
  const { data } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);

  const users = useMemo(() => data?.teamMembers || [], [data]);
  const interactions = useMemo(() => data?.interactions || [], [data]);
  const orders = useMemo(() => data?.orderSellOut || [], [data]);
  const accounts = useMemo(() => data?.accounts || [], [data]);
  const posTactics = useMemo(() => data?.posTactics || [], [data]);
  const marketingEvents = useMemo(() => data?.marketingEvents || [], [data]);
  const parties = useMemo(() => data?.accounts || [], [data]);
  const partyRoles = useMemo(() => data?.partyRoles || [], [data]);

  // Get distributors for NewUserDialog
  const distributors = useMemo(() => {
    return parties.filter(p => {
      const roles = partyRoles.filter(pr => pr.partyId === p.id && pr.isActive);
      return roles.some(r => r.role === 'DISTRIBUTOR');
    });
  }, [parties, partyRoles]);

  // Calculate KPIs for each user
  const usersWithKpis = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return users.map(user => {
      // Get user's interactions in last 30 days
      const userInteractions = interactions.filter(i => 
        i.userId === user.id && 
        new Date(i.createdAt) >= thirtyDaysAgo
      );

      // Get user's accounts (owned or where user is source)
      const userAccounts = accounts.filter(a => a.salesRepId === user.id);
      const userAccountIds = new Set(userAccounts.map(a => a.id));
      
      // Get orders where user is creator OR orders from accounts where user is source
      const userOrders = orders.filter(o => {
        if (new Date(o.createdAt) < thirtyDaysAgo) return false;
        
        // Direct orders created by user
        if (o.createdById === user.id) return true;
        
        // Orders from user's accounts (user is source even if not direct creator)
        if (o.accountId && userAccountIds.has(o.accountId)) return true;
        
        return false;
      });

      // Calculate revenue
      const revenue = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      // Visits
      const visits = userInteractions.filter(i => i.kind === 'VISITA').length;
      const totalInteractions = userInteractions.length;
      
      // Active accounts
      const activeAccounts = userAccounts.filter(a => a.stage === 'ACTIVA').length;
      const potentialAccounts = userAccounts.filter(a => a.stage === 'POTENCIAL').length;

      // Task completion
      const completedInteractions = userInteractions.filter(i => i.status === 'done').length;
      const taskCompletionRate = totalInteractions > 0 
        ? (completedInteractions / totalInteractions) * 100 
        : 0;

      // POS colocado (últimos 30 días)
      const userPosTactics = posTactics.filter(pt => 
        pt.createdById === user.id && 
        new Date(pt.createdAt) >= thirtyDaysAgo &&
        pt.status !== 'REJECTED'
      );
      const posItemsDelivered = userPosTactics.reduce((sum, pt) => sum + (pt.qtyPlanned || 0), 0);
      const posCost = userPosTactics.reduce((sum, pt) => sum + (pt.actualCost || 0), 0);

      // Eventos (últimos 30 días)
      const userEvents = marketingEvents.filter(e => 
        e.ownerUserId === user.id && 
        new Date(e.createdAt) >= thirtyDaysAgo &&
        e.status !== 'REJECTED'
      );
      const eventsCount = userEvents.length;

      // Assigned distributors
      const assignedDistributors = user.assignedDistributors?.length || 0;

      // Compare with baseline/objectives
      const revenueTarget = user.kpiBaseline?.revenue || 0;
      const revenueVsTarget = revenueTarget > 0
        ? ((revenue - revenueTarget) / revenueTarget) * 100 
        : 0;
      
      const visitsTarget = user.kpiBaseline?.visits || 0;
      const visitsVsTarget = visitsTarget > 0
        ? ((visits - visitsTarget) / visitsTarget) * 100 
        : 0;
      
      const unitsSoldTarget = user.kpiBaseline?.unitsSold || 0;
      const unitsSold = userOrders.reduce((sum, o) => 
        sum + o.lines.reduce((lineSum, l) => lineSum + l.qty, 0), 0
      );
      const unitsVsTarget = unitsSoldTarget > 0
        ? ((unitsSold - unitsSoldTarget) / unitsSoldTarget) * 100
        : 0;

      return {
        ...user,
        kpis: {
          revenue,
          revenueTarget,
          revenueVsTarget,
          visits,
          visitsTarget,
          visitsVsTarget,
          unitsSold,
          unitsSoldTarget,
          unitsVsTarget,
          activeAccounts,
          potentialAccounts,
          taskCompletionRate,
          assignedDistributors,
          totalInteractions,
          posItemsDelivered,
          posCost,
          eventsCount
        }
      };
    });
  }, [users, interactions, orders, accounts, posTactics, marketingEvents]);

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = usersWithKpis;

    // Filter by role
    if (selectedRole !== "ALL") {
      filtered = filtered.filter(u => u.role === selectedRole);
    }

    // Filter by search term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower)
      );
    }

    // Filter active users
    filtered = filtered.filter(u => u.active);

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [usersWithKpis, selectedRole, searchTerm]);

  // Count users by role
  const usersByRole = useMemo(() => {
    const activeUsers = users.filter(u => u.active);
    return {
      ALL: activeUsers.length,
      comercial: activeUsers.filter(u => u.role === 'comercial').length,
      admin: activeUsers.filter(u => u.role === 'admin').length,
      ops: activeUsers.filter(u => u.role === 'ops').length,
      owner: activeUsers.filter(u => u.role === 'owner').length,
    };
  }, [users]);

  const roleOptions = [
    { value: "ALL", label: "Todos los Roles" },
    { value: "comercial", label: "Comerciales" },
    { value: "admin", label: "Administradores" },
    { value: "ops", label: "Operaciones" },
    { value: "owner", label: "Propietarios" },
  ];

  return (
    <>
    <PageShell 
      title="👥 Gestión de Usuarios"
      actions={
        <SBButton onClick={() => setIsNewUserDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </SBButton>
      }
    >
      <div className="space-y-4">
        {/* Header with Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            >
              {roleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario activo' : 'usuarios activos'}
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map(user => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      </div>
    </PageShell>

    {/* New User Dialog */}
    {isNewUserDialogOpen && (
      <NewUserDialog
        open={isNewUserDialogOpen}
        onClose={() => setIsNewUserDialogOpen(false)}
        onSuccess={() => {
          toast.success('Usuario creado correctamente');
          router.refresh();
          setIsNewUserDialogOpen(false);
        }}
        onError={(msg) => toast.error(msg)}
        users={users}
        distributors={distributors}
      />
    )}
    </>
  );
}

// ============================================================================
// USER CARD COMPONENT
// ============================================================================

function UserCard({ user }: { user: User & { kpis: any } }) {
  const roleLabels: Record<string, string> = {
    comercial: '🎯 Comercial',
    admin: '⚙️ Admin',
    ops: '🔧 Ops',
    owner: '👑 Owner'
  };

  const kpis = user.kpis;
  const isComercial = user.role === 'comercial';

  return (
    <Link href={`/admin/users/${user.id}`}>
      <div className="sb-card hover:shadow-lg transition-all cursor-pointer">
        <div className="sb-card__content space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-lg truncate">
                {user.name}
              </h3>
              <p className="text-sm text-gray-500">{roleLabels[user.role] || user.role}</p>
              {user.email && (
                <p className="text-xs text-gray-400 truncate mt-1">{user.email}</p>
              )}
            </div>
          </div>

          {/* KPIs Grid - Solo para Comerciales */}
          {isComercial && (
            <div className="grid grid-cols-2 gap-2">
            {/* Revenue vs Target */}
            <div className="p-2.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-900">Revenue</span>
              </div>
              <div className="text-base font-bold text-green-900">
                {kpis.revenue.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
              </div>
              {kpis.revenueTarget > 0 && (
                <div className={`text-xs flex items-center gap-1 ${kpis.revenueVsTarget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.revenueVsTarget >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(kpis.revenueVsTarget).toFixed(0)}% vs {kpis.revenueTarget.toLocaleString()}€
                </div>
              )}
            </div>

            {/* Units vs Target */}
            <div className="p-2.5 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-cyan-600" />
                <span className="text-xs font-medium text-cyan-900">Unidades</span>
              </div>
              <div className="text-base font-bold text-cyan-900">
                {kpis.unitsSold}
              </div>
              {kpis.unitsSoldTarget > 0 && (
                <div className={`text-xs flex items-center gap-1 ${kpis.unitsVsTarget >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>
                  {kpis.unitsVsTarget >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(kpis.unitsVsTarget).toFixed(0)}% vs {kpis.unitsSoldTarget}
                </div>
              )}
            </div>

            {/* Visits vs Target */}
            <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">Visitas</span>
              </div>
              <div className="text-base font-bold text-blue-900">
                {kpis.visits}
              </div>
              {kpis.visitsTarget > 0 && (
                <div className={`text-xs flex items-center gap-1 ${kpis.visitsVsTarget >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {kpis.visitsVsTarget >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(kpis.visitsVsTarget).toFixed(0)}% vs {kpis.visitsTarget}
                </div>
              )}
            </div>

            {/* Task Completion */}
            <div className="p-2.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-900">Tareas</span>
              </div>
              <div className="text-base font-bold text-amber-900">
                {kpis.taskCompletionRate.toFixed(0)}%
              </div>
              <div className="text-xs text-amber-600">
                {kpis.totalInteractions} total
              </div>
            </div>
            </div>
          )}

          {/* Secondary metrics - Solo para Comerciales */}
          {isComercial && (
            <div className="pt-3 border-t space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-gray-600">
              <span>🏢 Cuentas activas:</span>
              <span className="font-medium">{kpis.activeAccounts}</span>
            </div>
            {kpis.posItemsDelivered > 0 && (
              <div className="flex items-center justify-between text-gray-600">
                <span>📍 POS colocado:</span>
                <span className="font-medium">{kpis.posItemsDelivered} items ({kpis.posCost.toFixed(0)}€)</span>
              </div>
            )}
            {kpis.eventsCount > 0 && (
              <div className="flex items-center justify-between text-gray-600">
                <span>🎉 Eventos:</span>
                <span className="font-medium">{kpis.eventsCount}</span>
              </div>
            )}
            {kpis.assignedDistributors > 0 && (
              <div className="flex items-center justify-between text-gray-600">
                <span>🚚 Distribuidores:</span>
                <span className="font-medium">{kpis.assignedDistributors}</span>
              </div>
            )}
            </div>
          )}

          {/* Info básica para no comerciales */}
          {!isComercial && (
            <div className="pt-2 text-sm text-gray-600">
              <p>Haz clic para ver detalles y editar</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
