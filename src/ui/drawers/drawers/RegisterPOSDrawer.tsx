/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/ui/drawers/drawers/RegisterPOSDrawer.tsx
'use client';
import React from 'react';
import { Monitor, Calendar, User, DollarSign, Package, CheckCircle } from 'lucide-react';
import { registerPOSInstallation } from '@/server/actions/sales-interactions.actions';
import { useData } from '@/lib/dataprovider';

interface RegisterPOSDrawerProps {
  accountId: string;
  accountName?: string;
  onClose: () => void;
}

export function RegisterPOSDrawer({
  accountId,
  accountName,
  onClose,
}: RegisterPOSDrawerProps) {
  const [installationDate, setInstallationDate] = React.useState(
    new Date().toISOString().split('T')[0]
  );
  const [posModel, setPosModel] = React.useState('');
  const [serialNumber, setSerialNumber] = React.useState('');
  const [monthlyFee, setMonthlyFee] = React.useState('');
  const [contractDuration, setContractDuration] = React.useState('12');
  const [technician, setTechnician] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [accessories, setAccessories] = React.useState({
    printer: false,
    scanner: false,
    cashDrawer: false,
    cardReader: false,
  });
  const [saving, setSaving] = React.useState(false);
  const { currentUser } = useData();

  const handleSave = async () => {
    if (!posModel.trim() || !serialNumber.trim()) {
      alert('Por favor completa los campos obligatorios');
      return;
    }

    if (!currentUser?.id) {
      alert('Usuario no identificado');
      return;
    }

    setSaving(true);
    try {
      const result = await registerPOSInstallation({
        accountId,
        model: posModel,
        serialNumber,
        installationDate,
        technician,
        monthlyFee: monthlyFee ? parseFloat(monthlyFee) : undefined,
        contractDuration: parseInt(contractDuration),
        accessories,
        notes,
        userId: currentUser.id,
      });

      if (result.success) {
        alert('POS registrado correctamente');
        onClose();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error registrando POS:', error);
      alert('Error al registrar el POS');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="sb-drawer sb-drawer--medium">
      <header className="sb-drawer__header">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Registrar Instalación POS
          </h3>
          {accountName && (
            <p className="text-sm text-muted-foreground mt-1">{accountName}</p>
          )}
        </div>
        <button className="sb-btn sb-btn--ghost" onClick={onClose}>
          ✕
        </button>
      </header>

      <div className="sb-drawer__body space-y-4">
        {/* Información del POS */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Información del POS</label>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Modelo de POS *
            </label>
            <input
              type="text"
              className="sb-input w-full"
              placeholder="Ej: Verifone V400m"
              value={posModel}
              onChange={(e) => setPosModel(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Número de Serie *
            </label>
            <input
              type="text"
              className="sb-input w-full"
              placeholder="Ej: SN123456789"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <Calendar className="w-3 h-3 inline" /> Fecha Instalación
              </label>
              <input
                type="date"
                className="sb-input w-full"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <User className="w-3 h-3 inline" /> Técnico
              </label>
              <input
                type="text"
                className="sb-input w-full"
                placeholder="Nombre técnico"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Contrato */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Contrato</label>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                <DollarSign className="w-3 h-3 inline" /> Cuota Mensual (€)
              </label>
              <input
                type="number"
                className="sb-input w-full"
                placeholder="0.00"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Duración (meses)
              </label>
              <select
                className="sb-input w-full"
                value={contractDuration}
                onChange={(e) => setContractDuration(e.target.value)}
              >
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
                <option value="36">36 meses</option>
              </select>
            </div>
          </div>
        </div>

        {/* Accesorios */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" />
            Accesorios Incluidos
          </label>
          
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'printer', label: 'Impresora' },
              { key: 'scanner', label: 'Escáner' },
              { key: 'cashDrawer', label: 'Cajón' },
              { key: 'cardReader', label: 'Lector Tarjetas' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="sb-checkbox"
                  checked={accessories[key as keyof typeof accessories]}
                  onChange={(e) =>
                    setAccessories({ ...accessories, [key]: e.target.checked })
                  }
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="sb-card-glass-light p-4 space-y-3">
          <label className="text-sm font-semibold">Notas de Instalación</label>
          <textarea
            className="sb-textarea w-full"
            rows={3}
            placeholder="Observaciones, incidencias, configuración especial..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Resumen */}
        <div className="sb-card-glass-light p-4 bg-green-50 dark:bg-green-900/10 border-l-4 border-l-green-500">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-green-800 dark:text-green-200">
                POS Activo
              </p>
              <p className="text-green-700 dark:text-green-300 mt-1">
                Al guardar, el POS quedará registrado como activo en esta cuenta.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="sb-drawer__footer">
        <button className="sb-btn sb-btn--ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button
          className="sb-btn sb-btn--primary"
          onClick={handleSave}
          disabled={saving || !posModel.trim() || !serialNumber.trim()}
        >
          {saving ? 'Guardando...' : 'Registrar POS'}
        </button>
      </footer>
    </aside>
  );
}
