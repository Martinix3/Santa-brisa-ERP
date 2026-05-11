"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import type { User } from "@/domain/ssot";
import { Map, MapPin } from "lucide-react";

interface UserTerritoryTabProps {
  formData: Partial<User>;
  updateFormData: (updates: Partial<User>) => void;
}

export function UserTerritoryTab({ formData, updateFormData }: UserTerritoryTabProps) {
  const territory = formData.territory || {};

  const updateTerritory = (updates: Partial<typeof territory>) => {
    updateFormData({
      territory: { ...territory, ...updates }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <Map size={20} />
        <p className="text-sm">Define la zona geográfica asignada a este usuario comercial.</p>
      </div>

      {/* Regiones */}
      <div>
        <label className="block text-sm font-medium mb-2">Regiones</label>
        <input
          type="text"
          value={territory.regions?.join(', ') || ''}
          onChange={(e) => updateTerritory({ 
            regions: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
          })}
          placeholder="Madrid, Cataluña, Valencia..."
          className="w-full px-4 py-2 border border-border rounded-md"
        />
        <p className="text-xs text-muted-foreground mt-1">Separa por comas</p>
      </div>

      {/* Provincias */}
      <div>
        <label className="block text-sm font-medium mb-2">Provincias (códigos)</label>
        <input
          type="text"
          value={territory.provinces?.join(', ') || ''}
          onChange={(e) => updateTerritory({ 
            provinces: e.target.value.split(',').map(p => p.trim()).filter(Boolean)
          })}
          placeholder="28, 08, 46..."
          className="w-full px-4 py-2 border border-border rounded-md"
        />
        <p className="text-xs text-muted-foreground mt-1">Códigos de provincia separados por comas</p>
      </div>

      {/* Códigos Postales */}
      <div>
        <label className="block text-sm font-medium mb-2">Códigos Postales</label>
        <textarea
          value={territory.postalCodes?.join(', ') || ''}
          onChange={(e) => updateTerritory({ 
            postalCodes: e.target.value.split(',').map(cp => cp.trim()).filter(Boolean)
          })}
          placeholder="28001, 28002, 08001..."
          rows={3}
          className="w-full px-4 py-2 border border-border rounded-md"
        />
        <p className="text-xs text-muted-foreground mt-1">Códigos postales específicos</p>
      </div>

      {/* Preview */}
      {((territory.regions ?? []).length || (territory.provinces ?? []).length || (territory.postalCodes ?? []).length) ? (
        <div className="p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin size={18} className="mt-0.5" />
            <div>
              <div className="font-medium mb-2">Territorio Asignado:</div>
              <div className="space-y-1 text-sm">
                {(territory.regions ?? []).length > 0 && (
                  <div>• Regiones: {(territory.regions ?? []).join(', ')}</div>
                )}
                {(territory.provinces ?? []).length > 0 && (
                  <div>• Provincias: {(territory.provinces ?? []).join(', ')}</div>
                )}
                {(territory.postalCodes ?? []).length > 0 && (
                  <div>• CP: {(territory.postalCodes ?? []).slice(0, 5).join(', ')}{(territory.postalCodes ?? []).length > 5 ? '...' : ''}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
