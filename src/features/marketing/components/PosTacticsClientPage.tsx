// src/features/marketing/components/PosTacticsClientPage.tsx
'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { Star, TrendingUp, DollarSign, Trophy, Percent, Plus, Package, Briefcase, Gift } from 'lucide-react';
import { SBCard, SBButton } from '@/components/ui/ui-primitives';
import { NewPosTacticDialog } from '@/features/marketing/components/NewPosTacticDialog';
import type { PosTactic as DPosTactic, PosResult, PosCostCatalogEntry, PlvMaterial, Account } from '@/domain/ssot.v7';
import { useData } from '@/lib/dataprovider';
import { upsertPosTactic, closePosTactic } from '../services/posTactics.client';

function KPI({ icon: Icon, label, value, unit }: { icon: React.ElementType, label: string; value: string | number; unit?: string }) {
    return (
        <SBCard title="">
            <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-zinc-500" />
                    <h3 className="font-semibold text-zinc-700">{label}</h3>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{value}{unit && <span className="text-sm text-zinc-500 ml-1">{unit}</span>}</p>
            </div>
        </SBCard>
    );
}

export function PosTacticsClientPage({
    initialTactics,
    catalog,
    plv,
}: {
    initialTactics: DPosTactic[];
    catalog: PosCostCatalogEntry[];
    plv: PlvMaterial[];
}) {
    const { data, currentUser } = useData();
    const [tactics, setTactics] = useState(initialTactics);
    const [isNewTacticOpen, setIsNewTacticOpen] = useState(false);
    const [editingTactic, setEditingTactic] = useState<DPosTactic | null>(null);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const [catalogItems, setCatalogItems] = useState(catalog);

    const kpis = useMemo(() => {
        const closedTactics = tactics.filter(t => t.status === 'closed' && t.result);
        if (closedTactics.length === 0) {
            return { avgRoi: 0, avgLift: 0, totalSpend: 0, successRate: 0 };
        }
        const totalSpend = tactics.reduce((sum, t) => sum + (t.actualCost || 0), 0);
        const totalRoi = closedTactics.reduce((sum, t) => sum + (t.result?.roi || 0), 0);
        const totalLift = closedTactics.reduce((sum, t) => sum + (t.result?.liftPct || 0), 0);
        const successfulTactics = closedTactics.filter(t => (t.result?.roi || 0) > 0).length;

        return {
            avgRoi: (totalRoi / closedTactics.length) * 100,
            avgLift: (totalLift / closedTactics.length),
            totalSpend,
            successRate: (successfulTactics / closedTactics.length) * 100,
        };
    }, [tactics]);

    const handleSaveTactic = async (tacticData: any) => {
        try {
            const savedTactic = await upsertPosTactic(tacticData, currentUser?.id || 'unknown');
            setTactics((prev: DPosTactic[]) => {
              const index = prev.findIndex(t => t.id === savedTactic.id);
              if (index > -1) {
                  const next = [...prev];
                  next[index] = { ...prev[index], ...(savedTactic as DPosTactic) };
                  return next;
              }
              return [savedTactic as DPosTactic, ...prev];
            });
            setIsNewTacticOpen(false);
            setEditingTactic(null);
        } catch (e) {
            console.error(e);
            alert((e as Error).message);
        }
    };

    const handleCloseTactic = async (tacticId: string) => {
        if (confirm("¿Estás seguro de que quieres cerrar esta táctica? Se calcularán sus resultados finales.")) {
            try {
                const result = await closePosTactic(tacticId, {});
                setTactics((prev: DPosTactic[]) =>
                  prev.map(t => (t.id === tacticId ? ({ ...t, ...(result as Partial<DPosTactic>) } as DPosTactic) : t))
                );
            } catch (e) {
                alert((e as Error).message);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h1 className="sb-h2 text-foreground">Tácticas en Punto de Venta (POS)</h1>
                 <div className="flex gap-2">
                    <SBButton variant="secondary" onClick={() => setIsCatalogOpen(true)}>
                        Gestionar Catálogo
                    </SBButton>
                    <SBButton onClick={() => { setEditingTactic(null); setIsNewTacticOpen(true); }}>
                        <Plus size={16} className="mr-2"/>
                        Nueva Táctica
                    </SBButton>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="ROI Medio" value={kpis.avgRoi.toFixed(0)} icon={TrendingUp} unit="%" />
                <KPI label="Uplift Medio Ventas" value={kpis.avgLift.toFixed(1)} icon={Percent} unit="%" />
                <KPI label="Inversión Total" value={kpis.totalSpend.toLocaleString('es-ES', {style:'currency', currency: 'EUR'})} icon={DollarSign} />
                <KPI label="Tasa de Éxito" value={kpis.successRate.toFixed(0)} icon={Trophy} unit="%" />
            </div>

            <SBCard title="Historial y Rentabilidad de Tácticas">
                 <div className="divide-y divide-zinc-100">
                    <div className="grid grid-cols-5 p-3 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                        <span>Cuenta</span>
                        <span>Táctica</span>
                        <span className="text-right">Coste</span>
                        <span className="text-right">Uplift Ventas</span>
                        <span className="text-right">ROI</span>
                    </div>
                    {tactics.map(tactic => {
                        const account = data?.accounts.find(a => a.id === tactic.accountId);
                        const result = tactic.result;

                        return (
                            <div key={tactic.id} className="grid grid-cols-5 p-3 items-center hover:bg-zinc-50/50 text-sm">
                                <div className="font-medium">{account?.name || tactic.accountId}</div>
                                <div>{tactic.description || tactic.tacticCode}</div>
                                <div className="text-right font-mono">{tactic.actualCost.toFixed(2)}€</div>
                                {result ? (
                                    <>
                                        <div className={`text-right font-semibold ${(result.liftPct || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.liftPct ? `${(result.liftPct * 100).toFixed(1)}%` : 'N/A'}
                                        </div>
                                        <div className={`text-right font-semibold ${result.roi && result.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.roi ? `${(result.roi * 100).toFixed(0)}%` : 'N/A'}
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-span-2 text-center text-xs text-zinc-500">Pendiente de cálculo</div>
                                )}
                            </div>
                        )
                    })}
                    {tactics.length === 0 && (
                        <p className="p-8 text-center text-sm text-zinc-500">No hay tácticas POS registradas todavía.</p>
                    )}
                </div>
            </SBCard>
            
            {isNewTacticOpen && data && (
                <NewPosTacticDialog
                    open={isNewTacticOpen}
                    onClose={() => setIsNewTacticOpen(false)}
                    onSave={handleSaveTactic}
                    tacticBeingEdited={editingTactic}
                    accounts={data?.accounts || []}
                    catalog={catalogItems}
                    plvInventory={plv}
                />
            )}

            {isCatalogOpen && (
                <CatalogManagementDialog
                    open={isCatalogOpen}
                    onClose={() => setIsCatalogOpen(false)}
                    catalog={catalogItems}
                    onUpdateCatalog={setCatalogItems}
                />
            )}
        </div>
    );
}

function CatalogManagementDialog({
    open,
    onClose,
    catalog,
    onUpdateCatalog
}: {
    open: boolean;
    onClose: () => void;
    catalog: PosCostCatalogEntry[];
    onUpdateCatalog: (catalog: PosCostCatalogEntry[]) => void;
}) {
    const { data } = useData();
    const [newItem, setNewItem] = useState({ name: '', family: 'service', defaultCost: 0 });
    const [selectedTab, setSelectedTab] = useState<'materials' | 'services' | 'promos'>('materials');

    // Items de merchandising del inventario
    const merchItems = useMemo(() => 
        (data?.items || []).filter(item => item.category === 'merch'),
        [data?.items]
    );

    // Productos terminados disponibles para promociones
    const finishedGoodsItems = useMemo(() => 
        (data?.items || []).filter(item => item.category === 'fg'),
        [data?.items]
    );

    const [selectedPromoProduct, setSelectedPromoProduct] = useState<string>('');

    const { saveAllCollections } = useData();

    // Calcular coste de producción desde BOM
    const calculateProductionCost = (itemId: string): number => {
        const bom = (data?.billOfMaterials || []).find(b => b.outputItemId === itemId && b.isActive !== false);
        if (!bom) return 0;

        let totalCost = 0;
        for (const bomItem of bom.items) {
            const rawMaterial = (data?.items || []).find(i => i.id === bomItem.itemId);
            if (rawMaterial && rawMaterial.stdCost) {
                totalCost += rawMaterial.stdCost * bomItem.qty;
            }
        }

        // Dividir por batchSize para obtener coste por unidad
        return bom.batchSize > 0 ? totalCost / bom.batchSize : totalCost;
    };

    // Obtener coste calculado del producto seleccionado
    const selectedProductCost = useMemo(() => {
        if (!selectedPromoProduct) return 0;
        return calculateProductionCost(selectedPromoProduct);
    }, [selectedPromoProduct, data?.billOfMaterials, data?.items]);

    const handleSaveCatalog = async (newCatalog: PosCostCatalogEntry[]) => {
        try {
            // Guardar en Firestore
            await saveAllCollections({ posCostCatalog: newCatalog });
            onUpdateCatalog(newCatalog);
        } catch (error) {
            console.error('Error guardando catálogo:', error);
            alert('Error al guardar el catálogo');
        }
    };

    const handleAddMaterial = async (itemId: string) => {
        const item = merchItems.find(i => i.id === itemId);
        if (!item) return;

        // Verificar si ya existe
        if (catalog.some(c => c.name === item.name)) {
            alert('Este material ya está en el catálogo');
            return;
        }

        const newCatalog = [
            ...catalog,
            {
                id: `cat_merch_${item.id}`,
                name: item.name,
                family: 'material',
                fulfillmentMode: 'inventory',
                defaultCost: item.stdCost || 0
            } as PosCostCatalogEntry
        ];

        await handleSaveCatalog(newCatalog);
    };

    const handleAddService = async () => {
        if (!newItem.name || newItem.defaultCost <= 0) {
            alert('Completa todos los campos');
            return;
        }

        const newCatalog = [
            ...catalog,
            {
                id: `cat_${Date.now()}`,
                name: newItem.name,
                family: 'service',
                fulfillmentMode: 'direct',
                defaultCost: newItem.defaultCost
            } as PosCostCatalogEntry
        ];

        await handleSaveCatalog(newCatalog);
        setNewItem({ name: '', family: 'service', defaultCost: 0 });
    };

    const handleAddPromo = async (type: '5+1' | '1+1' | '3+1') => {
        if (!selectedPromoProduct) {
            alert('Selecciona un producto primero');
            return;
        }

        const selectedItem = finishedGoodsItems.find(i => i.id === selectedPromoProduct);
        if (!selectedItem) {
            alert('Producto no encontrado');
            return;
        }

        // Calcular coste desde BOM
        const costPerUnit = calculateProductionCost(selectedPromoProduct);
        
        if (costPerUnit === 0) {
            alert('No se puede calcular el coste. Verifica que el producto tenga un BOM activo y que las materias primas tengan costes estándar definidos.');
            return;
        }
        let promoCost = 0;
        let promoName = '';

        switch (type) {
            case '5+1':
                promoCost = costPerUnit; // Cuesta 1 unidad
                promoName = `Promo 5+1 ${selectedItem.name}`;
                break;
            case '1+1':
                promoCost = costPerUnit; // Cuesta 1 unidad
                promoName = `Promo 1+1 ${selectedItem.name}`;
                break;
            case '3+1':
                promoCost = costPerUnit; // Cuesta 1 unidad
                promoName = `Promo 3+1 ${selectedItem.name}`;
                break;
        }

        const newCatalog = [
            ...catalog,
            {
                id: `cat_promo_${Date.now()}`,
                name: promoName,
                family: 'promo',
                fulfillmentMode: 'direct',
                defaultCost: promoCost,
                linkedItemId: selectedItem.id // Vincular al producto
            } as PosCostCatalogEntry
        ];

        await handleSaveCatalog(newCatalog);
        setSelectedPromoProduct(''); // Limpiar selección
    };

    const handleRemoveItem = async (id: string) => {
        if (confirm('¿Eliminar este elemento del catálogo?')) {
            const newCatalog = catalog.filter(item => item.id !== id);
            await handleSaveCatalog(newCatalog);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-semibold text-zinc-800">Catálogo de Materiales y Servicios POS</h2>
                    <p className="text-sm text-zinc-600 mt-1">Gestiona los conceptos de gasto para tácticas en punto de venta</p>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Tabs */}
                    <div className="sb-tablist">
                        <button
                            onClick={() => setSelectedTab('materials')}
                            className="sb-tab"
                            aria-selected={selectedTab === 'materials'}
                        >
                            <Package className="w-4 h-4" />
                            Materiales
                        </button>
                        <button
                            onClick={() => setSelectedTab('services')}
                            className="sb-tab"
                            aria-selected={selectedTab === 'services'}
                        >
                            <Briefcase className="w-4 h-4" />
                            Servicios
                        </button>
                        <button
                            onClick={() => setSelectedTab('promos')}
                            className="sb-tab"
                            aria-selected={selectedTab === 'promos'}
                        >
                            <Gift className="w-4 h-4" />
                            Promociones
                        </button>
                    </div>

                    {/* Materials from Inventory */}
                    {selectedTab === 'materials' && (
                        <div className="sb-card__content">
                            <h3 className="sb-h3 mb-3">Añadir Material desde Inventario</h3>
                            <p className="sb-subtle mb-3">Los materiales vienen de tu inventario de merchandising con costes reales</p>
                            <div className="space-y-2">
                                {merchItems.length === 0 ? (
                                    <p className="text-sm text-gray-500">No hay items de merchandising en el inventario</p>
                                ) : (
                                    merchItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                            <div>
                                                <div className="font-medium text-sm">{item.name}</div>
                                                <div className="text-xs text-gray-500">SKU: {item.sku} | Coste: {item.stdCost?.toFixed(2) || '0.00'}€</div>
                                            </div>
                                            <SBButton size="sm" onClick={() => handleAddMaterial(item.id)}>
                                                Añadir
                                            </SBButton>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Services */}
                    {selectedTab === 'services' && (
                        <div className="sb-card__content">
                            <h3 className="sb-h3 mb-3">Añadir Servicio</h3>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="col-span-2">
                                    <label className="text-xs text-gray-600 mb-1 block">Nombre</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Mariachi (hora), Bartender..."
                                        value={newItem.name}
                                        onChange={e => setNewItem(s => ({ ...s, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-600 mb-1 block">Coste (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newItem.defaultCost}
                                        onChange={e => setNewItem(s => ({ ...s, defaultCost: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <SBButton onClick={handleAddService} className="w-full">
                                        <Plus size={16} className="mr-1" />
                                        Añadir
                                    </SBButton>
                                </div>
                            </div>
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground"><strong>Ejemplos:</strong> Mariachi (hora), Bartender (hora), Impresión cartas, Promotoras (día)</p>
                            </div>
                        </div>
                    )}

                    {/* Promotions */}
                    {selectedTab === 'promos' && (
                        <div className="sb-card__content">
                            <h3 className="sb-h3 mb-3">Añadir Promoción</h3>
                            
                            {/* Selector de Producto */}
                            <div className="mb-4 p-4 bg-muted rounded-lg">
                                <label className="text-sm font-semibold text-foreground mb-2 block">
                                    1. Selecciona el Producto en Promoción
                                </label>
                                {finishedGoodsItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No hay productos terminados en el inventario</p>
                                ) : (
                                    <select
                                        value={selectedPromoProduct}
                                        onChange={(e) => setSelectedPromoProduct(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-border rounded-lg text-sm font-medium bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    >
                                        <option value="">-- Elige un producto --</option>
                                        {finishedGoodsItems.map(item => {
                                            const productionCost = calculateProductionCost(item.id);
                                            return (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} - {productionCost.toFixed(2)}€/unit (coste producción)
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                                {selectedPromoProduct && finishedGoodsItems.find(i => i.id === selectedPromoProduct) && (
                                    <div className="mt-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                                        <p className="text-xs font-medium text-primary">
                                            ✓ Producto seleccionado: {finishedGoodsItems.find(i => i.id === selectedPromoProduct)?.name}
                                        </p>
                                        <p className="text-xs text-primary/80 mt-1">
                                            Coste producción: {selectedProductCost.toFixed(2)}€/unit
                                        </p>
                                        {selectedProductCost === 0 && (
                                            <p className="text-xs text-amber-600 mt-1">
                                                ⚠️ No se pudo calcular el coste (verifica BOM y costes de materias primas)
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <p className="text-sm font-semibold text-foreground mb-3">2. Selecciona el Tipo de Promoción</p>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => handleAddPromo('5+1')}
                                    disabled={!selectedPromoProduct}
                                    className={`group p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-2 ${selectedPromoProduct ? 'border-primary/20 hover:border-primary hover:shadow-md cursor-pointer' : 'border-gray-200 opacity-50 cursor-not-allowed'} rounded-xl transition-all`}
                                >
                                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-3">
                                        <Gift className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="text-xl font-bold text-primary mb-1">5+1</div>
                                    <div className="text-xs text-muted-foreground mb-2">Compra 5, lleva 6</div>
                                    <div className="text-xs font-mono text-foreground font-semibold">
                                        {selectedPromoProduct && finishedGoodsItems.find(i => i.id === selectedPromoProduct) 
                                            ? `Coste: ${selectedProductCost.toFixed(2)}€`
                                            : 'Selecciona producto'}
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleAddPromo('1+1')}
                                    disabled={!selectedPromoProduct}
                                    className={`group p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-2 ${selectedPromoProduct ? 'border-primary/20 hover:border-primary hover:shadow-md cursor-pointer' : 'border-gray-200 opacity-50 cursor-not-allowed'} rounded-xl transition-all`}
                                >
                                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-3">
                                        <Gift className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="text-xl font-bold text-primary mb-1">1+1</div>
                                    <div className="text-xs text-muted-foreground mb-2">Compra 1, lleva 2</div>
                                    <div className="text-xs font-mono text-foreground font-semibold">
                                        {selectedPromoProduct && finishedGoodsItems.find(i => i.id === selectedPromoProduct)
                                            ? `Coste: ${selectedProductCost.toFixed(2)}€`
                                            : 'Selecciona producto'}
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleAddPromo('3+1')}
                                    disabled={!selectedPromoProduct}
                                    className={`group p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-2 ${selectedPromoProduct ? 'border-primary/20 hover:border-primary hover:shadow-md cursor-pointer' : 'border-gray-200 opacity-50 cursor-not-allowed'} rounded-xl transition-all`}
                                >
                                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-3">
                                        <Gift className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="text-xl font-bold text-primary mb-1">3+1</div>
                                    <div className="text-xs text-muted-foreground mb-2">Compra 3, lleva 4</div>
                                    <div className="text-xs font-mono text-foreground font-semibold">
                                        {selectedPromoProduct && finishedGoodsItems.find(i => i.id === selectedPromoProduct)
                                            ? `Coste: ${selectedProductCost.toFixed(2)}€`
                                            : 'Selecciona producto'}
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Catalog Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-zinc-800">Catálogo Actual</h3>
                            <span className="text-sm text-zinc-500">{catalog.length} conceptos</span>
                        </div>
                        
                        <div className="space-y-2">
                            {catalog.length === 0 ? (
                                <p className="text-center text-zinc-500 py-8">No hay conceptos en el catálogo todavía</p>
                            ) : (
                                <>
                                    {/* Header */}
                                    <div className="grid grid-cols-5 gap-3 px-4 py-2 bg-zinc-50 rounded-lg text-xs font-semibold text-zinc-600">
                                        <span className="col-span-2">Nombre</span>
                                        <span>Categoría</span>
                                        <span className="text-right">Coste</span>
                                        <span className="text-right">Acciones</span>
                                    </div>

                                    {/* Items */}
                                    {catalog.map(item => (
                                        <div key={item.id} className="grid grid-cols-5 gap-3 px-4 py-3 bg-card border border-border rounded-lg items-center hover:bg-secondary transition-colors">
                                            <span className="col-span-2 text-sm font-medium text-foreground flex items-center gap-2">
                                                {item.family === 'material' && <Package className="w-4 h-4 text-blue-600" />}
                                                {item.family === 'service' && <Briefcase className="w-4 h-4 text-purple-600" />}
                                                {item.family === 'promo' && <Gift className="w-4 h-4 text-primary" />}
                                                {item.name}
                                            </span>
                                            <div>
                                                {item.family === 'material' && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                        Material
                                                    </span>
                                                )}
                                                {item.family === 'service' && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                        Servicio
                                                    </span>
                                                )}
                                                {item.family === 'promo' && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                        Promoción
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-right text-sm font-semibold text-foreground">{item.defaultCost?.toFixed(2) || '0.00'}€</span>
                                            <div className="text-right">
                                                <button
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="text-destructive hover:opacity-80 text-sm font-medium transition-opacity"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                </div>

                <div className="p-6 border-t flex justify-end gap-2">
                    <SBButton variant="secondary" onClick={onClose}>
                        Cerrar
                    </SBButton>
                </div>
            </div>
        </div>
    );
}
