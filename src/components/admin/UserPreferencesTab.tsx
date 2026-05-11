"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import type { User } from "@/domain/ssot";
import { Settings, Globe, Bell } from "lucide-react";

interface UserPreferencesTabProps {
  formData: Partial<User>;
  updateFormData: (updates: Partial<User>) => void;
}

export function UserPreferencesTab({ formData, updateFormData }: UserPreferencesTabProps) {
  const preferences = formData.preferences || {};

  const updatePreferences = (updates: Partial<typeof preferences>) => {
    updateFormData({ preferences: { ...preferences, ...updates } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <Settings size={20} />
        <p className="text-sm">Configuración personal del usuario.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Globe size={16} />
          Idioma
        </label>
        <select
          value={preferences.language || 'es'}
          onChange={(e) => updatePreferences({ language: e.target.value as 'es' | 'en' })}
          className="w-full px-4 py-2 border border-border rounded-md"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4 flex items-center gap-2">
          <Bell size={16} />
          Notificaciones
        </label>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.notifications?.email ?? true}
              onChange={(e) => updatePreferences({
                notifications: {
                  email: e.target.checked,
                  push: preferences.notifications?.push ?? false,
                  sms: preferences.notifications?.sms ?? false
                }
              })}
              className="w-4 h-4"
            />
            <span className="text-sm">Notificaciones por Email</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.notifications?.push ?? true}
              onChange={(e) => updatePreferences({
                notifications: {
                  email: preferences.notifications?.email ?? false,
                  push: e.target.checked,
                  sms: preferences.notifications?.sms ?? false
                }
              })}
              className="w-4 h-4"
            />
            <span className="text-sm">Notificaciones Push</span>
          </label>
        </div>
      </div>
    </div>
  );
}
