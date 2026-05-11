import { BrainRule, SimulationResult } from '@/domain/brain';

interface RulesTabProps {
    rules: BrainRule[];
    onToggleRule: (ruleId: string, enabled: boolean) => void;
    onSimulate: () => void;
    onExecute: () => void;
    simulating: boolean;
    saving: boolean;
    simulationResult: SimulationResult | null;
}

export function RulesTab({
    rules,
    onToggleRule,
    onSimulate,
    onExecute,
    simulating,
    saving,
    simulationResult
}: RulesTabProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {rules.filter(r => r.enabled).length} reglas activas de {rules.length} totales
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={onSimulate}
                        disabled={simulating}
                        className="sb-btn sb-btn--ghost"
                    >
                        {simulating ? 'Simulando...' : '🧪 Simular'}
                    </button>
                    <button
                        onClick={onExecute}
                        disabled={saving}
                        className="sb-btn sb-btn--primary"
                    >
                        {saving ? 'Ejecutando...' : '▶️ Ejecutar Ahora'}
                    </button>
                </div>
            </div>

            {simulationResult && (
                <div className="sb-card" style={{ backgroundColor: 'hsl(var(--info) / 0.1)', borderColor: 'hsl(var(--info) / 0.3)' }}>
                    <h4 className="font-semibold mb-2">📊 Resultado de Simulación</h4>
                    <p className="text-sm">{simulationResult.preview}</p>
                    {simulationResult.totalActions > 0 && (
                        <div className="mt-2 text-xs">
                            <p className="font-medium">Por usuario:</p>
                            <ul className="list-disc list-inside">
                                {Object.entries(simulationResult.byUser).map(([userId, count]) => (
                                    <li key={userId}>
                                        {userId}: {count} tareas
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                {rules.map((rule) => (
                    <div
                        key={rule.id}
                        className="sb-card flex items-start justify-between"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{rule.name}</h4>
                                <span className={
                                    rule.severity === 'CRIT' ? 'sb-badge sb-badge--destructive' :
                                        rule.severity === 'WARN' ? 'sb-badge' :
                                            'sb-badge sb-badge--primary'
                                }>
                                    {rule.severity}
                                </span>
                            </div>
                            {rule.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {rule.description}
                                </p>
                            )}
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Scope: {rule.scope}</span>
                                <span>Dedupe: {rule.dedupeHours}h</span>
                            </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rule.enabled}
                                onChange={(e) => onToggleRule(rule.id, e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}
