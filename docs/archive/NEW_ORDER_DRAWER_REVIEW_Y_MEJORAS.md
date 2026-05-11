# 🔍 REVIEW: NEW ORDER DRAWER - MEJORAS PROPUESTAS

**Fecha:** 26 de Octubre de 2025  
**Archivo:** `src/ui/drawers/drawers/NewOrderDrawer.tsx`  
**Estado:** ⚠️ INCOMPLETO - Requiere mejoras críticas  
**Referencia de diseño:** `src/components/accounts/AccountDrawer.tsx`

---

## 📋 RESUMEN EJECUTIVO

El componente `NewOrderDrawer` está **parcialmente implementado**. La sección de líneas de pedido está **incompleta** y el diseño no sigue el patrón establecido por `AccountDrawer`.

### Puntuación Actual: 45/100

| Aspecto | Estado | Puntuación |
|---------|--------|------------|
| Información básica | ✅ Completo | 90/100 |
| Canal y flujo | ✅ Completo | 85/100 |
| Búsqueda de cliente | ✅ Funcional | 80/100 |
| **Líneas de pedido** | ❌ **INCOMPLETO** | **20/100** |
| Diseño Desktop | ⚠️ No sigue patrón | 40/100 |
| Sistema de Tabs | ❌ No implementado | 0/100 |
| Validaciones | ⚠️ Parcial | 60/100 |

---

## 🎨 REFERENCIA: AccountDrawer (Patrón a Seguir)

### Características del AccountDrawer

```typescript
// Estructura del AccountDrawer
<div className="fixed inset-0 z-50 flex items-center justify-end">
  {/* Backdrop con blur */}
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

  {/* Drawer - max-w-4xl para desktop */}
  <div className="relative w-full max-w-4xl h-full bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
    
    {/* Header con badges y metadata */}
    <div className="flex-shrink-0 border-b border-border/50 bg-secondary/30 backdrop-blur-sm">
      <div className="flex items-start justify-between p-6">
        {/* Título con icono */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Building2 size={24} className="text-primary" />
            <h2 className="text-2xl font-bold">{account.name}</h2>
          </div>
          
          {/* Badges de estado */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold border">
              {account.stage}
            </span>
            <span className="sb-badge sb-badge--primary">Venta Directa</span>
            <span className="sb-badge sb-badge--default">{account.segment}</span>
          </div>
        </div>

        {/* Botón cerrar */}
        <button onClick={onClose} className="sb-btn sb-btn--ghost ml-4">
          <X size={20} />
        </button>
      </div>

      {/* Sistema de Tabs */}
      <div className="px-6 flex gap-1 overflow-x-auto">
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary">
          Overview
        </button>
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent">
          Pedidos (5)
        </button>
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent">
          Tareas (3)
        </button>
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent">
          Timeline
        </button>
      </div>
    </div>

    {/* Content con scroll */}
    <div className="flex-1 overflow-y-auto p-6">
      {/* Contenido de cada tab */}
    </div>
  </div>
</div>
```

### Elementos Clave a Adoptar

1. ✅ **Drawer de pantalla completa** - `max-w-4xl` en desktop
2. ✅ **Backdrop con blur** - `bg-black/50 backdrop-blur-sm`
3. ✅ **Header con glassmorphism** - `bg-secondary/30 backdrop-blur-sm`
4. ✅ **Sistema de tabs** - Para organizar secciones
5. ✅ **Animación** - `animate-slide-in-right`
6. ✅ **Badges de estado** - Visual feedback
7. ✅ **Scroll interno** - Solo en content, header fijo

---

## 🎯 PROPUESTA: NewOrderDrawer Mejorado

### Estructura con Tabs (Basada en AccountDrawer)

```typescript
export function NewOrderDrawer({ onClose, onSave }: NewOrderDrawerProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'lines' | 'shipping' | 'summary'>('basic');
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-4xl h-full bg-background shadow-2xl overflow-hidden flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border/50 bg-secondary/30 backdrop-blur-sm">
          <div className="flex items-start justify-between p-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCart size={24} className="text-primary" />
                <h2 className="text-2xl font-bold">Nuevo Pedido</h2>
              </div>
              
              {/* Badges de estado */}
              <div className="flex flex-wrap items-center gap-2">
                {formData.customerName && (
                  <span className="sb-badge sb-badge--default">
                    {formData.customerName}
                  </span>
                )}
                {formData.channel && (
                  <span className="sb-badge sb-badge--primary">
                    {formData.channel}
                  </span>
                )}
                {formData.lines && formData.lines.length > 0 && (
                  <span className="sb-badge sb-badge--success">
                    {formData.lines.length} líneas
                  </span>
                )}
                {formData.totalAmount && formData.totalAmount > 0 && (
                  <span className="sb-badge sb-badge--warning">
                    €{formData.totalAmount.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <button onClick={onClose} className="sb-btn sb-btn--ghost ml-4">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'basic'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Información Básica
              {fieldWarnings.accountId && <span className="ml-1 text-destructive">⚠</span>}
            </button>
            
            <button
              onClick={() => setActiveTab('lines')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'lines'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Líneas de Pedido ({formData.lines?.length || 0})
              {fieldWarnings.lines && <span className="ml-1 text-destructive">⚠</span>}
            </button>
            
            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'shipping'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Envío y Facturación
            </button>
            
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Resumen
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && <BasicInfoTab />}
          {activeTab === 'lines' && <OrderLinesTab />}
          {activeTab === 'shipping' && <ShippingTab />}
          {activeTab === 'summary' && <SummaryTab />}
        </div>

        {/* Footer - Siempre visible */}
        <div className="flex-shrink-0 border-t border-border/50 bg-secondary/30 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {formData.lines?.length || 0} líneas • Total: €{formData.totalAmount?.toFixed(2) || '0.00'}
            </div>
            <div className="flex gap-2">
              <button className="sb-btn sb-btn--ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="sb-btn sb-btn--primary" onClick={handleSave}>
                <Save size={16} />
                Crear Pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📦 TAB 1: Información Básica

```typescript
function BasicInfoTab() {
  return (
    <div className="space-y-6">
      {/* Cliente */}
      <section className="sb-card-glass-light p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users size={20} />
          Cliente
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda de cliente con autocomplete */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Buscar Cliente *
            </label>
            <div className="relative">
              <input
                type="text"
                className="sb-input pr-10"
                placeholder="Nombre, CIF o email..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            </div>
            
            {/* Resultados de búsqueda */}
            {showClientResults && clientResults.length > 0 && (
              <div className="mt-2 border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {clientResults.map(client => (
                  <button
                    key={client.id}
                    className="w-full text-left px-4 py-3 hover:bg-secondary/10 transition-colors border-b border-border/30 last:border-0"
                    onClick={() => handleSelectClient(client)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{client.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {client.vat} • {client.segment}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          Último pedido
                        </div>
                        <div className="text-sm font-medium">
                          Hace 15 días
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón crear cliente rápido */}
          <div className="md:col-span-2">
            <button
              className="sb-btn sb-btn--secondary w-full"
              onClick={() => setShowCreateClient(true)}
            >
              <UserPlus size={16} />
              Crear Nuevo Cliente
            </button>
          </div>
        </div>
      </section>

      {/* Canal y Flujo */}
      <section className="sb-card-glass-light p-6">
        <h3 className="text-lg font-semibold mb-4">Canal y Flujo Comercial</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Canal *</label>
            <select className="sb-input" value={formData.channel}>
              <option value="PRIVATE">Privado</option>
              <option value="DISTRIBUTOR">Distribuidor</option>
              <option value="ONLINE">Online</option>
              <option value="HORECA">Horeca</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Flujo</label>
            <select className="sb-input" value={formData.flow}>
              <option value="DIRECT">Venta Directa</option>
              <option value="PLACEMENT">Placement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Origen</label>
            <select className="sb-input" value={formData.source}>
              <option value="MANUAL">Manual</option>
              <option value="CRM">CRM</option>
              <option value="B2B">B2B Portal</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
```

---

## 📦 TAB 2: Líneas de Pedido (MEJORADO)

```typescript
function OrderLinesTab() {
  return (
    <div className="space-y-6">
      {/* Formulario de añadir producto */}
      <section className="sb-card-glass-light p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus size={20} />
          Añadir Producto
        </h3>

        {/* Búsqueda de producto MEJORADA */}
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-2">
              Buscar Producto *
            </label>
            <div className="relative">
              <input
                type="text"
                className="sb-input pr-10"
                placeholder="Nombre, SKU o código de barras..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            </div>

            {/* Resultados MEJORADOS con más info */}
            {showProductResults && productResults.length > 0 && (
              <div className="mt-2 border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {productResults.map(item => (
                  <button
                    key={item.id}
                    className="w-full text-left px-4 py-3 hover:bg-secondary/10 transition-colors border-b border-border/30 last:border-0"
                    onClick={() => handleSelectProduct(item)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Imagen del producto (si existe) */}
                      {item.imageUrl && (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      
                      {/* Info del producto */}
                      <div className="flex-1">
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          SKU: {item.id}
                        </div>
                      </div>

                      {/* Stock y precio */}
                      <div className="text-right">
                        <div className="text-sm font-bold text-primary">
                          €{item.priceUnit?.toFixed(2)}
                        </div>
                        <div className={`text-xs mt-1 ${
                          (item.stockQty || 0) > 0 ? 'text-green-600' : 'text-destructive'
                        }`}>
                          Stock: {item.stockQty || 0}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campos de la línea - Solo si hay producto seleccionado */}
          {currentLine.itemId && (
            <>
              {/* Preview del producto seleccionado */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold">{currentLine.name}</div>
                    <div className="text-xs text-muted-foreground">
                      SKU: {currentLine.itemId}
                    </div>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setCurrentLine({ qty: 1, uom: 'unit', priceUnit: 0 });
                      setProductSearch('');
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Grid de campos */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Cantidad *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="sb-input"
                      value={currentLine.qty || 1}
                      onChange={(e) => setCurrentLine(prev => ({ 
                        ...prev, 
                        qty: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Unidad *
                    </label>
                    <select
                      className="sb-input"
                      value={currentLine.uom || 'unit'}
                      onChange={(e) => setCurrentLine(prev => ({ 
                        ...prev, 
                        uom: e.target.value as any 
                      }))}
                    >
                      <option value="unit">Unidad</option>
                      <option value="bottle">Botella</option>
                      <option value="case">Caja (12 uds)</option>
                      <option value="pallet">Pallet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Precio Unit. *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        €
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="sb-input pl-7"
                        value={currentLine.priceUnit || 0}
                        onChange={(e) => setCurrentLine(prev => ({ 
                          ...prev, 
                          priceUnit: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Descuento %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="sb-input"
                      value={currentLine.discountPct || 0}
                      onChange={(e) => setCurrentLine(prev => ({ 
                        ...prev, 
                        discountPct: parseFloat(e.target.value) || 0 
                      }))}
                    />
                  </div>
                </div>

                {/* Preview del subtotal */}
                <div className="mt-4 flex items-center justify-between p-3 bg-background rounded-lg border border-border/30">
                  <span className="text-sm font-medium">Subtotal de esta línea:</span>
                  <div className="text-right">
                    {currentLine.discountPct && currentLine.discountPct > 0 && (
                      <div className="text-xs text-muted-foreground line-through">
                        €{((currentLine.qty || 0) * (currentLine.priceUnit || 0)).toFixed(2)}
                      </div>
                    )}
                    <div className="text-xl font-bold text-primary">
                      €{(
                        (currentLine.qty || 0) * 
                        (currentLine.priceUnit || 0) * 
                        (1 - ((currentLine.discountPct || 0) / 100))
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Botón añadir */}
                <button
                  type="button"
                  className="sb-btn sb-btn--primary w-full mt-4"
                  onClick={handleAddLine}
                  disabled={!currentLine.itemId || !currentLine.qty || !currentLine.priceUnit}
                >
                  <Plus size={16} />
                  Añadir al Pedido
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Lista de líneas añadidas */}
      {formData.lines && formData.lines.length > 0 ? (
        <section className="sb-card-glass-light p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package size={20} />
              Líneas del Pedido ({formData.lines.length})
            </h3>
            <button
              type="button"
              className="text-sm text-destructive hover:underline"
              onClick={() => setFormData(prev => ({ ...prev, lines: [], totalAmount: 0 }))}
            >
              Limpiar todas
            </button>
          </div>

          <div className="space-y-3">
            {formData.lines.map((line, index) => {
              const subtotal = line.qty * line.priceUnit;
              const discount = subtotal * ((line.discountPct || 0) / 100);
              const total = subtotal - discount;

              return (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border border-border/30 rounded-lg hover:bg-secondary/5 transition-colors"
                >
                  {/* Número de línea */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>

                  {/* Info del producto */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base mb-1">{line.name}</div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{line.qty} {line.uom}</span>
                      <span>×</span>
                      <span>€{line.priceUnit.toFixed(2)}</span>
                      {line.discountPct && line.discountPct > 0 && (
                        <>
                          <span className="text-warning font-medium">
                            -{line.discountPct}%
                          </span>
                          <span className="text-warning">
                            (-€{discount.toFixed(2)})
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex-shrink-0 text-right">
                    {line.discountPct && line.discountPct > 0 && (
                      <div className="text-sm text-muted-foreground line-through">
                        €{subtotal.toFixed(2)}
                      </div>
                    )}
                    <div className="text-xl font-bold">
                      €{total.toFixed(2)}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex-shrink-0 flex flex-col gap-1">
                    <button
                      type="button"
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/10 rounded transition-colors"
                      onClick={() => handleEditLine(index)}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                      onClick={() => handleRemoveLine(index)}
                      title="Eliminar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen del pedido */}
          <div className="mt-6 pt-6 border-t border-border/30 space-y-3">
            <div className="flex justify-between text-base">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-semibold">
                €{formData.lines.reduce((sum, line) => 
                  sum + (line.qty * line.priceUnit), 0
                ).toFixed(2)}
              </span>
            </div>
            
            {formData.lines.some(line => line.discountPct && line.discountPct > 0) && (
              <div className="flex justify-between text-base text-warning">
                <span>Descuentos:</span>
