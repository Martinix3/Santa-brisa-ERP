"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EntityDrawerShell } from "@/components/drawers/EntityDrawerShell";
import {
  Mail, Phone, MapPin, FileText, Target, Globe, ExternalLink, ShoppingCart, Package, Store
} from "lucide-react";
import { saveSantaBrainData } from "@/server/actions/santa-brain.actions";
import { processMessage } from "@/features/quicklog/actions/process-message";

type ContactDrawerProps = {
  detail: any;
  contactId: string;
};

export default function ContactDrawer({ detail, contactId }: ContactDrawerProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const getTypeLabel = (originType: string) => {
    if (originType === "client") return "Cliente";
    if (originType === "supplier") return "Proveedor";
    if (originType === "customer") return "Online";
    return originType;
  };

  // Calcular métricas del historial
  const metrics = {
    pedidos: detail.history?.filter((h: any) => h.type === 'Pedido').length || 0,
    cajas: detail.history?.filter((h: any) => h.type === 'Pedido')
      .reduce((sum: number, h: any) => {
        const match = h.details?.match(/(\d+)/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0) || 0,
    pos: detail.history?.filter((h: any) => h.type === 'Material POS').length || 0,
  };

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    
    setSaving(true);
    try {
      // Procesar nota con Santa Brain
      const userId = 'us_004'; // TODO: Obtener userId del contexto
      const processed = await processMessage(note, userId);
      
      // Filtrar y mapear acciones válidas
      const validActions = processed.actions
        .filter(a => ['VISITA', 'PEDIDO', 'EVENTO', 'POS'].includes(a.type))
        .map(a => ({
          type: a.type as 'VISITA' | 'PEDIDO' | 'EVENTO' | 'POS',
          what: a.what || '',
          details: a.details || '',
          date: a.date || null,
          scheduledDate: a.scheduledDate || null,
        }));
      
      // Guardar con accountId ya conocido
      await saveSantaBrainData({
        accountName: detail.name,
        accountId: contactId,
        isNewAccount: false,
        actions: validActions,
        rawTranscript: note,
      }, userId);
      
      // Limpiar y actualizar
      setNote('');
      router.refresh();
    } catch (error) {
      console.error('Error guardando nota:', error);
      alert('Error al guardar la nota');
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityDrawerShell
      title={detail.tradeName || detail.name || "Contacto"}
      actions={
        <div className="flex items-center gap-1">
          {detail.phone && (
            <a
              href={`tel:${detail.phone}`}
              className="sb-btn sb-btn--ghost sb-btn--icon"
              title="Llamar"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
          {detail.email && (
            <a
              href={`mailto:${detail.email}`}
              className="sb-btn sb-btn--ghost sb-btn--icon"
              title="Enviar email"
            >
              <Mail className="h-4 w-4" />
            </a>
          )}
          {detail.website && (
            <a
              href={detail.website}
              target="_blank"
              rel="noopener noreferrer"
              className="sb-btn sb-btn--ghost sb-btn--icon"
              title="Abrir web"
            >
              <Globe className="h-4 w-4" />
            </a>
          )}
          {detail.billingAddress?.city && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${detail.billingAddress.street || ''} ${detail.billingAddress.city} ${detail.billingAddress.province || ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="sb-btn sb-btn--ghost sb-btn--icon"
              title="Ver en mapa"
            >
              <MapPin className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              alert('Función "Marcar como target" por implementar'); 
            }}
            className={`sb-btn sb-btn--ghost sb-btn--icon ${detail.isTarget ? 'text-yellow-600' : ''}`}
            title="Target"
          >
            <Target className="h-4 w-4" />
          </button>
        </div>
      }
      footer={
        <>
          <button onClick={() => router.back()} className="sb-btn sb-btn--secondary">Cerrar</button>
          <button className="sb-btn sb-btn--ghost" onClick={() => router.refresh()}>Refrescar</button>
          <button 
            className="sb-btn sb-btn--primary"
            onClick={() => router.push(`/contacts/${contactId}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Detalle
          </button>
        </>
      }
    >
      <div className="space-y-4">
          {/* Métricas */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pb-3 border-b">
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              {metrics.pedidos} pedidos
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {metrics.cajas} cajas
            </span>
            <span className="flex items-center gap-1">
              <Store className="h-3 w-3" />
              {metrics.pos} POS
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="sb-badge bg-muted">{getTypeLabel(detail.originType)}</span>
            {detail.segment && <span className="sb-badge--primary">{detail.segment}</span>}
            {detail.stage && <span className="sb-badge bg-blue-100 text-blue-800 border-transparent">{detail.stage}</span>}
            {detail.flow && (
              <span className={`sb-badge border-transparent ${
                detail.flow === "DIRECT" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"}`}>
                {detail.flow === "DIRECT" ? "Directa" : "Colocación"}
              </span>
            )}
            {detail.ownerId && (
              <div className="sb-avatar text-xs" title={detail.ownerName || detail.ownerId}>
                {(detail.ownerName || detail.ownerId).substring(0, 2).toUpperCase()}
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); alert('Función "Marcar como target" por implementar'); }}
              className={`sb-btn sb-btn--ghost sb-btn--icon ml-auto ${detail.isTarget ? "text-yellow-600" : ""}`}
              title="Target"
            >
              <Target size={16} />
            </button>
          </div>

          {/* Datos contacto */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {detail.email && (
              <div className="flex items-start gap-2">
                <Mail size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium truncate">{detail.email}</div>
                </div>
              </div>
            )}
            {(detail.phone || detail.mobile) && (
              <div className="flex items-start gap-2">
                <Phone size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Teléfono</div>
                  <div className="font-medium">{detail.phone || detail.mobile}</div>
                </div>
              </div>
            )}
            {detail.cif && (
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">NIF/CIF</div>
                  <div className="font-medium">{detail.cif}</div>
                </div>
              </div>
            )}
            {detail.billingAddress && (
              <div className="flex items-start gap-2 col-span-2">
                <MapPin size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Dirección</div>
                  <div className="text-muted-foreground text-xs">
                    {detail.billingAddress.street && `${detail.billingAddress.street}, `}
                    {detail.billingAddress.city} {detail.billingAddress.zip}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KPIs */}
          {detail.stats && (
            <div className="grid grid-cols-3 gap-3 py-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Ventas YTD</div>
                <div className="font-semibold">{detail.stats.salesTotal || "0"}€</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Pedidos</div>
                <div className="font-semibold">{detail.stats.ordersCount || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Última visita</div>
                <div className="font-semibold text-xs">{detail.stats.lastVisit || "—"}</div>
              </div>
            </div>
          )}

          {/* Textarea de notas */}
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Escribe lo que quieras..."
              className="w-full min-h-[100px] p-3 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={saving}
            />
            <button
              onClick={handleSaveNote}
              disabled={saving || !note.trim()}
              className="sb-btn sb-btn--primary w-full"
            >
              {saving ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>

          {/* Historial de actividad */}
          <div className="pt-4">
            <div className="text-sm font-semibold mb-3">Historial de actividad</div>
            <div className="space-y-3">
              {detail.history && detail.history.length > 0 ? (
                detail.history.map((item: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-gray-200 pl-3 py-1">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {/* Columna 1: Tipo */}
                      <div className="font-medium">{item.type}</div>
                      {/* Columna 2: Detalle */}
                      <div className="text-muted-foreground">{item.detail}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-0.5">
                      {/* Columna 1: Fecha creación */}
                      <div>({item.dateCreated})</div>
                      {/* Columna 2: Fecha programada */}
                      <div>{item.dateScheduled ? `(${item.dateScheduled})` : ''}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Sin actividad registrada
                </div>
              )}
            </div>
          </div>
        </div>
    </EntityDrawerShell>
  );
}
