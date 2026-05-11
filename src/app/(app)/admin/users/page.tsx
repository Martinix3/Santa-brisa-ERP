"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { useData } from "@/lib/dataprovider";
import type { User } from "@/domain/ssot";
import { SBCard } from "@/components/ui/ui-primitives";
import { UserCog, Search, Shield, Mail, Clock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserDrawer } from "@/components/admin/UserDrawer";
import { ROLE_META } from "@/config/user-roles";

export default function AdminUsersPage() {
  const { data } = useData();
  const router = useRouter();
  const users = data?.users || [];
  
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    let result = users;
    
    if (roleFilter !== "all") {
      result = result.filter(u => u.role?.toLowerCase() === roleFilter.toLowerCase());
    }
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(u => 
        u.displayName?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search)
      );
    }
    
    return result.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }, [users, roleFilter, searchTerm]);

  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    users.forEach(user => {
      const role = user.role || 'Sin Rol';
      stats[role] = (stats[role] || 0) + 1;
    });
    return stats;
  }, [users]);

  const handleOpenDrawer = (user?: User) => {
    setSelectedUser(user || null);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
  };

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <div className="sb-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="sb-page__title flex items-center gap-2">
          <UserCog className="h-6 w-6" />
          Gestión de Usuarios
        </h1>
        <button
          onClick={() => handleOpenDrawer()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          Nuevo Usuario
        </button>
      </div>
      
      <div className="sb-page__content">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SBCard>
            <div className="sb-card__content">
              <p className="text-sm text-muted-foreground">Total Usuarios</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </SBCard>
          {Object.entries(roleStats).slice(0, 3).map(([role, count]) => (
            <SBCard key={role}>
              <div className="sb-card__content">
                <p className="text-sm text-muted-foreground">{role}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            </SBCard>
          ))}
        </div>

        {/* Users List */}
        <SBCard>
          <div className="sb-card__header">
            <div className="sb-card__title">Usuarios del Sistema</div>
          </div>
          
          {/* Toolbar */}
          <div className="sb-toolbar">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-md border border-border bg-background"
              />
            </div>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-border bg-background"
            >
              <option value="all">Todos los Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="comercial">Comercial</option>
              <option value="ops">Ops</option>
              <option value="inversor">Inversor</option>
              <option value="distribuidor">Distribuidor</option>
            </select>
          </div>

          <div className="sb-card__content">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchTerm || roleFilter !== "all" 
                  ? "No se encontraron usuarios con los filtros aplicados" 
                  : "No hay usuarios registrados"}
              </p>
            ) : (
              <div className="sb-table-wrapper">
                <table className="sb-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr 
                        key={user.id}
                        onClick={() => handleOpenDrawer(user)}
                        className="cursor-pointer hover:bg-secondary/50"
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary">
                                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                            <span className="font-medium">{user.displayName || 'Sin nombre'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-muted-foreground" />
                            <span className="text-sm">{user.email}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Shield size={14} className="text-muted-foreground" />
                            <span className={`px-2 py-1 text-xs rounded-full ${user.role && ROLE_META[user.role] ? ROLE_META[user.role].color : 'bg-gray-100 text-gray-800'}`}>
                              {user.role && ROLE_META[user.role] ? `${ROLE_META[user.role].icon} ${ROLE_META[user.role].label}` : 'Sin Rol'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Activo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SBCard>

        {/* Role Distribution */}
        <SBCard>
          <div className="sb-card__header">
            <div className="sb-card__title">Distribución por Roles</div>
          </div>
          <div className="sb-card__content">
            <div className="space-y-3">
              {Object.entries(roleStats).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-muted-foreground" />
                    <span className="font-medium">{role}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(count / users.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SBCard>
      </div>

      {/* User Drawer */}
      <UserDrawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
