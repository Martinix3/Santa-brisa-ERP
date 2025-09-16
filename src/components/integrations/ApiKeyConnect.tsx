

"use client";
import React, { useState } from "react";
import Modal from "@/components/ui/Modal";

export default function ApiKeyConnect({
  open, onClose, provider, fields,
}: {
  open:boolean;
  onClose:()=>void;
  provider:"holded"|"sendcloud";
  fields: { name:string; label:string; type?:string; placeholder?:string }[];
}) {
  const [values, setValues] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e:React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/${provider}/connect`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error al conectar: ${err.error || 'revisa la clave'}`);
      } else {
        onClose();
        // Recargar la página para que el panel principal vea el nuevo estado
        window.location.reload();
      }
    } catch (e: any) {
      alert(`Fallo en la conexión: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Conectar ${provider.toUpperCase()}`}>
      <form onSubmit={submit} className="space-y-3">
        {fields.map(f => (
          <div key={f.name} className="space-y-1">
            <label className="text-sm text-slate-700">{f.label}</label>
            <input
              required
              type={f.type || "text"}
              placeholder={f.placeholder}
              className="w-full rounded-xl border px-3 py-2"
              value={values[f.name] || ""}
              onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-xl border">Cancelar</button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-xl bg-black text-white disabled:opacity-50">
            {loading ? 'Conectando...' : 'Conectar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
