'use client';

import * as React from 'react';
import { X } from 'lucide-react';

type NewContactPersonDialogProps = {
  open: boolean;
  onClose: () => void;
  accountId: string;
  onSave: (data: {
    accountId: string;
    name: string;
    role?: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
};

export function NewContactPersonDialog({
  open,
  onClose,
  accountId,
  onSave,
}: NewContactPersonDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setName('');
      setRole('');
      setEmail('');
      setPhone('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        accountId,
        name: name.trim(),
        role: role.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error saving contact person:', error);
      alert('Error al guardar la persona de contacto');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div className="sb-drawer__overlay" onClick={onClose} />

      {/* Drawer */}
      <aside className="sb-drawer">
        {/* Header */}
        <div className="sb-drawer__header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Nueva Persona de Contacto</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-secondary/50 transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nombre <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Nombre completo"
              autoFocus
            />
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Cargo
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Ej: Gerente, Propietario..."
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="email@ejemplo.com"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="600 123 456"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sb-drawer__footer">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm text-sm font-medium hover:bg-background/60 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
