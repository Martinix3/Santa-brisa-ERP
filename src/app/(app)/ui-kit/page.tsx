// UI Kit - Demostración del Sistema de Diseño Santa Brisa
"use client";

import { 
  Download, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Search,
  Settings,
  Star,
  Heart
} from "lucide-react";

export default function UIKitPage() {
  return (
  
      <div className="sb-container py-6 space-y-8">
        {/* Header */}
      <header className="space-y-2">
        <h1 className="sb-title">UI Kit Santa Brisa</h1>
        <p className="sb-subtitle">Sistema de diseño y componentes reutilizables</p>
      </header>

      {/* Paleta de Colores */}
      <section className="sb-card">
        <div className="sb-card__content space-y-4">
          <h2 className="text-xl font-semibold">Paleta de Colores</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-primary"></div>
              <p className="text-sm font-medium">Primary</p>
              <p className="text-xs text-muted-foreground">#F7D15F</p>
            </div>
            
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-secondary"></div>
              <p className="text-sm font-medium">Secondary</p>
              <p className="text-xs text-muted-foreground">#F6F6F6</p>
            </div>
            
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-accent"></div>
              <p className="text-sm font-medium">Accent</p>
              <p className="text-xs text-muted-foreground">#1F1200</p>
            </div>
            
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-card border border-border"></div>
              <p className="text-sm font-medium">Card</p>
              <p className="text-xs text-muted-foreground">#FFFFFF</p>
            </div>
            
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-success"></div>
              <p className="text-sm font-medium">Success</p>
              <p className="text-xs text-muted-foreground">#16A34A</p>
            </div>
            
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-destructive"></div>
              <p className="text-sm font-medium">Destructive</p>
              <p className="text-xs text-muted-foreground">#DC2626</p>
            </div>
            
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-muted"></div>
              <p className="text-sm font-medium">Muted</p>
              <p className="text-xs text-muted-foreground">#F6F6F6</p>
            </div>
            
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-background border border-border"></div>
              <p className="text-sm font-medium">Background</p>
              <p className="text-xs text-muted-foreground">#FBFBFB</p>
            </div>
          </div>
        </div>
      </section>

      {/* Botones */}
      <section className="sb-card">
        <div className="sb-card__content space-y-6">
          <h2 className="text-xl font-semibold">Botones</h2>
          
          {/* Variantes */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Variantes</h3>
            <div className="flex flex-wrap gap-3">
              <button className="sb-btn sb-btn--primary">
                <Plus className="w-4 h-4" />
                Primary
              </button>
              <button className="sb-btn sb-btn--secondary">
                Secondary
              </button>
              <button className="sb-btn sb-btn--ghost">
                Ghost
              </button>
              <button className="sb-btn sb-btn--destructive">
                <Trash2 className="w-4 h-4" />
                Destructive
              </button>
              <button className="sb-btn sb-btn--success">
                <Check className="w-4 h-4" />
                Success
              </button>
            </div>
          </div>

          {/* Tamaños */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Tamaños</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button className="sb-btn sb-btn--primary sb-btn--sm">Small</button>
              <button className="sb-btn sb-btn--primary">Default</button>
              <button className="sb-btn sb-btn--primary sb-btn--lg">Large</button>
              <button className="sb-btn sb-btn--primary sb-btn--icon">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Estados */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Estados</h3>
            <div className="flex flex-wrap gap-3">
              <button className="sb-btn sb-btn--primary">Normal</button>
              <button className="sb-btn sb-btn--primary" disabled>Disabled</button>
            </div>
          </div>
        </div>
      </section>

      {/* Inputs y Formularios */}
      <section className="sb-card">
        <div className="sb-card__content space-y-6">
          <h2 className="text-xl font-semibold">Inputs y Formularios</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="sb-label">Input Normal</label>
              <input 
                className="sb-input" 
                type="text" 
                placeholder="Escribe algo..." 
              />
            </div>

            <div className="space-y-2">
              <label className="sb-label">Input con Icono</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  className="sb-input pl-10" 
                  type="text" 
                  placeholder="Buscar..." 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="sb-label">Select</label>
              <select className="sb-select">
                <option>Opción 1</option>
                <option>Opción 2</option>
                <option>Opción 3</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="sb-label">Input Deshabilitado</label>
              <input 
                className="sb-input" 
                type="text" 
                placeholder="Deshabilitado" 
                disabled 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="sb-label">Textarea</label>
            <textarea 
              className="sb-textarea" 
              placeholder="Escribe un mensaje largo..."
              rows={4}
            />
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Cards</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          {/* Card Simple */}
          <div className="sb-card">
            <div className="sb-card__content">
              <h3 className="font-semibold mb-2">Card Simple</h3>
              <p className="text-sm text-muted-foreground">
                Este es un ejemplo de card con contenido básico.
              </p>
            </div>
          </div>

          {/* Card con Header y Footer */}
          <div className="sb-card">
            <div className="sb-card__header">
              <div>
                <h3 className="sb-card__title">Card Completa</h3>
                <p className="sb-card__subtitle">Con header y footer</p>
              </div>
              <button className="sb-btn sb-btn--ghost sb-btn--icon">
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="sb-card__content">
              <p className="text-sm">Contenido de la tarjeta con estructura completa.</p>
            </div>
            <div className="sb-card__footer">
              <button className="sb-btn sb-btn--ghost sb-btn--sm">Cancelar</button>
              <button className="sb-btn sb-btn--primary sb-btn--sm">Guardar</button>
            </div>
          </div>
        </div>
      </section>

      {/* Badges y Pills */}
      <section className="sb-card">
        <div className="sb-card__content space-y-6">
          <h2 className="text-xl font-semibold">Badges y Pills</h2>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Badges</h3>
            <div className="flex flex-wrap gap-2">
              <span className="sb-badge">Default</span>
              <span className="sb-badge sb-badge--primary">Primary</span>
              <span className="sb-badge sb-badge--success">Success</span>
              <span className="sb-badge sb-badge--destructive">Error</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Pills</h3>
            <div className="flex flex-wrap gap-2">
              <span className="sb-pill">
                <Star className="w-3 h-3" />
                Default
              </span>
              <span className="sb-pill sb-pill--primary">
                <Heart className="w-3 h-3" />
                Primary
              </span>
              <span className="sb-pill sb-pill--success">
                <Check className="w-3 h-3" />
                Success
              </span>
              <span className="sb-pill sb-pill--destructive">
                <X className="w-3 h-3" />
                Error
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
            <div className="flex flex-wrap gap-2">
              <span className="sb-status sb-status--active">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                Activo
              </span>
              <span className="sb-status sb-status--inactive">
                <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                Inactivo
              </span>
              <span className="sb-status sb-status--error">
                <span className="w-2 h-2 rounded-full bg-destructive"></span>
                Error
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabla */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tabla</h2>
        
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Ana García</td>
                <td>ana@example.com</td>
                <td>
                  <span className="sb-badge sb-badge--primary">Admin</span>
                </td>
                <td>
                  <span className="sb-status sb-status--active">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    Activo
                  </span>
                </td>
                <td className="text-right">
                  <button className="sb-btn sb-btn--ghost sb-btn--sm">
                    Editar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="font-medium">Carlos López</td>
                <td>carlos@example.com</td>
                <td>
                  <span className="sb-badge">Usuario</span>
                </td>
                <td>
                  <span className="sb-status sb-status--active">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    Activo
                  </span>
                </td>
                <td className="text-right">
                  <button className="sb-btn sb-btn--ghost sb-btn--sm">
                    Editar
                  </button>
                </td>
              </tr>
              <tr>
                <td className="font-medium">María Ruiz</td>
                <td>maria@example.com</td>
                <td>
                  <span className="sb-badge sb-badge--success">Ventas</span>
                </td>
                <td>
                  <span className="sb-status sb-status--inactive">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                    Inactivo
                  </span>
                </td>
                <td className="text-right">
                  <button className="sb-btn sb-btn--ghost sb-btn--sm">
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Toolbar */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Toolbar</h2>
        
        <div className="sb-toolbar">
          <button className="sb-btn sb-btn--ghost sb-btn--sm">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="sb-btn sb-btn--ghost sb-btn--sm">
            Filtrar
          </button>
          <div className="flex-1"></div>
          <button className="sb-btn sb-btn--primary sb-btn--sm">
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </section>

      {/* Tipografía */}
      <section className="sb-card">
        <div className="sb-card__content space-y-4">
          <h2 className="text-xl font-semibold">Tipografía</h2>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">Heading 1</h1>
            <h2 className="text-2xl font-semibold">Heading 2</h2>
            <h3 className="text-xl font-semibold">Heading 3</h3>
            <h4 className="text-lg font-medium">Heading 4</h4>
            <p className="text-base">Texto normal - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p className="text-sm">Texto pequeño - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p className="text-xs text-muted-foreground">Texto muy pequeño - Lorem ipsum dolor sit amet.</p>
          </div>
        </div>
      </section>

      {/* Empty State */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Empty State</h2>
        
        <div className="sb-card">
          <div className="sb-empty">
            <div className="sb-empty__icon">
              <Search />
            </div>
            <h3 className="sb-empty__title">No se encontraron resultados</h3>
            <p className="sb-empty__description">
              Intenta ajustar tus filtros o crear un nuevo elemento
            </p>
            <button className="sb-btn sb-btn--primary mt-4">
              <Plus className="w-4 h-4" />
              Crear Nuevo
            </button>
          </div>
        </div>
      </section>
      </div>
   
  );
}
