import { DashboardConfigData } from '@/server/actions/dashboard-config.actions';

interface DashboardsTabProps {
    config: DashboardConfigData;
    setConfig: (config: DashboardConfigData) => void;
    onSave: () => void;
    onReset: () => void;
    saving: boolean;
}

export function DashboardsTab({ config, setConfig, onSave, onReset, saving }: DashboardsTabProps) {
    return (
        <div className="space-y-6">
            <div className="sb-card bg-info/5 border-info/20">
                <p className="text-sm">
                    ⚙️ Configuración centralizada de umbrales y objetivos para todos los dashboards.
                    Los cambios aquí afectan a todos los KPIs, alertas y fórmulas del sistema.
                </p>
            </div>

            {/* Thresholds */}
            <div className="sb-card">
                <h3 className="text-lg font-semibold mb-4">🎯 Umbrales de Alerta</h3>

                <div className="space-y-6">
                    {/* Stock */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">📦 Stock</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Stock Crítico (unidades)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.STOCK_CRITICAL}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, STOCK_CRITICAL: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Stock Bajo (unidades)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.STOCK_LOW}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, STOCK_LOW: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Cobertura Mínima (días)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.STOCK_COVERAGE_MIN}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, STOCK_COVERAGE_MIN: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Cobertura Óptima (días)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.STOCK_COVERAGE_OPTIMAL}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, STOCK_COVERAGE_OPTIMAL: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cuentas */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">🏪 Cuentas</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Cuenta Inactiva (días)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.ACCOUNT_INACTIVE_DAYS}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, ACCOUNT_INACTIVE_DAYS: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Cuenta Crítica (días)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.ACCOUNT_CRITICAL_DAYS}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, ACCOUNT_CRITICAL_DAYS: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ventas */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">💰 Ventas</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Conversión Mínima (%)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.CONVERSION_MIN}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, CONVERSION_MIN: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Conversión Óptima (%)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.CONVERSION_OPTIMAL}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, CONVERSION_OPTIMAL: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Objetivo Mensual Mín. (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.thresholds.MONTHLY_TARGET_MIN}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, MONTHLY_TARGET_MIN: parseFloat(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Producción */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">🏭 Producción</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">OEE Mínimo (%)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.OEE_MIN}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, OEE_MIN: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">OEE Óptimo (%)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.OEE_OPTIMAL}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, OEE_OPTIMAL: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">QC Max Pending (horas)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.QC_PENDING_MAX_HOURS}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, QC_PENDING_MAX_HOURS: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Finanzas */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">💵 Finanzas</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Factura Vencida (días)</label>
                                <input
                                    type="number"
                                    value={config.thresholds.INVOICE_OVERDUE_DAYS}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, INVOICE_OVERDUE_DAYS: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Uso Crédito Warning (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={config.thresholds.CREDIT_USAGE_WARNING * 100}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, CREDIT_USAGE_WARNING: parseFloat(e.target.value) / 100 }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Uso Crédito Crítico (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={config.thresholds.CREDIT_USAGE_CRITICAL * 100}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        thresholds: { ...config.thresholds, CREDIT_USAGE_CRITICAL: parseFloat(e.target.value) / 100 }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Targets */}
            <div className="sb-card">
                <h3 className="text-lg font-semibold mb-4">🎯 Objetivos por Defecto</h3>

                <div className="space-y-6">
                    {/* Ventas */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">💰 Ventas</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Ventas Mensuales (€)</label>
                                <input
                                    type="number"
                                    value={config.targets.MONTHLY_SALES}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, MONTHLY_SALES: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Visitas Diarias</label>
                                <input
                                    type="number"
                                    value={config.targets.DAILY_VISITS}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, DAILY_VISITS: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Pedidos Mensuales</label>
                                <input
                                    type="number"
                                    value={config.targets.MONTHLY_ORDERS}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, MONTHLY_ORDERS: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Producción */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">🏭 Producción</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">OEE Target (%)</label>
                                <input
                                    type="number"
                                    value={config.targets.OEE_TARGET}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, OEE_TARGET: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tasa Rechazo Max (%)</label>
                                <input
                                    type="number"
                                    value={config.targets.REJECT_RATE_MAX}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, REJECT_RATE_MAX: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Órdenes Diarias</label>
                                <input
                                    type="number"
                                    value={config.targets.DAILY_PRODUCTION_ORDERS}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, DAILY_PRODUCTION_ORDERS: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Logística */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">🚚 Logística</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">OTIF Target (%)</label>
                                <input
                                    type="number"
                                    value={config.targets.OTIF_TARGET}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, OTIF_TARGET: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tiempo Entrega (días)</label>
                                <input
                                    type="number"
                                    value={config.targets.DELIVERY_TIME_DAYS}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, DELIVERY_TIME_DAYS: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Finanzas */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">💵 Finanzas</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Tasa Cobro (%)</label>
                                <input
                                    type="number"
                                    value={config.targets.COLLECTION_RATE}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, COLLECTION_RATE: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Mora Máxima (%)</label>
                                <input
                                    type="number"
                                    value={config.targets.OVERDUE_MAX}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        targets: { ...config.targets, OVERDUE_MAX: parseInt(e.target.value) }
                                    })}
                                    className="sb-input"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="sb-btn sb-btn--primary flex-1"
                >
                    {saving ? 'Guardando...' : '💾 Guardar Configuración'}
                </button>
                <button
                    onClick={onReset}
                    disabled={saving}
                    className="sb-btn sb-btn--ghost"
                >
                    🔄 Resetear a Valores por Defecto
                </button>
            </div>
        </div>
    );
}
