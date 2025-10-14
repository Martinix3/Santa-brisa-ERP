"use client";

import { useData } from "@/lib/dataprovider";
import { useState, useMemo } from "react";
import { 
  Plus, 
  Search,
  Eye,
  Package,
  X
} from "lucide-react";
import type { PlvMaterial } from "@/domain/ssot";

export default function POSMarketingPage() {
  const { data } = useData();
  const plvMaterials = data?.plv_material || [];
  
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<PlvMaterial | null>(null);

  // Filtrar materiales
  const filteredMaterials = useMemo(() => {
    return plvMaterials.filter(material => {
      const matchesSearch = !search || 
        material.name?.toLowerCase().includes(search.toLowerCase());
      
      const matchesTab = activeTab === 'all' || material.category === activeTab;

      return matchesSearch && matchesTab;
    });
  }, [plvMaterials, search, activeTab]);

  // Contar por categoría
  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {};
    plvMaterials.forEach(m => {
      const category = m.category || 'other';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });
    return byCategory;
  }, [plvMaterials]);

  const openDrawer = (material: PlvMaterial) => {
    setSelectedMaterial(material);
    setDrawerOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="sb-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="sb-page__title">🪟 Punto de Venta (PLV)</h1>
        <div className="flex gap-2">
          <button className="sb-btn sb-btn--secondary">
            <Eye size={18} />
            Ver Catálogo
          </button>
          <button className="sb-btn sb-btn--primary" onClick={() => setDrawerOpen(true)}>
            <Plus size={18} />
            Nuevo Material
          </button>
        </div>
      </div>
      
      {/* Tabs por tipo de material */}
      <div className="sb-tabs">
        <button 
          className="sb-tab" 
          aria-selected={activeTab === 'all'} 
          onClick={() => setActiveTab('all')}
        >
          Todos ({plvMaterials.length})
        </button>
        <button 
          className="sb-tab" 
          aria-selected={activeTab === 'DISPLAY'} 
          onClick={() => setActiveTab('DISPLAY')}
        >
          Display ({counts['DISPLAY'] || 0})
        </button>
        <button 
          className="sb-tab" 
          aria-selected={activeTab === 'SIGNAGE'} 
          onClick={() => setActiveTab('SIGNAGE')}
        >
          Cartelería ({counts['SIGNAGE'] || 0})
        </button>
        <button 
          className="sb-tab" 
          aria-selected={activeTab === 'MERCH'} 
          onClick={() => setActiveTab('MERCH')}
        >
          Merchandising ({counts['MERCH'] || 0})
        </button>
      </div>
      
      {/* Toolbar con filtros */}
      <div className="sb-toolbar mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            className="sb-input pl-10"
            placeholder="Buscar material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {/* Tabla de materiales */}
      <div className="sb-card mt-6">
        <div className="sb-card__header">
          <h3 className="sb-card__title">Materiales PLV</h3>
          <div className="flex gap-2">
            <span className="sb-badge">
              {filteredMaterials.length} materiales
            </span>
          </div>
        </div>
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Categoría</th>
                <th>Coste</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="sb-empty py-8">
                      <Package size={48} className="sb-empty__icon" />
                      <p className="sb-empty__title">Sin materiales</p>
                      <p className="sb-empty__description">
                        {search 
                          ? "No se encontraron materiales con este filtro"
                          : "Añade tu primer material PLV"
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMaterials.map(material => (
                  <tr 
                    key={material.id} 
                    className="cursor-pointer hover:bg-secondary/50" 
                    onClick={() => openDrawer(material)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                          <Package size={20} className="text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-xs text-muted-foreground">{material.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="sb-badge">{material.category}</span>
                    </td>
                    <td className="font-medium">{formatCurrency(material.cost)}</td>
                    <td>
                      <button className="sb-btn sb-btn--sm sb-btn--ghost">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Detalle Material */}
      {drawerOpen && (
        <>
          <div className="sb-drawer__overlay" onClick={() => setDrawerOpen(false)} />
          <div className="sb-drawer">
            <div className="sb-drawer__handle" />
            
            <div className="sb-drawer__header sb-header-glass">
              <h2 className="text-xl font-bold">
                {selectedMaterial ? 'Detalle Material PLV' : 'Nuevo Material PLV'}
              </h2>
              <button 
                className="sb-btn sb-btn--icon sb-btn--ghost" 
                onClick={() => setDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Info del material */}
              <div className="sb-section">
                <h3 className="sb-section__title">INFORMACIÓN DEL MATERIAL</h3>
                <div className="space-y-3">
                  <div>
                    <label className="sb-label">Nombre del Material</label>
                    <input 
                      className="sb-input" 
                      defaultValue={selectedMaterial?.name || ''} 
                      placeholder="Ej: Display mostrador..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="sb-label">Categoría</label>
                      <select className="sb-select" defaultValue={selectedMaterial?.category || ''}>
                        <option value="DISPLAY">Display</option>
                        <option value="SIGNAGE">Cartelería</option>
                        <option value="MERCH">Merchandising</option>
                      </select>
                    </div>
                    <div>
                      <label className="sb-label">Coste Unitario</label>
                      <input 
                        className="sb-input" 
                        type="number" 
                        defaultValue={selectedMaterial?.cost || 0}
                        placeholder="€"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Descripción */}
              <div className="sb-section">
                <h3 className="sb-section__title">DESCRIPCIÓN</h3>
                <textarea 
                  className="sb-textarea" 
                  rows={3} 
                  placeholder="Descripción del material..."
                />
              </div>

              {/* Uso y estadísticas */}
              {selectedMaterial && (
                <div className="sb-section">
                  <h3 className="sb-section__title">ESTADÍSTICAS</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="sb-kpi-badge p-3">
                      <div className="text-xs text-muted-foreground">Unidades Usadas</div>
                      <div className="text-lg font-bold">-</div>
                    </div>
                    <div className="sb-kpi-badge p-3">
                      <div className="text-xs text-muted-foreground">Coste Total</div>
                      <div className="text-lg font-bold">
                        {formatCurrency(selectedMaterial.cost)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="sb-drawer__footer">
              <button className="sb-btn sb-btn--secondary" onClick={() => setDrawerOpen(false)}>
                Cancelar
              </button>
              <button className="sb-btn sb-btn--primary">
                {selectedMaterial ? 'Guardar Cambios' : 'Crear Material'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
