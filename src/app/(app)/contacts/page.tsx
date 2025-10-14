'use client';

import * as React from 'react';
import { 
  listContacts, 
  getContactDetail, 
  detectDuplicates,
  geocodeAddresses,
  mergeAccounts,
  bulkUpdateContacts,
  createContact,
  type ContactRow, 
  type ContactType 
} from './actions';
import {
  exportContactsTemplate,
  validateImportData,
  validateJsonImport,
  importContacts,
  importJsonContacts,
  type ValidationResult,
} from './import-export.actions';
import { Search, Download, Upload, Copy, MapPin, AlertCircle, CheckSquare, Square, FileText, Phone, Mail, Globe, Navigation, Plus, Target, Calendar, Package, Palette } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const cn = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join(' ');

export default function ContactsPage() {
  const router = useRouter();
  
  // Filtros
  const [type, setType] = React.useState<ContactType>('all');
  const [segment, setSegment] = React.useState<string>('all');
  const [city, setCity] = React.useState<string>('all');
  const [q, setQ] = React.useState('');

  // Datos
  const [rows, setRows] = React.useState<ContactRow[]>([]);
  const [cursor, setCursor] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);

  // Selección múltiple
  const [selected, setSelected] = React.useState<string[]>([]);
  
  // Dialogs
  const [duplicatesOpen, setDuplicatesOpen] = React.useState(false);
  const [enrichOpen, setEnrichOpen] = React.useState(false);
  const [bulkEditOpen, setBulkEditOpen] = React.useState(false);
  const [newContactOpen, setNewContactOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const [duplicateGroups, setDuplicateGroups] = React.useState<any[]>([]);
  const [detectingDups, setDetectingDups] = React.useState(false);
  
  // Quick action modals
  const [quickActionOpen, setQuickActionOpen] = React.useState<'interaction' | 'order' | 'event' | 'pos' | null>(null);
  
  // Import/Export state
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importFileType, setImportFileType] = React.useState<'csv' | 'json'>('csv');
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  // New contact form
  const [newContactTab, setNewContactTab] = React.useState<'basic' | 'address'>('basic');
  const [newName, setNewName] = React.useState('');
  const [newTradeName, setNewTradeName] = React.useState('');
  const [newType, setNewType] = React.useState<'client' | 'supplier'>('client');
  const [newSegment, setNewSegment] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const [newMobile, setNewMobile] = React.useState('');
  const [newCity, setNewCity] = React.useState('');
  const [newCif, setNewCif] = React.useState('');
  const [newStreet, setNewStreet] = React.useState('');
  const [newPostalCode, setNewPostalCode] = React.useState('');
  const [newProvince, setNewProvince] = React.useState('');
  const [newCountry, setNewCountry] = React.useState('España');

  // Edit mode
  const [editMode, setEditMode] = React.useState(false);
  const [editedRows, setEditedRows] = React.useState<Record<string, Partial<ContactRow>>>({});
  
  const toggleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === rows.length) {
      setSelected([]);
    } else {
      setSelected(rows.map(r => r.id));
    }
  };

  const updateField = (id: string, field: keyof ContactRow, value: any) => {
    setEditedRows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const getFieldValue = (row: ContactRow, field: keyof ContactRow) => {
    return editedRows[row.id]?.[field] ?? row[field];
  };

  // Load contacts
  const load = React.useCallback(async (opts?: { reset?: boolean }) => {
    setLoading(true);
    try {
      const res = await listContacts({
        type,
        segment: segment !== 'all' ? segment : undefined,
        city: city !== 'all' ? city : undefined,
        q,
        pageSize: 25,
        cursor: opts?.reset ? null : cursor,
      });
      setRows(prev => opts?.reset ? res.rows : [...prev, ...res.rows]);
      setCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [type, segment, city, q, cursor]);

  // Reload on filter change
  React.useEffect(() => {
    load({ reset: true });
  }, [type, segment, city, q]);

  const openDrawer = (row: ContactRow) => {
    router.push(`/contacts/${row.id}`, { scroll: false });
  };

  const getTypeLabel = (originType: string) => {
    if (originType === 'client') return 'Cliente';
    if (originType === 'supplier') return 'Proveedor';
    if (originType === 'customer') return 'Online';
    return originType;
  };

  return (
    <div className="sb-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="sb-page__title">Contactos</h1>
          <p className="sb-page__subtitle">{rows.length} contactos</p>
        </div>
      </div>

      <div className="sb-page__content">
        {/* Toolbar */}
        <div className="sb-toolbar">
        <select
          className="sb-select"
          value={type}
          onChange={e => setType(e.target.value as ContactType)}
        >
          <option value="all">Todos</option>
          <option value="client">Clientes</option>
          <option value="customer">Online</option>
          <option value="supplier">Proveedores</option>
        </select>

        <select
          className="sb-select"
          value={segment}
          onChange={e => setSegment(e.target.value)}
        >
          <option value="all">Todos los segmentos</option>
          <option value="HORECA">HORECA</option>
          <option value="RETAIL">RETAIL</option>
          <option value="DISTRIBUIDOR">DISTRIBUIDOR</option>
          <option value="CATERING">CATERING</option>
          <option value="PRIVADA">PRIVADA</option>
          <option value="ONLINE">ONLINE</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            className="sb-input pl-10"
            placeholder="Buscar nombre, NIF, ciudad..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        <button 
          onClick={async () => {
            setDetectingDups(true);
            try {
              const groups = await detectDuplicates();
              setDuplicateGroups(groups);
              setDuplicatesOpen(true);
            } finally {
              setDetectingDups(false);
            }
          }}
          disabled={detectingDups}
          className="sb-btn sb-btn--ghost sb-btn--sm"
        >
          <AlertCircle size={14} />
          {detectingDups ? 'Detectando...' : 'Duplicados'}
        </button>
        
        {/* Export Menu */}
        <div className="relative">
          <button 
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="sb-btn sb-btn--ghost sb-btn--sm"
          >
            <Download size={14} />
            Exportar
          </button>
          
          {exportMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setExportMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-56 z-50 overflow-hidden rounded-xl border shadow-lg sb-card-glass-light">
                <button
                  onClick={async () => {
                    setExportMenuOpen(false);
                    const csv = `Nombre,NIF,Email,Tel,Ciudad,Segmento\n${rows.map(r => 
                      `"${r.name}","${r.cif || ''}","${r.email || ''}","${r.phone || ''}","${r.city || ''}","${r.segment || ''}"`
                    ).join('\n')}`;
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `contacts_simple_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-accent/50"
                >
                  <Download size={14} />
                  <div>
                    <div className="font-medium">Export simple</div>
                    <div className="text-xs text-muted-foreground">Solo datos básicos</div>
                  </div>
                </button>
                
                <button
                  onClick={async () => {
                    setExportMenuOpen(false);
                    setExporting(true);
                    try {
                      const result = await exportContactsTemplate({
                        includeMetadata: true,
                        filters: { type, segment: segment !== 'all' ? segment : undefined }
                      });
                      const blob = new Blob([result.csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = result.filename;
                      a.click();
                    } catch (error: any) {
                      alert('Error: ' + error.message);
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors hover:bg-accent/50 border-t border-border/30 disabled:opacity-50"
                >
                  <FileText size={14} />
                  <div>
                    <div className="font-medium">Plantilla completa</div>
                    <div className="text-xs text-muted-foreground">Con metadatos para importar</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Import Button */}
        <button 
          onClick={() => setImportOpen(true)}
          className="sb-btn sb-btn--ghost sb-btn--sm"
        >
          <Upload size={14} />
          Importar
        </button>
        
        {!editMode && (
          <button 
            onClick={() => setEditMode(true)}
            className="sb-btn sb-btn--primary sb-btn--sm"
          >
            Editar
          </button>
        )}
        
        <button 
          onClick={() => setNewContactOpen(true)}
          className="sb-btn sb-btn--secondary sb-btn--sm"
        >
          Nuevo contacto
        </button>
      </div>

      {/* Edit Mode Bar */}
      {editMode && (
        <div className="sb-card bg-primary/10 border-primary/40">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm text-primary">
              Modo edición activo · {Object.keys(editedRows).length} cambio{Object.keys(editedRows).length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
            <button
              onClick={async () => {
                if (Object.keys(editedRows).length === 0) {
                  setEditMode(false);
                  return;
                }
                
                if (!confirm(`¿Guardar ${Object.keys(editedRows).length} cambio(s)?`)) return;
                
                try {
                  // Guardar cada contacto editado
                  for (const [id, changes] of Object.entries(editedRows)) {
                    await bulkUpdateContacts({ ids: [id], updates: changes as any });
                  }
                  
                  alert(`✅ ${Object.keys(editedRows).length} contacto(s) actualizado(s)`);
                  setEditMode(false);
                  setEditedRows({});
                  load({ reset: true });
                } catch (error: any) {
                  alert('Error: ' + error.message);
                }
              }}
              className="sb-btn sb-btn--primary"
            >
              Guardar cambios
            </button>
            <button
              onClick={() => {
                if (Object.keys(editedRows).length > 0) {
                  if (!confirm('¿Descartar todos los cambios?')) return;
                }
                setEditMode(false);
                setEditedRows({});
              }}
              className="sb-btn sb-btn--secondary"
            >
              Cancelar
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {!editMode && selected.length > 0 && (
        <div className="sb-card">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm">
              {selected.length} contacto{selected.length > 1 ? 's' : ''} seleccionado{selected.length > 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
            <button
              onClick={() => {
                setEditMode(true);
                setSelected([]);
              }}
              className="sb-btn sb-btn--primary"
            >
              Editar
            </button>
            <button
              onClick={() => setEnrichOpen(true)}
              className="sb-btn sb-btn--ghost"
            >
              <MapPin size={14} />
              Geocodificar
            </button>
            <button
              onClick={() => setSelected([])}
              className="sb-btn sb-btn--ghost"
            >
              Cancelar
            </button>
            </div>
          </div>
        </div>
      )}

        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th className="w-12">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectAll();
                      }}
                      className="p-1 hover:bg-muted/50 rounded"
                    >
                      {selected.length === rows.length && rows.length > 0 ? (
                        <CheckSquare size={18} className="text-primary" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Segmento</th>
                  <th>Ciudad</th>
                  <th>Contacto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>
                      {!editMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(r.id);
                          }}
                          className="p-1 hover:bg-muted/50 rounded"
                        >
                          {selected.includes(r.id) ? (
                            <CheckSquare size={18} className="text-primary" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      )}
                    </td>
                    
                    {/* Nombre */}
                    <td>
                      {editMode ? (
                        <input
                          type="text"
                          value={String(getFieldValue(r, 'name') || '')}
                          onChange={(e) => updateField(r.id, 'name', e.target.value)}
                          className="sb-input h-8 px-2"
                        />
                      ) : (
                        <button
                          onClick={() => openDrawer(r)}
                          className="font-medium hover:text-primary"
                        >
                          {r.name}
                        </button>
                      )}
                    </td>
                    
                    {/* Tipo */}
                    <td>
                      {editMode ? (
                        <select
                          value={getFieldValue(r, 'originType')}
                          onChange={(e) => updateField(r.id, 'originType', e.target.value)}
                          className="sb-select h-8"
                        >
                          <option value="client">Cliente</option>
                          <option value="supplier">Proveedor</option>
                          <option value="customer">Online</option>
                        </select>
                      ) : (
                        <span>{getTypeLabel(r.originType)}</span>
                      )}
                    </td>
                    
                    {/* Segmento */}
                    <td>
                      {editMode ? (
                        <select
                          value={String(getFieldValue(r, 'segment') ?? '')}
                          onChange={(e) => updateField(r.id, 'segment', e.target.value || undefined)}
                          className="sb-select h-8"
                        >
                          <option value="">—</option>
                          <option value="HORECA">HORECA</option>
                          <option value="RETAIL">RETAIL</option>
                          <option value="DISTRIBUIDOR">DISTRIBUIDOR</option>
                          <option value="CATERING">CATERING</option>
                          <option value="PRIVADA">PRIVADA</option>
                          <option value="ONLINE">ONLINE</option>
                        </select>
                      ) : (
                        <span>{r.segment ?? '—'}</span>
                      )}
                    </td>
                    
                    {/* Ciudad */}
                    <td>
                      {editMode ? (
                        <input
                          type="text"
                          value={getFieldValue(r, 'city') ?? ''}
                          onChange={(e) => updateField(r.id, 'city', e.target.value || undefined)}
                          className="sb-input h-8 px-2"
                          placeholder="Ciudad"
                        />
                      ) : (
                        <span>{r.city ?? '—'}</span>
                      )}
                    </td>
                    
                    {/* Contacto */}
                    <td className="text-muted-foreground">{r.email ?? r.phone ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!rows.length && !loading && (
              <div className="sb-empty">
                <p className="sb-empty__description">No hay contactos</p>
              </div>
            )}
            {loading && rows.length === 0 && (
              <div className="sb-empty">
                <p className="sb-empty__description">Cargando...</p>
              </div>
            )}
          </div>
        </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {rows.map(r => (
          <button
            key={r.id}
            onClick={() => openDrawer(r)}
            className="sb-card text-left hover:bg-accent/50 transition-colors"
          >
            <div className="font-medium">{r.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {getTypeLabel(r.originType)} · {r.segment ?? '—'} · {r.city ?? '—'}
            </div>
            {r.email && <div className="text-sm mt-1 text-muted-foreground">{r.email}</div>}
            {r.phone && <div className="text-sm text-muted-foreground">{r.phone}</div>}
          </button>
        ))}
        {!rows.length && !loading && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No hay contactos
          </div>
        )}
      </div>

      {/* Pagination */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            className="sb-btn sb-btn--secondary"
            disabled={loading}
            onClick={() => load({ reset: false })}
          >
            {loading ? 'Cargando...' : 'Cargar más'}
          </button>
        </div>
      )}

      {/* Duplicates Dialog */}
      {duplicatesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="relative bg-background/70 backdrop-blur-xl rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-border/50 ring-1 ring-black/5">
            <h2 className="text-lg font-semibold mb-4">
              Duplicados Detectados ({duplicateGroups.length} grupos)
            </h2>
            
            {duplicateGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ✅ No se encontraron duplicados
              </div>
            ) : (
              <div className="space-y-4">
                {duplicateGroups.map((group, idx) => (
                  <div key={idx} className="border border-border/40 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      {group.reason} · {Math.round(group.confidence * 100)}% confianza
                    </div>
                    <div className="space-y-2">
                      {group.accounts.map((acc: any) => (
                        <div key={acc.id} className="flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border/30">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{acc.name}</div>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                {acc.collection === 'parties' ? '📋 Cliente' : 
                                 acc.collection === 'suppliers' ? '📦 Proveedor' : 
                                 '🛒 Online'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {acc.billingAddress?.city || acc.city || '—'} · {acc.vat || acc.fiscalId || 'Sin NIF'}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm('¿Fusionar duplicados en esta cuenta?')) {
                                const others = group.accounts.filter((a: any) => a.id !== acc.id).map((a: any) => a.id);
                                await mergeAccounts(acc.id, others);
                                alert('Duplicados fusionados');
                                setDuplicatesOpen(false);
                                load({ reset: true });
                              }
                            }}
                            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90"
                          >
                            Mantener esta
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setDuplicatesOpen(false)}
              className="w-full mt-4 px-4 py-2 rounded-xl bg-background border border-border/40 text-sm font-medium hover:bg-background/80"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Geocode Dialog */}
      {enrichOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="relative bg-background/70 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border/50 ring-1 ring-black/5">
            <h2 className="text-lg font-semibold mb-4">Geocodificar Direcciones</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Se geocodificarán {selected.length} contactos con Google Maps API
            </p>
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-sm mb-4">
              ⚠️ Requiere configurar GOOGLE_MAPS_API_KEY en .env.local
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setEnrichOpen(false)}
                className="px-4 py-2 rounded-xl bg-background border border-border/40 text-sm font-medium hover:bg-background/80"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    await geocodeAddresses(selected);
                    alert('Direcciones geocodificadas');
                    setEnrichOpen(false);
                    setSelected([]);
                    load({ reset: true });
                  } catch (error: any) {
                    alert('Error: ' + error.message);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Geocodificar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Contact Dialog - Completo */}
      {newContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setNewContactOpen(false)}
          />
          <div className="relative bg-background/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-border/50 ring-1 ring-black/5">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/30">
              <h2 className="text-lg font-semibold">Nuevo Contacto</h2>
              
              {/* Tabs */}
              <nav className="grid grid-cols-2 text-sm border-b border-border/30 -mx-6 px-6 mt-4 -mb-4">
                <button
                  className={`py-3 font-medium transition-colors ${
                    newContactTab === 'basic'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setNewContactTab('basic')}
                >
                  Básico
                </button>
                <button
                  className={`py-3 font-medium transition-colors ${
                    newContactTab === 'address'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setNewContactTab('address')}
                >
                  Dirección
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
              {newContactTab === 'basic' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Nombre <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Nombre del contacto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Nombre comercial
                    </label>
                    <input
                      type="text"
                      value={newTradeName}
                      onChange={e => setNewTradeName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Nombre comercial"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">NIF/CIF</label>
                    <input
                      type="text"
                      value={newCif}
                      onChange={e => setNewCif(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="B12345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Tipo *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setNewType('client')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          newType === 'client'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/50 hover:bg-secondary'
                        }`}
                      >
                        Cliente
                      </button>
                      <button
                        onClick={() => setNewType('supplier')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          newType === 'supplier'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/50 hover:bg-secondary'
                        }`}
                      >
                        Proveedor
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Segmento</label>
                    <select
                      value={newSegment}
                      onChange={e => setNewSegment(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="HORECA">HORECA</option>
                      <option value="RETAIL">RETAIL</option>
                      <option value="DISTRIBUIDOR">DISTRIBUIDOR</option>
                      <option value="CATERING">CATERING</option>
                      <option value="PRIVADA">PRIVADA</option>
                      <option value="ONLINE">ONLINE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="email@ejemplo.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Teléfono</label>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="971 123 456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Móvil</label>
                      <input
                        type="tel"
                        value={newMobile}
                        onChange={e => setNewMobile(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="600 123 456"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Dirección</label>
                    <input
                      type="text"
                      value={newStreet}
                      onChange={e => setNewStreet(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Calle, número"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Población</label>
                      <input
                        type="text"
                        value={newCity}
                        onChange={e => setNewCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Ciudad"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Código postal</label>
                      <input
                        type="text"
                        value={newPostalCode}
                        onChange={e => setNewPostalCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="07001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Provincia</label>
                    <input
                      type="text"
                      value={newProvince}
                      onChange={e => setNewProvince(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Provincia"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">País</label>
                    <select
                      value={newCountry}
                      onChange={e => setNewCountry(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="España">España</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Francia">Francia</option>
                      <option value="Alemania">Alemania</option>
                      <option value="Italia">Italia</option>
                      <option value="Reino Unido">Reino Unido</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/30">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setNewContactOpen(false);
                    setNewName('');
                    setNewTradeName('');
                    setNewType('client');
                    setNewSegment('');
                    setNewEmail('');
                    setNewPhone('');
                    setNewMobile('');
                    setNewCity('');
                    setNewCif('');
                    setNewStreet('');
                    setNewPostalCode('');
                    setNewProvince('');
                    setNewCountry('España');
                    setNewContactTab('basic');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm text-sm font-medium hover:bg-background/60 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!newName.trim()) {
                      alert('El nombre es obligatorio');
                      return;
                    }

                    try {
                      await createContact({
                        name: newName,
                        type: newType,
                        cif: newCif || undefined,
                        segment: newSegment || undefined,
                        email: newEmail || undefined,
                        phone: newPhone || undefined,
                        city: newCity || undefined,
                      });
                      
                      alert(`✅ Contacto creado: ${newName}`);
                      setNewContactOpen(false);
                      setNewName('');
                      setNewTradeName('');
                      setNewType('client');
                      setNewSegment('');
                      setNewEmail('');
                      setNewPhone('');
                      setNewMobile('');
                      setNewCity('');
                      setNewCif('');
                      setNewStreet('');
                      setNewPostalCode('');
                      setNewProvince('');
                      setNewCountry('España');
                      setNewContactTab('basic');
                      load({ reset: true });
                    } catch (error: any) {
                      alert('Error: ' + error.message);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Crear contacto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !importing && setImportOpen(false)}
          />
          <div className="relative bg-background/95 backdrop-blur-xl rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-border/50 ring-1 ring-black/5">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/30">
              <h2 className="text-lg font-semibold">Importar Contactos</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Sube un archivo CSV con la plantilla completa
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              {!importFile && !validationResult && (
                <div className="space-y-4">
                  <div 
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('csv-file-input')?.click()}
                  >
                    <Upload className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <p className="text-sm font-medium mb-2">Click para seleccionar archivo CSV</p>
                    <p className="text-xs text-muted-foreground">o arrastra y suelta aquí</p>
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setImportFile(file);
                        const text = await file.text();
                        const result = await validateImportData(text);
                        setValidationResult(result);
                      }}
                    />
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                    <p className="font-medium">📋 Formato esperado:</p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• Primera fila: headers (id, name, vat, tipo, segment, ...)</li>
                      <li>• Segunda fila: puede contener metadatos (#comentario)</li>
                      <li>• Datos: un contacto por fila</li>
                      <li>• Campos obligatorios: name, tipo</li>
                    </ul>
                  </div>
                </div>
              )}

              {validationResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-success">{validationResult.preview.filter(p => p.action === 'CREATE').length}</div>
                      <div className="text-xs text-muted-foreground">Nuevos</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-primary">{validationResult.preview.filter(p => p.action === 'UPDATE').length}</div>
                      <div className="text-xs text-muted-foreground">Actualizar</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-destructive">{validationResult.errors.length}</div>
                      <div className="text-xs text-muted-foreground">Errores</div>
                    </div>
                  </div>

                  {/* Errors */}
                  {validationResult.errors.length > 0 && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="font-medium text-sm text-destructive mb-2">
                        ❌ Errores ({validationResult.errors.length})
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {validationResult.errors.slice(0, 10).map((err, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            Línea {err.line}: {err.field} - {err.message}
                          </div>
                        ))}
                        {validationResult.errors.length > 10 && (
                          <div className="text-xs text-muted-foreground italic">
                            ... y {validationResult.errors.length - 10} errores más
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {validationResult.warnings.length > 0 && (
                    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                      <div className="font-medium text-sm text-warning mb-2">
                        ⚠️ Avisos ({validationResult.warnings.length})
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {validationResult.warnings.slice(0, 10).map((warn, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            Línea {warn.line}: {warn.field} - {warn.message}
                          </div>
                        ))}
                        {validationResult.warnings.length > 10 && (
                          <div className="text-xs text-muted-foreground italic">
                            ... y {validationResult.warnings.length - 10} avisos más
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  {validationResult.valid && validationResult.preview.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 text-sm font-medium">
                        Vista previa (primeros 5)
                      </div>
                      <div className="divide-y max-h-48 overflow-y-auto">
                        {validationResult.preview.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="px-4 py-2 text-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className="font-medium">{item.row.name}</span>
                                {item.row.vat && (
                                  <span className="text-xs text-muted-foreground ml-2">· {item.row.vat}</span>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                item.action === 'CREATE' 
                                  ? 'bg-success/10 text-success' 
                                  : 'bg-primary/10 text-primary'
                              }`}>
                                {item.action === 'CREATE' ? 'Nuevo' : 'Actualizar'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.row.tipo} · {item.row.segment || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/30 bg-muted/20">
              <div className="flex justify-between items-center gap-3">
                <button
                  onClick={() => {
                    setImportFile(null);
                    setValidationResult(null);
                  }}
                  disabled={importing}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Cambiar archivo
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportOpen(false);
                      setImportFile(null);
                      setValidationResult(null);
                    }}
                    disabled={importing}
                    className="px-4 py-2 rounded-lg border border-border/40 bg-background/40 text-sm font-medium hover:bg-background/60 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!validationResult?.valid) {
                        alert('Corrige los errores antes de continuar');
                        return;
                      }
                      
                      if (!confirm(`¿Importar ${validationResult.preview.length} contactos?`)) {
                        return;
                      }
                      
                      setImporting(true);
                      try {
                        const result = await importContacts(validationResult);
                        alert(`✅ Importación completa:\n· ${result.created} creados\n· ${result.updated} actualizados\n· ${result.skipped} omitidos`);
                        setImportOpen(false);
                        setImportFile(null);
                        setValidationResult(null);
                        load({ reset: true });
                      } catch (error: any) {
                        alert('Error: ' + error.message);
                      } finally {
                        setImporting(false);
                      }
                    }}
                    disabled={!validationResult?.valid || importing}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                  >
                    {importing ? 'Importando...' : 'Confirmar importación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
