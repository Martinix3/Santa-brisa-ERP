export function SyncRulesTab() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="sb-card bg-blue-50 border-blue-200">
                <div className="flex gap-3">
                    <div className="text-2xl">🔄</div>
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Reglas de Sincronización</h3>
                        <p className="text-sm text-blue-800">
                            Estas son las reglas que determinan cómo se sincronizan los datos entre el ERP y las integraciones externas (Holded, Shopify, Sendcloud).
                        </p>
                    </div>
                </div>
            </div>

            {/* HOLDED - Cuentas */}
            <div className="sb-card">
                <div className="flex items-center gap-2 mb-4">
                    <div className="text-xl">🏦</div>
                    <h3 className="text-lg font-semibold">HOLDED - Cuentas</h3>
                </div>

                {/* Detección de Duplicados */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-3 text-zinc-600">🔍 Detección de Duplicados</h4>
                    <div className="space-y-3">
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs bg-green-200 px-2 py-0.5 rounded">100%</span>
                                <span className="font-semibold text-sm">Estrategia 1: Por CIF</span>
                            </div>
                            <p className="text-xs text-zinc-700">
                                Busca coincidencia <strong>exacta</strong> del CIF/NIF. Si encuentra → <strong>MERGE</strong>
                            </p>
                            <code className="block mt-2 text-xs bg-white p-2 rounded border">
                                if (holdedContact.vatNumber === party.vat) → MERGE
                            </code>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs bg-blue-200 px-2 py-0.5 rounded">95%</span>
                                <span className="font-semibold text-sm">Estrategia 2: Por Email</span>
                            </div>
                            <p className="text-xs text-zinc-700">
                                Busca coincidencia <strong>exacta</strong> del email. Si encuentra → <strong>MERGE</strong>
                            </p>
                            <code className="block mt-2 text-xs bg-white p-2 rounded border">
                                if (holdedContact.email.toLowerCase() === party.email) → MERGE
                            </code>
                        </div>

                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs bg-yellow-200 px-2 py-0.5 rounded">85%</span>
                                <span className="font-semibold text-sm">Estrategia 3: Por Nombre + Ciudad (Fuzzy)</span>
                            </div>
                            <p className="text-xs text-zinc-700">
                                Usa algoritmo <strong>Levenshtein</strong> con umbral del 90% de similitud. Si encuentra → <strong>MERGE</strong>
                            </p>
                            <code className="block mt-2 text-xs bg-white p-2 rounded border">
                                {`similarity(name1, name2) > 0.9 && city1 === city2 → MERGE`}
                            </code>
                        </div>
                    </div>
                </div>

                {/* Resolución de Conflictos */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-3 text-zinc-600">⚔️ Resolución de Conflictos</h4>
                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="text-lg">🏆</div>
                            <span className="font-semibold">Última modificación gana</span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                                <span className="text-green-600 font-bold">✓</span>
                                <div>
                                    <strong>Si Holded más reciente:</strong> Actualiza datos en ERP (MERGE)
                                    <code className="block mt-1 text-xs bg-white p-1 rounded">
                                        if (holdedUpdatedAt {'>'} erpUpdatedAt) → UPDATE ERP
                                    </code>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-yellow-600 font-bold">⊘</span>
                                <div>
                                    <strong>Si ERP más reciente:</strong> No sobrescribe, omite (SKIP)
                                    <code className="block mt-1 text-xs bg-white p-1 rounded">
                                        if (erpUpdatedAt {'>'} holdedUpdatedAt) → SKIP
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mapeo de Campos */}
                <div>
                    <h4 className="text-sm font-semibold mb-3 text-zinc-600">🗺️ Mapeo de Campos</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-zinc-200">
                                    <th className="text-left p-2 bg-zinc-50">Campo Holded</th>
                                    <th className="text-center p-2 bg-zinc-50">→</th>
                                    <th className="text-left p-2 bg-zinc-50">Campo ERP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                                <tr>
                                    <td className="p-2 font-mono">name</td>
                                    <td className="text-center p-2">→</td>
                                    <td className="p-2 font-mono">Account.name + Party.name</td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-mono">vatNumber</td>
                                    <td className="text-center p-2">→</td>
                                    <td className="p-2 font-mono">Party.vat</td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-mono">email</td>
                                    <td className="text-center p-2">→</td>
                                    <td className="p-2 font-mono">Party.emails[0].value</td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-mono">phone / mobile</td>
                                    <td className="text-center p-2">→</td>
                                    <td className="p-2 font-mono">Party.phones[0].value</td>
                                </tr>
                                <tr>
                                    <td className="p-2 font-mono">address, city, zip...</td>
                                    <td className="text-center p-2">→</td>
                                    <td className="p-2 font-mono">Party.billingAddress.{'{...}'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* SHOPIFY - Pedidos */}
            <div className="sb-card">
                <div className="flex items-center gap-2 mb-4">
                    <div className="text-xl">🛒</div>
                    <h3 className="text-lg font-semibold">SHOPIFY - Pedidos</h3>
                </div>

                <div className="space-y-4">
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-xs bg-purple-200 px-2 py-0.5 rounded">100%</span>
                            <span className="font-semibold text-sm">Detección: Por shopifyOrderId</span>
                        </div>
                        <p className="text-xs text-zinc-700 mb-2">
                            Si el pedido ya existe en el ERP (por external.shopifyOrderId) → <strong>SKIP</strong>
                        </p>
                        <code className="block text-xs bg-white p-2 rounded border">
                            if (order.external?.shopifyOrderId === shopifyOrder.id) → SKIP
                        </code>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-2 text-zinc-600">📦 Campos Importados</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-zinc-50 rounded border">• order_number → OrderSellOut.code</div>
                            <div className="p-2 bg-zinc-50 rounded border">• customer → Party + Account</div>
                            <div className="p-2 bg-zinc-50 rounded border">• line_items → OrderSellOut.lines</div>
                            <div className="p-2 bg-zinc-50 rounded border">• total_price → OrderSellOut.total</div>
                            <div className="p-2 bg-zinc-50 rounded border">• shipping_address → delivery info</div>
                            <div className="p-2 bg-zinc-50 rounded border">• fulfillment_status → status</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SENDCLOUD - Tracking */}
            <div className="sb-card">
                <div className="flex items-center gap-2 mb-4">
                    <div className="text-xl">📦</div>
                    <h3 className="text-lg font-semibold">SENDCLOUD - Tracking</h3>
                </div>

                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">Actualización de Estado</span>
                    </div>
                    <p className="text-xs text-zinc-700 mb-2">
                        Webhook recibe updates de tracking y actualiza el shipment correspondiente
                    </p>
                    <div className="space-y-1 text-xs mt-2">
                        <div className="flex items-center gap-2">
                            <code className="bg-white px-2 py-1 rounded border">tracking_code</code>
                            <span>→</span>
                            <span>Busca Shipment.trackingCode</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="bg-white px-2 py-1 rounded border">status_message</code>
                            <span>→</span>
                            <span>Actualiza Shipment.status</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="bg-white px-2 py-1 rounded border">timestamp</code>
                            <span>→</span>
                            <span>Añade evento al timeline</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Master Sync Order */}
            <div className="sb-card bg-zinc-900 text-white">
                <div className="flex items-center gap-2 mb-4">
                    <div className="text-xl">⚡</div>
                    <h3 className="text-lg font-semibold">Orden de Sincronización Master</h3>
                </div>
                <p className="text-sm text-zinc-300 mb-4">
                    Cuando se ejecuta la sincronización global, este es el orden de operaciones:
                </p>
                <div className="space-y-2">
                    {[
                        { num: 1, name: 'Holded Accounts', desc: 'Primero las cuentas (base de datos)' },
                        { num: 2, name: 'Holded Orders', desc: 'Luego los pedidos asociados' },
                        { num: 3, name: 'Holded Payments', desc: 'Pagos vinculados a pedidos' },
                        { num: 4, name: 'Holded Invoices', desc: 'Facturas generadas' },
                        { num: 5, name: 'Sendcloud Tracking', desc: 'Updates de estado de envíos' },
                        { num: 6, name: 'Shopify Orders', desc: 'Pedidos de e-commerce' }
                    ].map((step) => (
                        <div key={step.num} className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg">
                            <div className="flex-shrink-0 w-6 h-6 bg-white text-zinc-900 rounded-full flex items-center justify-center text-xs font-bold">
                                {step.num}
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-sm">{step.name}</div>
                                <div className="text-xs text-zinc-400">{step.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                    <p className="text-xs text-yellow-200">
                        <strong>⚠️ Importante:</strong> Si una integración falla, las demás continúan. Cada operación es independiente y registra sus propios errores.
                    </p>
                </div>
            </div>
        </div>
    );
}
