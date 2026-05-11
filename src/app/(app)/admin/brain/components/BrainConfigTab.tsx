import { BrainConfig } from '@/domain/brain';

interface BrainConfigTabProps {
    config: BrainConfig;
    setConfig: (config: BrainConfig) => void;
    onSave: () => void;
    saving: boolean;
}

export function BrainConfigTab({ config, setConfig, onSave, saving }: BrainConfigTabProps) {
    return (
        <div className="space-y-6">
            <div className="sb-card">
                <h3 className="text-lg font-semibold mb-4">🕐 Horarios</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Resumen matutino
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="23"
                            value={config.schedules.dailyMorningHour}
                            onChange={(e) => setConfig({
                                ...config,
                                schedules: {
                                    ...config.schedules,
                                    dailyMorningHour: parseInt(e.target.value),
                                },
                            })}
                            className="sb-input"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {config.schedules.dailyMorningHour}:00
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Cierre del día
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="23"
                            value={config.schedules.dailyEveningHour}
                            onChange={(e) => setConfig({
                                ...config,
                                schedules: {
                                    ...config.schedules,
                                    dailyEveningHour: parseInt(e.target.value),
                                },
                            })}
                            className="sb-input"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {config.schedules.dailyEveningHour}:00
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Follow-up visitas (horas)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="24"
                            value={config.schedules.visitFollowupHours}
                            onChange={(e) => setConfig({
                                ...config,
                                schedules: {
                                    ...config.schedules,
                                    visitFollowupHours: parseInt(e.target.value),
                                },
                            })}
                            className="sb-input"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            +{config.schedules.visitFollowupHours}h post-visita
                        </p>
                    </div>
                </div>
            </div>

            <div className="sb-card">
                <h3 className="text-lg font-semibold mb-4">📏 Umbrales (días)</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            No-touch 30 días
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={config.thresholds.noTouchDays30}
                            onChange={(e) => setConfig({
                                ...config,
                                thresholds: {
                                    ...config.thresholds,
                                    noTouchDays30: parseInt(e.target.value),
                                },
                            })}
                            className="sb-input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            No-touch 60 días
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={config.thresholds.noTouchDays60}
                            onChange={(e) => setConfig({
                                ...config,
                                thresholds: {
                                    ...config.thresholds,
                                    noTouchDays60: parseInt(e.target.value),
                                },
                            })}
                            className="sb-input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Sin pedido 45 días
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={config.thresholds.noOrderDays45}
                            onChange={(e) => setConfig({
                                ...config,
                                thresholds: {
                                    ...config.thresholds,
                                    noOrderDays45: parseInt(e.target.value),
                                },
                            })}
                            className="sb-input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Sin pedido 90 días
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={config.thresholds.noOrderDays90}
                            onChange={(e) => setConfig({
                                ...config,
                                thresholds: {
                                    ...config.thresholds,
                                    noOrderDays90: parseInt(e.target.value),
                                },
                            })}
                            className="sb-input"
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={onSave}
                disabled={saving}
                className="sb-btn sb-btn--primary"
            >
                {saving ? 'Guardando...' : '💾 Guardar Configuración'}
            </button>
        </div>
    );
}
