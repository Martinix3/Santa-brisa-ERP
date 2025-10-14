"use client";

import type { User } from "@/domain/ssot";
import { Building2 } from "lucide-react";

interface UserDistributorsTabProps {
  formData: Partial<User>;
  updateFormData: (updates: Partial<User>) => void;
}

export function UserDistributorsTab({ formData, updateFormData }: UserDistributorsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <Building2 size={20} />
        <p className="text-sm">Gestiona los distribuidores asignados a este comercial.</p>
      </div>
      
      <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
        <Building2 size={48} className="mx-auto mb-4 opacity-50" />
        <p>Gestión de distribuidores disponible próximamente</p>
      </div>
    </div>
  );
}
