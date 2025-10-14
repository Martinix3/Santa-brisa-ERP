"use client";

import type { User } from "@/domain/ssot";
import { SYSTEM_MODULES, getDefaultPermissionsForRole } from "@/config/user-roles";
import { Shield, Eye, Plus, Edit, Trash, Check } from "lucide-react";

interface UserPermissionsTabProps {
  formData: Partial<User>;
  updateFormData: (updates: Partial<User>) => void;
}

export function UserPermissionsTab({ formData, updateFormData }: UserPermissionsTabProps) {
  const isReadOnly = formData.role === 'inversor';
  const permissions = formData.permissions || (formData.role ? getDefaultPermissionsForRole(formData.role) : undefined);

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-800">
            <Shield size={18} />
            <div>
              <div className="font-medium">Permisos de Solo Lectura</div>
              <div className="text-sm mt-1">El rol Inversor solo puede VER información, sin crear ni editar.</div>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm text-muted-foreground mb-4">
        Permisos asignados automáticamente según el rol seleccionado. Estos permisos determinan qué módulos puede ver y editar el usuario.
      </div>

      {permissions && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Módulo</th>
                <th className="px-4 py-3 text-center text-sm font-medium"><Eye size={16} className="mx-auto" /></th>
                <th className="px-4 py-3 text-center text-sm font-medium"><Plus size={16} className="mx-auto" /></th>
                <th className="px-4 py-3 text-center text-sm font-medium"><Edit size={16} className="mx-auto" /></th>
                <th className="px-4 py-3 text-center text-sm font-medium"><Trash size={16} className="mx-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(permissions.modules).map(([moduleId, perm]) => {
                const moduleName = SYSTEM_MODULES[moduleId as keyof typeof SYSTEM_MODULES] || moduleId;
                return (
                  <tr key={moduleId} className="hover:bg-secondary/50">
                    <td className="px-4 py-3 text-sm">{moduleName}</td>
                    <td className="px-4 py-3 text-center">{perm.view && <Check size={16} className="mx-auto text-green-600" />}</td>
                    <td className="px-4 py-3 text-center">{perm.create && <Check size={16} className="mx-auto text-green-600" />}</td>
                    <td className="px-4 py-3 text-center">{perm.edit && <Check size={16} className="mx-auto text-green-600" />}</td>
                    <td className="px-4 py-3 text-center">{perm.delete && <Check size={16} className="mx-auto text-green-600" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
