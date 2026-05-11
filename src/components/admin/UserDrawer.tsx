"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from "react";
import type { User, UserRole } from "@/domain/ssot";
import { X, Save, Loader2 } from "lucide-react";
import { ROLE_META, roleHasTerritory, roleCanHaveDistributors } from "@/config/user-roles";
import { createUser, updateUser } from "@/app/(app)/admin/users/actions";
import { UserGeneralTab } from "./UserGeneralTab";
import { UserPermissionsTab } from "./UserPermissionsTab";
import { UserTerritoryTab } from "./UserTerritoryTab";
import { UserDistributorsTab } from "./UserDistributorsTab";
import { UserKPIsTab } from "./UserKPIsTab";
import { UserPreferencesTab } from "./UserPreferencesTab";

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null; // null = nuevo usuario
  onSuccess: () => void;
}

type TabId = 'general' | 'permissions' | 'territory' | 'distributors' | 'kpis' | 'preferences';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

export function UserDrawer({ isOpen, onClose, user, onSuccess }: UserDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [formData, setFormData] = useState<Partial<User>>(user || {});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form cuando cambia el usuario
  useEffect(() => {
    if (user) {
      setFormData(user);
    } else {
      setFormData({
        active: true,
        role: 'comercial',
      });
    }
    setActiveTab('general');
    setError(null);
  }, [user, isOpen]);

  // Obtener tabs visibles según el rol
  const getVisibleTabs = (): Tab[] => {
    const role = formData.role;
    if (!role) return [{ id: 'general', label: 'General', icon: '📋' }];

    const baseTabs: Tab[] = [
      { id: 'general', label: 'General', icon: '📋' },
      { id: 'permissions', label: 'Permisos', icon: '🔐' },
    ];

    const salesTabs: Tab[] = [];
    if (roleHasTerritory(role)) {
      salesTabs.push({ id: 'territory', label: 'Territorio', icon: '🗺️' });
    }
    if (roleCanHaveDistributors(role)) {
      salesTabs.push({ id: 'distributors', label: 'Distribuidores', icon: '🏢' });
    }
    if (role === 'comercial' || role === 'distribuidor') {
      salesTabs.push({ id: 'kpis', label: 'KPIs', icon: '🎯' });
    }

    const allRolesTabs: Tab[] = [
      { id: 'preferences', label: 'Preferencias', icon: '⚙️' },
    ];

    return [...baseTabs, ...salesTabs, ...allRolesTabs];
  };

  const visibleTabs = getVisibleTabs();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      if (user) {
        // Actualizar usuario existente
        const result = await updateUser(user.id, formData);
        if (!result.success) {
          setError(result.error || 'Error al actualizar usuario');
          return;
        }
      } else {
        // Crear nuevo usuario
        if (!formData.name || !formData.role) {
          setError('Nombre y rol son requeridos');
          return;
        }
        const result = await createUser(formData as Omit<User, 'id' | 'createdAt' | 'updatedAt'>);
        if (!result.success) {
          setError(result.error || 'Error al crear usuario');
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError('Error inesperado al guardar');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const updateFormData = (updates: Partial<User>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setError(null);
  };

  if (!isOpen) return null;

  const roleMeta = formData.role ? ROLE_META[formData.role] : null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background z-50 shadow-xl flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {user ? 'Editar Usuario' : 'Nuevo Usuario'}
              {roleMeta && (
                <span className="text-lg">{roleMeta.icon}</span>
              )}
            </h2>
            {roleMeta && (
              <p className="text-sm text-muted-foreground mt-1">
                {roleMeta.label} - {roleMeta.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6 flex gap-2 overflow-x-auto">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
              {error}
            </div>
          )}

          {activeTab === 'general' && (
            <UserGeneralTab
              formData={formData}
              updateFormData={updateFormData}
              isNew={!user}
            />
          )}
          {activeTab === 'permissions' && (
            <UserPermissionsTab
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {activeTab === 'territory' && (
            <UserTerritoryTab
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {activeTab === 'distributors' && (
            <UserDistributorsTab
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {activeTab === 'kpis' && (
            <UserKPIsTab
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
          {activeTab === 'preferences' && (
            <UserPreferencesTab
              formData={formData}
              updateFormData={updateFormData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
