"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useTransition } from 'react';
import type { Account, Stage, AccountType } from '@/domain/ssot';
import { updateAccount } from '../server-actions';
import { useRouter } from 'next/navigation';
import { uploadMultipleFiles } from '@/lib/firebase-storage';
import { generateAccountPhotoPath } from '@/lib/firebase-storage';
import { updateContactInfo } from '../server-actions';

const STAGES: Stage[] = ['POTENCIAL','SEGUIMIENTO','ACTIVA','FALLIDA','CERRADA','BAJA'];
const SEGMENTS: AccountType[] = ['HORECA','RETAIL','PRIVADA','ONLINE','OTRO','DISTRIBUIDOR'];

export default function AccountEditor({ initialAccount, initialNotes = [] as Array<{ id: string; text: string; createdAt: string }> }: { initialAccount: Account; initialNotes?: Array<{ id: string; text: string; createdAt: string }> }) {
  const [form, setForm] = useState<Partial<Account>>(initialAccount);
  const [notes, setNotes] = useState(initialNotes);
  const [emails, setEmails] = useState<string[]>([]);
  const [phones, setPhones] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onChange = (field: keyof Account, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const onSave = async () => {
    startTransition(async () => {
      const res = await updateAccount(form);
      if (res.success) {
        // Save contact info if provided
        try {
          if (emails.length || phones.length) {
            await updateContactInfo(initialAccount.id, { emails, phones });
          }
        } catch {}
        router.refresh();
      } else {
        alert(res.message || 'Error al guardar');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Datos básicos */}
      <section className="sb-card-glass-light p-4 space-y-3">
        <h3 className="font-semibold">Datos básicos</h3>
        <div>
          <label className="text-sm block mb-1">Nombre</label>
          <input className="sb-input w-full" value={form.name || ''} onChange={e => onChange('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm block mb-1">Segmento</label>
            <select className="sb-input w-full" value={form.segment || 'OTRO'} onChange={e => onChange('segment', e.target.value as Account['segment'])}>
              {SEGMENTS.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Stage</label>
            <select className="sb-input w-full" value={form.stage || 'POTENCIAL'} onChange={e => onChange('stage', e.target.value as Stage)}>
              {STAGES.map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Flow</label>
            <select className="sb-input w-full" value={form.flow || 'DIRECT'} onChange={e => onChange('flow', e.target.value as any)}>
              <option value="DIRECT">DIRECT</option>
              <option value="PLACEMENT">PLACEMENT</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm block mb-1">Propietario (ownerId)</label>
            <input className="sb-input w-full" value={form.ownerId || ''} onChange={e => onChange('ownerId', e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1">Distribuidor (partyId)</label>
            <input className="sb-input w-full" value={form.distributorPartyId || ''} onChange={e => onChange('distributorPartyId', e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input id="isTarget" type="checkbox" className="sb-checkbox" checked={!!form.isTarget} onChange={e => onChange('isTarget', e.target.checked)} />
          <label htmlFor="isTarget" className="text-sm">Marcar como Target</label>
        </div>
      </section>

      {/* Contacto */}
      <section className="sb-card-glass-light p-4 space-y-3">
        <h3 className="font-semibold">Contacto</h3>
        <MultiListEditor label="Emails" placeholder="email@dominio.com" value={emails} onChange={setEmails} />
        <MultiListEditor label="Teléfonos" placeholder="+34 600 000 000" value={phones} onChange={setPhones} />
        <div>
          <label className="text-sm block mb-1">CIF/NIF</label>
          <input className="sb-input w-full" value={(form as any).vat || ''} onChange={e => setForm(prev => ({ ...prev, vat: e.target.value }))} />
        </div>
      </section>

      {/* Información complementaria */}
      <section className="sb-card-glass-light p-4 space-y-3">
        <h3 className="font-semibold">Información complementaria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm block mb-1">Forma de pago</label>
            <select
              className="sb-input w-full"
              value={(form as any).external?.paymentMethod || ''}
              onChange={e => setForm(prev => ({
                ...prev,
                external: { ...(prev as any).external, paymentMethod: e.target.value }
              }))}
            >
              <option value="">-</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="DOMICILIACION">Domiciliación</option>
              <option value="PAYPAL">PayPal</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Condiciones de pago</label>
            <input
              className="sb-input w-full"
              placeholder="p.ej. 30D, contado"
              value={(form as any).external?.paymentTerms || ''}
              onChange={e => setForm(prev => ({
                ...prev,
                external: { ...(prev as any).external, paymentTerms: e.target.value }
              }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm block mb-1">Tipo de local</label>
            <select
              className="sb-input w-full"
              value={(form as any).external?.venueType || ''}
              onChange={e => setForm(prev => ({
                ...prev,
                external: { ...(prev as any).external, venueType: e.target.value }
              }))}
            >
              <option value="">-</option>
              <option value="BAR">Bar</option>
              <option value="CAFETERIA">Cafetería</option>
              <option value="RESTAURANTE">Restaurante</option>
              <option value="HOTEL">Hotel</option>
              <option value="TIENDA">Tienda</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Tags</label>
            <TagEditor value={(form.tags as any) || []} onChange={(tags) => setForm(prev => ({ ...prev, tags }))} />
          </div>
        </div>
      </section>

      {/* Fotos y notas */}
      <section className="sb-card-glass-light p-4 space-y-3 lg:col-span-2">
        <h3 className="font-semibold">Fotos y notas</h3>
        <PhotoManager form={form} setForm={setForm} accountId={initialAccount.id} />
        {/* Existing notes */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Notas</h4>
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay notas aún.</p>
          ) : (
            <ul className="space-y-2">
              {notes.map(n => (
                <li key={n.id} className="p-3 bg-secondary/20 rounded border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">{new Date(n.createdAt).toLocaleString('es-ES')}</div>
                  <div className="text-sm whitespace-pre-wrap">{n.text}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <NoteCreator accountId={initialAccount.id} onAdded={(newNote) => setNotes(prev => [{ id: newNote.id, text: newNote.text, createdAt: newNote.createdAt }, ...prev])} />
      </section>

      {/* Ubicación */}
      <section className="sb-card-glass-light p-4 space-y-3">
        <h3 className="font-semibold">Ubicación</h3>
        <div>
          <label className="text-sm block mb-1">Dirección</label>
          <input
            className="sb-input w-full"
            value={form.location?.address || ''}
            onChange={e =>
              setForm(prev => ({
                ...prev,
                location: {
                  lat: prev.location?.lat ?? 0,
                  lng: prev.location?.lng ?? 0,
                  address: e.target.value,
                },
              }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm block mb-1">Lat</label>
            <input
              className="sb-input w-full"
              value={form.location?.lat ?? ''}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  location: {
                    lat: parseFloat(e.target.value) || 0,
                    lng: prev.location?.lng ?? 0,
                    address: prev.location?.address,
                  },
                }))}
            />
          </div>
          <div>
            <label className="text-sm block mb-1">Lng</label>
            <input
              className="sb-input w-full"
              value={form.location?.lng ?? ''}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  location: {
                    lat: prev.location?.lat ?? 0,
                    lng: parseFloat(e.target.value) || 0,
                    address: prev.location?.address,
                  },
                }))}
            />
          </div>
        </div>
      </section>

      {/* Acciones */}
      <div className="lg:col-span-2 flex justify-end gap-2">
        <button className="sb-btn sb-btn--secondary" onClick={() => window.history.back()} disabled={pending}>Cancelar</button>
        <button className="sb-btn sb-btn--primary" onClick={onSave} disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function TagEditor({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');
  const addTag = () => {
    const t = input.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...(value || []), t]);
    setInput('');
  };
  const remove = (tag: string) => onChange((value || []).filter(t => t !== tag));
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input className="sb-input flex-1" placeholder="Añadir tag" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
        <button className="sb-btn sb-btn--secondary" type="button" onClick={addTag}>Añadir</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(value || []).map(tag => (
          <span key={tag} className="sb-badge sb-badge--default cursor-pointer" onClick={() => remove(tag)} title="Eliminar">{tag} ×</span>
        ))}
      </div>
    </div>
  );
}

function PhotoManager({ form, setForm, accountId }: { form: Partial<Account>; setForm: React.Dispatch<React.SetStateAction<Partial<Account>>>; accountId: string }) {
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    const photos = Array.from(new Set([...(form.photos || []), u]));
    setForm(prev => ({ ...prev, photos }));
    setUrl('');
  };
  const upload = async () => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const basePath = generateAccountPhotoPath(accountId);
      const arr = Array.from(files);
      const { urls, errors } = await uploadMultipleFiles(arr, basePath);
      if (errors.length) {
        console.error('Upload errors:', errors);
        alert(`Errores subiendo archivos: ${errors.join(', ')}`);
      }
      if (urls.length) {
        const photos = Array.from(new Set([...(form.photos || []), ...urls]));
        setForm(prev => ({ ...prev, photos }));
      }
    } finally {
      setUploading(false);
      setFiles(null);
    }
  };
  const removePhoto = (u: string) => {
    setForm(prev => ({ ...prev, photos: (prev.photos || []).filter(p => p !== u) }));
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(form.photos || []).map((p) => (
          <div key={p} className="relative group">
            <img src={p} alt="foto" className="w-full h-32 object-cover rounded-lg border" />
            <button type="button" className="absolute top-2 right-2 sb-btn sb-btn--ghost sb-btn--sm opacity-0 group-hover:opacity-100" onClick={() => removePhoto(p)}>Quitar</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="sb-input flex-1" placeholder="URL de foto" value={url} onChange={e => setUrl(e.target.value)} />
        <button className="sb-btn sb-btn--secondary" type="button" onClick={addUrl}>Añadir foto</button>
      </div>
      <div className="flex items-center gap-2">
        <input type="file" multiple onChange={e => setFiles(e.target.files)} />
        <button className="sb-btn sb-btn--primary" type="button" onClick={upload} disabled={uploading || !files || files.length === 0}>
          {uploading ? 'Subiendo…' : 'Subir fotos'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Subida directa pendiente de configurar. Por ahora, pega una URL (Drive, iCloud, etc.).</p>
    </div>
  );
}

function NoteCreator({ accountId, onAdded }: { accountId: string; onAdded?: (n: { id: string; text: string; createdAt: string }) => void }) {
  const [text, setText] = useState('');
  const [pending, startTransition] = useTransition();
  const add = () => {
    const t = text.trim();
    if (!t) return;
    startTransition(async () => {
      const resMod = await import('../server-actions');
      const res = await resMod.addAccountNote(accountId, t);
      if (!res.success) alert(res.message || 'Error guardando la nota');
      setText('');
      if (res.success && onAdded) {
        onAdded({ id: Math.random().toString(36).slice(2), text: t, createdAt: new Date().toISOString() });
      }
    });
  };
  return (
    <div className="space-y-2">
      <label className="text-sm block">Nueva nota</label>
      <textarea className="sb-textarea" rows={3} placeholder="Escribe una nota…" value={text} onChange={e => setText(e.target.value)} />
      <div className="flex justify-end">
        <button className="sb-btn sb-btn--secondary" type="button" onClick={add} disabled={pending}>{pending ? 'Guardando…' : 'Añadir nota'}</button>
      </div>
    </div>
  );
}

function MultiListEditor({ label, value, onChange, placeholder }: { label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...(value || []), v]);
    setInput('');
  };
  const remove = (v: string) => onChange((value || []).filter(x => x !== v));
  return (
    <div>
      <label className="text-sm block mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input className="sb-input flex-1" placeholder={placeholder || ''} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button className="sb-btn sb-btn--secondary" type="button" onClick={add}>Añadir</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(value || []).map(v => (
          <span key={v} className="sb-badge sb-badge--default cursor-pointer" onClick={() => remove(v)} title="Eliminar">{v} ×</span>
        ))}
      </div>
    </div>
  );
}
