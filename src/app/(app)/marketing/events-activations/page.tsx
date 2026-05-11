"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useData } from "@/lib/dataprovider";
import { useState, useMemo } from "react";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  List,
  Clock,
  MapPin,
  Building,
  X,
  CalendarOff
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
// PENDING: MarketingEvent no existe en SSOT canónico
// TODO: Definir zMarketingEvent en src/domain/ssot.ts
import type { MarketingEvent } from "@/domain/ssot";

export default function EventsActivationsPage() {
  // marketingEvents no está tipado en DataProvider
  const { data } = useData();
  const events = data?.marketingEvents || [];
  
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [typeFilter, setTypeFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MarketingEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const filteredEvents = useMemo(() => {
    return events.filter((event: any) => {
      const matchesType = !typeFilter || event.kind === typeFilter;
      return matchesType;
    });
  }, [events, typeFilter]);

  const openDrawer = (event: MarketingEvent) => {
    setSelectedEvent(event);
    setDrawerOpen(true);
  };

  const getEventStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'planned': 'Programado',
      'active': 'En Curso',
      'closed': 'Finalizado',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getEventTypeBadge = (kind: string) => {
    switch (kind) {
      case 'DEMO': return 'sb-badge--primary';
      case 'FERIA': return 'sb-badge--success';
      case 'FORMACION': return 'sb-badge';
      default: return 'sb-badge';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'sb-status--active';
      case 'closed': return 'sb-status--inactive';
      case 'cancelled': return 'sb-status--error';
      default: return 'sb-status--inactive';
    }
  };

  return (
    <div className="sb-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="sb-page__title">🎉 Eventos y Activaciones</h1>
        <button className="sb-btn sb-btn--primary" onClick={() => setDrawerOpen(true)}>
          <Plus size={18} />
          Nuevo Evento
        </button>
      </div>
      
      {/* Vista switcher + Filtros */}
      <div className="sb-toolbar">
        <div className="flex gap-2">
          <button 
            className={`sb-btn sb-btn--sm ${viewMode === 'calendar' ? 'sb-btn--secondary' : 'sb-btn--ghost'}`}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon size={16} />
            Calendario
          </button>
          <button 
            className={`sb-btn sb-btn--sm ${viewMode === 'list' ? 'sb-btn--secondary' : 'sb-btn--ghost'}`}
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
            Lista
          </button>
        </div>
        
        <div className="flex gap-2 flex-1 justify-end">
          <select 
            className="sb-select" 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="DEMO">Degustación</option>
            <option value="FERIA">Feria</option>
            <option value="FORMACION">Formación</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
      </div>
      
      {/* Vista Lista */}
      {viewMode === 'list' && (
        <div className="sb-card mt-6">
          <div className="sb-card__header">
            <h3 className="sb-card__title">Todos los Eventos</h3>
          </div>
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Ubicación</th>
                  <th>Cuenta</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="sb-empty py-8">
                        <CalendarIcon size={48} className="sb-empty__icon" />
                        <p className="sb-empty__title">Sin eventos programados</p>
                        <p className="sb-empty__description">
                          Crea tu primer evento de marketing
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event: any) => (
                    <tr 
                      key={event.id} 
                      className="cursor-pointer hover:bg-secondary/50" 
                      onClick={() => openDrawer(event)}
                    >
                      <td className="font-medium">{event.title}</td>
                      <td>
                        <span className={`sb-badge ${getEventTypeBadge(event.kind)}`}>
                          {event.kind}
                        </span>
                      </td>
                      <td>{new Date(event.startAt).toLocaleDateString('es-ES')}</td>
                      <td className="text-sm">{event.city || '-'}</td>
                      <td className="text-sm">{event.accountId || '-'}</td>
                      <td>
                        <span className={`sb-status ${getStatusClass(event.status)}`}>
                          {getEventStatusLabel(event.status)}
                        </span>
                      </td>
                      <td>
                        <button className="sb-btn sb-btn--sm sb-btn--ghost">
                          <Clock size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista Calendario */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Calendario */}
          <div className="lg:col-span-2">
            <div className="sb-card">
              <div className="sb-card__content">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasEvent: events.map((e: any) => new Date(e.startAt))
                  }}
                  modifiersStyles={{
                    hasEvent: {
                      fontWeight: 'bold',
                      textDecoration: 'underline'
                    }
                  }}
                  className="mx-auto"
                />
              </div>
            </div>
          </div>
          
          {/* Lista de eventos del día */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecciona un día'}
              </h3>
              <span className="sb-badge sb-badge--primary">
                {selectedDate ? events.filter((e: any) => 
                  new Date(e.startAt).toDateString() === selectedDate.toDateString()
                ).length : 0} eventos
              </span>
            </div>
            
            {!selectedDate || events.filter((e: any) => 
              new Date(e.startAt).toDateString() === selectedDate.toDateString()
            ).length === 0 ? (
              <div className="sb-empty py-8">
                <CalendarOff size={48} className="sb-empty__icon" />
                <p className="sb-empty__title">Sin eventos</p>
                <p className="sb-empty__description">
                  No hay eventos programados para esta fecha
                </p>
              </div>
            ) : (
              events.filter((e: any) => selectedDate && new Date(e.startAt).toDateString() === selectedDate.toDateString())
                .map((event: any) => (
                  <div key={event.id} className="sb-card hover-raise cursor-pointer" onClick={() => openDrawer(event)}>
                    <div className="sb-card__content">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{event.title}</h4>
                        <span className={`sb-badge ${getEventTypeBadge(event.kind)}`}>
                          {event.kind}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          <span>{new Date(event.startAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {event.city && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span>{event.city}</span>
                          </div>
                        )}
                      </div>
                      {event.status && (
                        <div className="mt-3">
                          <span className={`sb-status ${getStatusClass(event.status)}`}>
                            {getEventStatusLabel(event.status)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Drawer Detalle */}
      {drawerOpen && (
        <>
          <div className="sb-drawer__overlay" onClick={() => setDrawerOpen(false)} />
          <div className="sb-drawer">
            <div className="sb-drawer__handle" />
            
            <div className="sb-drawer__header sb-header-glass">
              <h2 className="text-xl font-bold">
                {selectedEvent ? 'Detalle Evento' : 'Nuevo Evento'}
              </h2>
              <button 
                className="sb-btn sb-btn--icon sb-btn--ghost" 
                onClick={() => setDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Información del evento */}
              <div className="sb-section">
                <h3 className="sb-section__title">INFORMACIÓN DEL EVENTO</h3>
                <div className="space-y-3">
                  <div>
                    <label className="sb-label">Nombre del Evento</label>
                    <input 
                      className="sb-input" 
                      defaultValue={selectedEvent?.title || ''} 
                      placeholder="Ej: Degustación en..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="sb-label">Fecha</label>
                      <input className="sb-input" type="date" />
                    </div>
                    <div>
                      <label className="sb-label">Hora</label>
                      <input className="sb-input" type="time" />
                    </div>
                  </div>
                  <div>
                    <label className="sb-label">Ubicación</label>
                    <input 
                      className="sb-input" 
                      defaultValue={selectedEvent?.city || ''}
                      placeholder="Ciudad o dirección..." 
                    />
                  </div>
                  <div>
                    <label className="sb-label">Tipo de Evento</label>
                    <select className="sb-select" defaultValue={selectedEvent?.kind || ''}>
                      <option value="DEMO">Degustación</option>
                      <option value="FERIA">Feria</option>
                      <option value="FORMACION">Formación</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* KPIs del evento */}
              {selectedEvent && (
                <div className="sb-section">
                  <h3 className="sb-section__title">MÉTRICAS</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="sb-kpi-badge p-3">
                      <div className="text-xs text-muted-foreground">Inversión</div>
                      <div className="text-lg font-bold">
                        €{selectedEvent.spend || 0}
                      </div>
                    </div>
                    <div className="sb-kpi-badge p-3">
                      <div className="text-xs text-muted-foreground">Asistencia</div>
                      <div className="text-lg font-bold">-</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div className="sb-section">
                <h3 className="sb-section__title">NOTAS</h3>
                <textarea 
                  className="sb-textarea" 
                  rows={4} 
                  placeholder="Notas y observaciones..."
                />
              </div>
            </div>
            
            <div className="sb-drawer__footer">
              <button className="sb-btn sb-btn--secondary" onClick={() => setDrawerOpen(false)}>
                Cancelar
              </button>
              <button className="sb-btn sb-btn--primary">
                {selectedEvent ? 'Guardar' : 'Crear Evento'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
