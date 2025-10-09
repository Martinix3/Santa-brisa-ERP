"use client";
import React, { useState, useMemo } from "react";
import { SBDialog, SBDialogContent } from "@/components/ui/SBDialog";
import { Input, Select, Textarea } from "@/components/ui/ui-primitives";
import type { User, UserRole, Party } from "@/domain/ssot";
import { useData } from "@/lib/dataprovider";
import { UserPlus } from "lucide-react";

interface NewUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError?: (message: string) => void;
  users: User[];
  distributors: Party[];
}

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

export function NewUserDialog({
  open,
  onClose,
  onSuccess,
  onError,
  users,
  distributors,
}: NewUserDialogProps) {
  const { saveAllCollections } = useData();
  
  // Basic info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('comercial');
  const [managerId, setManagerId] = useState('');
  const [active, setActive] = useState(true);
  
  // KPI Baseline for comerciales
  const [revenueTarget, setRevenueTarget] = useState(0);
  const [unitsTarget, setUnitsTarget] = useState(0);
  const [visitsTarget, setVisitsTarget] = useState(0);
  
  // Distributors for comerciales
  const [selectedDistributors, setSelectedDistributors] = useState<string[]>([]);
  
  // Permissions
  const [viewPermissions, setViewPermissions] = useState<string[]>(['dashboard-personal']);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);

  const handleReset = () => {
    setName('');
    setEmail('');
    setRole('comercial');
    setManagerId('');
    setActive(true);
    setRevenueTarget(0);
    setUnitsTarget(0);
    setVisitsTarget(0);
    setSelectedDistributors([]);
    setViewPermissions(['dashboard-personal']);
    setEditPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      onError?.('El nombre es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const userId = `user_${Date.now()}`;

      const newUser: User = {
        id: userId,
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
        assignedDistributors: role === 'comercial' && selectedDistributors.length > 0
          ? selectedDistributors.map((partyId, index) => ({
              partyId,
              priority: index + 1,
            }))
          : undefined,
        permissions: {
          view: viewPermissions,
          edit: editPermissions,
        },
        createdAt: now,
        updatedAt: now,
      };

      await saveAllCollections({ users: [newUser] });
      handleReset();
      onSuccess();
    } catch (error: any) {
      onError?.(error.message || 'Error al crear el usuario');
    } finally {
      setIsSaving(false);
    }
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

  const handleToggleDistributor = (distId: string) => {
    setSelectedDistributors(prev =>
      prev.includes(distId)
        ? prev.filter(id => id !== distId)
        : [...prev, distId]
    );
  };

  return (
    <SBDialog open={open} onOpenChange={onClose}>
      <SBDialogContent
        title="Crear Nuevo Usuario"
        description="Configura un nuevo usuario con permisos"
        onSubmit={handleSubmit}
        primaryAction={{ 
          label: isSaving ? 'Creando...' : 'Crear Usuario', 
          type: 'submit', 
          disabled: isSaving 
        }}
        secondaryAction={{ 
          label: 'Cancelar', 
          onClick: onClose, 
          disabled: isSaving 
        }}
        maxWidth="56rem"
      >
        <div className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              <UserPlus className="w-4 h-4 inline mr-2" />
              Información Básica
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Nombre *</span>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Nombre completo"
                  required 
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Email</span>
                <Input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="usuario@santabrisa.es"
                />
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
                  {users.filter(u => u.active).map(u => (
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

          {/* Objetivos - Solo Comerciales */}
          {role === 'comercial' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
                🎯 Objetivos Mensuales
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">Revenue (€)</span>
                  <Input
                    type="number"
                    value={revenueTarget}
                    onChange={e => setRevenueTarget(Number(e.target.value))}
                    placeholder="10000"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">Unidades</span>
                  <Input
                    type="number"
                    value={unitsTarget}
                    onChange={e => setUnitsTarget(Number(e.target.value))}
                    placeholder="500"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">Visitas</span>
                  <Input
                    type="number"
                    value={visitsTarget}
                    onChange={e => setVisitsTarget(Number(e.target.value))}
                    placeholder="20"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Distribuidores - Solo Comerciales */}
          {role === 'comercial' && distributors.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
                🚚 Distribuidores Asignados
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {distributors.map(dist => (
                  <label key={dist.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDistributors.includes(dist.id)}
                      onChange={() => handleToggleDistributor(dist.id)}
                      className="w-4 h-4"
                    />
                    <span>{dist.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Permisos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              🔐 Permisos de Acceso
            </h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs font-medium text-gray-600 mb-2">
                <div>Módulo</div>
                <div className="text-center">Ver</div>
                <div className="text-center">Editar</div>
              </div>
              <div className="space-y-2">
                {MODULES.map(module => (
                  <div key={module.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
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
              <p className="text-xs text-gray-500 mt-3 italic">
                ℹ️ Al activar "Editar" se activa automáticamente "Ver"
              </p>
            </div>
          </div>
        </div>
      </SBDialogContent>
    </SBDialog>
  );
}
