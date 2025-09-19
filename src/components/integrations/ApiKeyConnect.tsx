
"use client";

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { Input, SBButton } from '@/components/ui/ui-primitives';

type Field = { name: string; label: string; placeholder: string };

interface ApiKeyConnectProps {
  open: boolean;
  onClose: () => void;
  provider: 'holded' | 'sendcloud';
  fields: Field[];
}

export default function ApiKeyConnect({ open, onClose, provider, fields }: ApiKeyConnectProps) {
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSecrets({});
      setLoading(false);
      setError(null);
    }
  }, [open]);

  const handleInputChange = (name: string, value: string) => {
    setSecrets(prev => ({ ...prev, [name]: value }));
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/${provider}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(secrets),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || `Error al conectar con ${provider}.`);
      }

      alert(`¡Conectado con ${provider} con éxito!`);
      onClose();
      window.location.reload(); 
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Conectar con ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}>
        <form onSubmit={(e) => { e.preventDefault(); handleConnect(); }} className="space-y-4">
            <p className="text-sm text-zinc-600">Introduce tus credenciales de API para continuar.</p>
            <div className="space-y-4">
                {fields.map(field => (
                    <label key={field.name} className="grid gap-1.5">
                        <span className="text-sm font-medium text-zinc-700">{field.label}</span>
                        <Input
                            type="password"
                            value={secrets[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            required
                        />
                    </label>
                ))}
                {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</p>}
            </div>
             <div className="flex justify-end gap-2 pt-4">
                <SBButton type="button" variant="secondary" onClick={onClose}>Cancelar</SBButton>
                <SBButton type="submit" disabled={loading}>
                    {loading ? 'Conectando...' : 'Conectar'}
                </SBButton>
            </div>
        </form>
    </Modal>
  );
}
