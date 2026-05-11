"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import type { User, UserRole } from "@/domain/ssot";
import { ROLE_META } from "@/config/user-roles";
import { User as UserIcon, Mail, Phone, Shield } from "lucide-react";

interface UserGeneralTabProps {
  formData: Partial<User>;
  updateFormData: (updates: Partial<User>) => void;
  isNew: boolean;
}

const USER_ROLES: UserRole[] = ['owner', 'admin', 'comercial', 'ops', 'inversor', 'distribuidor'];

export function UserGeneralTab({ formData, updateFormData, isNew }: UserGeneralTabProps) {
  return (
    <div className="space-y-6">
      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Nombre Completo *
        </label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="Ej: Juan Pérez"
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Email {!isNew && <span className="text-muted-foreground text-xs">(opcional)</span>}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => updateFormData({ email: e.target.value })}
            placeholder="juan@example.com"
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Teléfono <span className="text-muted-foreground text-xs">(opcional)</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => updateFormData({ phone: e.target.value })}
            placeholder="+34 600 000 000"
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Rol */}
      <div>
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Shield size={18} />
          Rol del Usuario *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {USER_ROLES.map(role => {
            const meta = ROLE_META[role];
            const isSelected = formData.role === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => updateFormData({ role })}
                className={`p-4 border rounded-lg text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {meta.label}
                      {isSelected && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {meta.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Estado */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Estado
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => updateFormData({ active: true })}
            className={`flex-1 p-3 border rounded-lg text-center transition-all ${
              formData.active
                ? 'border-green-500 bg-green-50 text-green-800'
                : 'border-border hover:border-green-300'
            }`}
          >
            <div className="font-medium">✓ Activo</div>
            <div className="text-xs mt-1">El usuario puede acceder al sistema</div>
          </button>
          <button
            type="button"
            onClick={() => updateFormData({ active: false })}
            className={`flex-1 p-3 border rounded-lg text-center transition-all ${
              formData.active === false
                ? 'border-red-500 bg-red-50 text-red-800'
                : 'border-border hover:border-red-300'
            }`}
          >
            <div className="font-medium">✗ Inactivo</div>
            <div className="text-xs mt-1">El usuario no puede acceder</div>
          </button>
        </div>
      </div>

      {/* Info adicional según el rol */}
      {formData.role && (
        <div className="p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{ROLE_META[formData.role].icon}</span>
            <div>
              <div className="font-medium">{ROLE_META[formData.role].label}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {formData.role === 'comercial' && '• Gestiona ventas y tiene territorio asignado\n• Puede tener distribuidores asignados\n• Ve cuentas de su zona'}
                {formData.role === 'distribuidor' && '• Solo ve su zona de distribución\n• Acceso limitado a cuentas y pedidos\n• No puede modificar datos'}
                {formData.role === 'inversor' && '• Solo puede VER información\n• No puede crear ni editar nada\n• Ve reportes financieros'}
                {formData.role === 'admin' && '• Gestión completa del sistema\n• Acceso a todos los módulos\n• No puede cambiar configuración crítica'}
                {formData.role === 'owner' && '• Acceso total sin restricciones\n• Puede cambiar cualquier configuración\n• Gestiona usuarios y permisos'}
                {formData.role === 'ops' && '• Gestiona producción, almacén y calidad\n• Ve ventas para contexto\n• No acceso a finanzas ni admin'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
