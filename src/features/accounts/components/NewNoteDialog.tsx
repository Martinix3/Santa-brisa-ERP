'use client';

import * as React from 'react';
import { X } from 'lucide-react';

type NewNoteDialogProps = {
  open: boolean;
  onClose: () => void;
  accountId: string;
  onSave: (data: {
    accountId: string;
    content: string;
  }) => Promise<void>;
};

export function NewNoteDialog({
  open,
  onClose,
  accountId,
  onSave,
}: NewNoteDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [content, setContent] = React.useState('');

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setContent('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!content.trim()) {
      alert('El contenido de la nota es obligatorio');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        accountId,
        content: content.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error al guardar la nota');
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
            <h2 className="text-lg font-semibold">Nueva Nota</h2>
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
        <div className="flex-1 overflow-y-auto pb-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nota <span className="text-destructive">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[200px] px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y"
              placeholder="Escribe tu nota aquí..."
              autoFocus
            />
            <div className="text-xs text-muted-foreground mt-1">
              {content.length} caracteres
            </div>
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
              disabled={loading || !content.trim()}
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
