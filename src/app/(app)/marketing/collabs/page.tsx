"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useData } from "@/lib/dataprovider";
import { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Users, 
  Calendar,
  Instagram,
  Youtube,
  Twitter,
  X
} from "lucide-react";
import type { InfluencerCollab } from "@/domain/ssot";

export default function CollaborationsPage() {
  const { data } = useData();
  const collabs = data?.influencerCollabs || [];
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState<InfluencerCollab | null>(null);

  // Filtrar colaboraciones
  const filteredCollabs = useMemo(() => {
    return collabs.filter(collab => {
      const matchesSearch = !search || 
        collab.creatorName?.toLowerCase().includes(search.toLowerCase()) ||
        collab.platform?.toLowerCase().includes(search.toLowerCase());
      
      const matchesType = !typeFilter || collab.platform === typeFilter;
      const matchesStatus = !statusFilter || collab.status === statusFilter;
      const matchesTab = activeTab === 'all' || collab.platform === activeTab;

      return matchesSearch && matchesType && matchesStatus && matchesTab;
    });
  }, [collabs, search, typeFilter, statusFilter, activeTab]);

  // Contar por categoría
  const counts = useMemo(() => {
    const byPlatform: Record<string, number> = {};
    collabs.forEach(c => {
      const platform = c.platform || 'other';
      byPlatform[platform] = (byPlatform[platform] || 0) + 1;
    });
    return byPlatform;
  }, [collabs]);

  const openDrawer = (collab: InfluencerCollab) => {
    setSelectedCollab(collab);
    setDrawerOpen(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'LIVE': return 'sb-badge--success';
      case 'AGREED': return 'sb-badge--primary';
      case 'COMPLETED': return 'sb-badge';
      default: return 'sb-badge';
    }
  };

  return (
    <div className="sb-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="sb-page__title">🤝 Colaboraciones</h1>
        <button 
          className="sb-btn sb-btn--primary"
          onClick={() => setDrawerOpen(true)}
        >
          <Plus size={18} />
          Nueva Colaboración
        </button>
      </div>
      
      {/* Toolbar con filtros */}
      <div className="sb-toolbar">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            className="sb-input pl-10"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="sb-select" 
          value={typeFilter} 
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="Instagram">Instagram</option>
          <option value="YouTube">YouTube</option>
          <option value="TikTok">TikTok</option>
          <option value="Blog">Blog</option>
        </select>
        <select 
          className="sb-select" 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="PROSPECT">Prospecto</option>
          <option value="OUTREACH">Contacto</option>
          <option value="LIVE">Activa</option>
          <option value="COMPLETED">Finalizada</option>
        </select>
      </div>
      
      {/* Tabs por tipo */}
      <div className="sb-tabs">
        <button 
          className="sb-tab" 
          aria-selected={activeTab === 'all'} 
          onClick={() => setActiveTab('all')}
        >
          Todos ({collabs.length})
        </button>
        <button 
          className="sb-tab" 
          aria-selected={activeTab === 'Instagram'} 
          onClick={() => setActiveTab('Instagram')}
        >
          Instagram ({counts['Instagram'] || 0})
        </button>
        <button 
          className="sb-tab" 
          aria-selected={activeTab === 'YouTube'} 
          onClick={() => setActiveTab('YouTube')}
        >
          YouTube ({counts['YouTube'] || 0})
        </button>
        <button 
          className="sb-tab" 
          aria-selected={activeTab === 'TikTok'} 
          onClick={() => setActiveTab('TikTok')}
        >
          TikTok ({counts['TikTok'] || 0})
        </button>
        <button 
          className="sb-tab" 
          aria-selected={activeTab === 'other'} 
          onClick={() => setActiveTab('other')}
        >
          Otros ({counts['other'] || 0})
        </button>
      </div>
      
      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filteredCollabs.length === 0 ? (
          <div className="col-span-full">
            <div className="sb-empty py-12">
              <Users size={48} className="sb-empty__icon" />
              <p className="sb-empty__title">Sin colaboraciones</p>
              <p className="sb-empty__description">
                {search || typeFilter || statusFilter 
                  ? "No se encontraron colaboraciones con estos filtros"
                  : "Añade tu primera colaboración"
                }
              </p>
            </div>
          </div>
        ) : (
          filteredCollabs.map(collab => (
            <div 
              key={collab.id} 
              className="sb-card hover-raise cursor-pointer"
              onClick={() => openDrawer(collab)}
            >
              <div className="sb-card__content">
                <div className="flex items-start justify-between mb-3">
                  <div className="sb-avatar">
                    {(collab.creatorName || 'C').slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`sb-badge ${getStatusBadgeClass(collab.status)}`}>
                    {collab.status || 'PROSPECT'}
                  </span>
                </div>
                
                <h4 className="font-semibold mb-1">{collab.creatorName || 'Sin nombre'}</h4>
                <p className="text-sm text-muted-foreground mb-3">{collab.platform || 'Sin plataforma'}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-muted-foreground" />
                    <span>{collab.tier || 'Sin tier'}</span>
                  </div>
                  {collab.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-muted-foreground" />
                      <span>Creado: {new Date(collab.createdAt).toLocaleDateString('es-ES')}</span>
                    </div>
                  )}
                </div>
                
                {collab.platform && (
                  <div className="flex gap-2 mt-3">
                    {collab.platform === 'Instagram' && <Instagram size={16} className="text-pink-500" />}
                    {collab.platform === 'YouTube' && <Youtube size={16} className="text-red-500" />}
                    {collab.platform === 'TikTok' && <Twitter size={16} className="text-blue-400" />}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Drawer Detalle */}
      {drawerOpen && (
        <>
          <div className="sb-drawer__overlay" onClick={() => setDrawerOpen(false)} />
          <div className="sb-drawer">
            <div className="sb-drawer__handle" />
            
            <div className="sb-drawer__header sb-header-glass">
              <h2 className="text-xl font-bold">
                {selectedCollab ? 'Detalle Colaboración' : 'Nueva Colaboración'}
              </h2>
              <button 
                className="sb-btn sb-btn--icon sb-btn--ghost" 
                onClick={() => setDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Info básica */}
              <div className="sb-section">
                <h3 className="sb-section__title">INFORMACIÓN GENERAL</h3>
                <div className="space-y-3">
                  <div>
                    <label className="sb-label">Nombre</label>
                    <input 
                      className="sb-input" 
                      defaultValue={selectedCollab?.creatorName || ''} 
                      placeholder="Nombre del colaborador"
                    />
                  </div>
                  <div>
                    <label className="sb-label">Plataforma</label>
                    <select className="sb-select" defaultValue={selectedCollab?.platform || ''}>
                      <option value="">Seleccionar...</option>
                      <option value="Instagram">Instagram</option>
                      <option value="YouTube">YouTube</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Blog">Blog</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="sb-label">Tier</label>
                    <select className="sb-select" defaultValue={selectedCollab?.tier || ''}>
                      <option value="">Seleccionar...</option>
                      <option value="nano">Nano (1K-10K)</option>
                      <option value="micro">Micro (10K-100K)</option>
                      <option value="mid">Mid (100K-500K)</option>
                      <option value="macro">Macro (500K+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="sb-label">Estado</label>
                    <select className="sb-select" defaultValue={selectedCollab?.status || ''}>
                      <option value="PROSPECT">Prospecto</option>
                      <option value="OUTREACH">Contacto Inicial</option>
                      <option value="NEGOTIATING">Negociando</option>
                      <option value="AGREED">Acordado</option>
                      <option value="LIVE">Activa</option>
                      <option value="COMPLETED">Completada</option>
                      <option value="PAUSED">Pausada</option>
                      <option value="DECLINED">Declinada</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Redes sociales */}
              <div className="sb-section">
                <h3 className="sb-section__title">REDES SOCIALES</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Instagram size={18} className="text-pink-500" />
                    <input className="sb-input flex-1" placeholder="@usuario" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube size={18} className="text-red-500" />
                    <input className="sb-input flex-1" placeholder="Canal de YouTube" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Twitter size={18} className="text-blue-400" />
                    <input className="sb-input flex-1" placeholder="@usuario" />
                  </div>
                </div>
              </div>
              
              {/* Métricas */}
              <div className="sb-section">
                <h3 className="sb-section__title">MÉTRICAS</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="sb-kpi-badge p-3">
                    <div className="text-xs text-muted-foreground">Alcance</div>
                    <div className="text-lg font-bold">-</div>
                  </div>
                  <div className="sb-kpi-badge p-3">
                    <div className="text-xs text-muted-foreground">Engagement</div>
                    <div className="text-lg font-bold">-</div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="sb-section">
                <h3 className="sb-section__title">NOTAS</h3>
                <textarea 
                  className="sb-textarea" 
                  rows={4} 
                  placeholder="Notas sobre la colaboración..."
                />
              </div>
            </div>
            
            <div className="sb-drawer__footer">
              <button className="sb-btn sb-btn--secondary" onClick={() => setDrawerOpen(false)}>
                Cancelar
              </button>
              <button className="sb-btn sb-btn--primary">
                {selectedCollab ? 'Guardar Cambios' : 'Crear Colaboración'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
