
"use client";

import React, { useState, useMemo } from 'react';
import { SBCard, SB_COLORS } from '@/components/ui/ui-primitives';
import { QC_PARAMS as INITIAL_QC_PARAMS, QCKey } from '@/domain/production.qc';
import { TestTube2, Save, Plus, Thermometer, FlaskConical, Beaker, Droplets } from 'lucide-react';
import { useData } from '@/lib/dataprovider';

const ICONS: Record<string, React.ElementType> = {
    TestTube2,
    Thermometer,
    FlaskConical,
    Beaker,
    Droplets,
};

function QCParamsPage() {
    const { data: santaData } = useData();
    const products = santaData?.products || [];

    const [paramsBySku, setParamsBySku] = useState(INITIAL_QC_PARAMS);
    const [selectedSku, setSelectedSku] = useState(products[0]?.sku || '');
    
    const [notification, setNotification] = useState<string | null>(null);
    const [newParam, setNewParam] = useState({
        key: '',
        label: '',
        unit: '',
        min: '0',
        max: '10',
        icon: 'TestTube2'
    });

    const currentParams = useMemo(() => paramsBySku[selectedSku] || {}, [paramsBySku, selectedSku]);

    const handleParamChange = (key: QCKey, field: 'label' | 'min' | 'max' | 'unit', value: string) => {
        setParamsBySku(prev => ({
            ...prev,
            [selectedSku]: {
                ...prev[selectedSku],
                [key]: {
                    ...prev[selectedSku][key],
                    [field]: field === 'min' || field === 'max' ? parseFloat(value) : value,
                },
            }
        }));
    };
    
    const handleSave = () => {
        // En una app real, esto enviaría los datos a un backend/API.
        console.log("Guardando nuevos parámetros:", paramsBySku);
        setNotification("¡Parámetros guardados con éxito!");
        setTimeout(() => setNotification(null), 3000);
    };

    const handleNewParamChange = (field: keyof typeof newParam, value: string) => {
        setNewParam(prev => ({ ...prev, [field]: value }));
    };

    const handleAddNewParam = (e: React.FormEvent) => {
        e.preventDefault();
        const { key, label, min, max, icon, unit } = newParam;
        if (!key || !label || !selectedSku) {
            setNotification("La clave, la etiqueta y un SKU seleccionado son obligatorios.");
            setTimeout(() => setNotification(null), 3000);
            return;
        }

        if (currentParams && currentParams[key as QCKey]) {
            setNotification(`El parámetro con clave "${key}" ya existe para este SKU.`);
            setTimeout(() => setNotification(null), 3000);
            return;
        }
        
        setParamsBySku(prev => {
            const skuParams = prev[selectedSku] || {};
            return {
                ...prev,
                [selectedSku]: {
                    ...skuParams,
                    [key]: {
                        label,
                        unit,
                        min: parseFloat(min),
                        max: parseFloat(max),
                        icon: ICONS[icon] || TestTube2
                    }
                }
            }
        });

        setNewParam({ key: '', label: '', unit: '', min: '0', max: '10', icon: 'TestTube2' });
        setNotification(`Parámetro "${label}" añadido a ${selectedSku}.`);
        setTimeout(() => setNotification(null), 3000);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-zinc-800">Parámetros de Control de Calidad (QC) por SKU</h1>
                <p className="text-zinc-600">
                    Esta tabla define las especificaciones por producto. Selecciona un SKU para ver o editar sus parámetros.
                </p>
            </div>

             <SBCard title="Selección de Producto" accent={SB_COLORS.admin}>
                <div className="p-4">
                    <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium">Producto (SKU)</span>
                        <select
                            value={selectedSku}
                            onChange={e => setSelectedSku(e.target.value)}
                            className="h-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                        >
                            <option value="" disabled>-- Selecciona un producto --</option>
                            {products.map(p => (
                                <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
                            ))}
                        </select>
                    </label>
                </div>
            </SBCard>

            {selectedSku && (
                <SBCard title={`Especificaciones para ${selectedSku}`} accent={SB_COLORS.admin}>
                    <div className="p-4">
                        <table className="w-full text-sm text-left">
                            <thead className="border-b">
                                <tr>
                                    <th className="p-2 font-semibold w-1/3">Parámetro</th>
                                    <th className="p-2 font-semibold text-center">Unidad</th>
                                    <th className="p-2 font-semibold text-center">Mínimo</th>
                                    <th className="p-2 font-semibold text-center">Máximo</th>
                                    <th className="p-2 font-semibold text-center">Icono</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(Object.keys(currentParams) as QCKey[]).map(key => {
                                    const param = currentParams[key];
                                    if (!param) return null;
                                    const Icon = param.icon || TestTube2;
                                    return (
                                        <tr key={key} className="border-b last:border-b-0 hover:bg-zinc-50">
                                            <td className="p-2">
                                                 <input 
                                                    type="text" 
                                                    value={param.label}
                                                    onChange={(e) => handleParamChange(key, 'label', e.target.value)}
                                                    className="w-full h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm font-medium text-zinc-800"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input 
                                                    type="text" 
                                                    value={param.unit || ''}
                                                    onChange={(e) => handleParamChange(key, 'unit', e.target.value)}
                                                    className="w-20 h-9 text-center rounded-md border border-zinc-200 bg-white px-2 text-sm"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={'min' in param ? param.min : ''}
                                                    onChange={(e) => handleParamChange(key, 'min', e.target.value)}
                                                    className="w-24 h-9 text-center rounded-md border border-zinc-200 bg-white px-2 text-sm"
                                                    disabled={'min' in param === false}
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                 <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={'max' in param ? param.max : ''}
                                                    onChange={(e) => handleParamChange(key, 'max', e.target.value)}
                                                    className="w-24 h-9 text-center rounded-md border border-zinc-200 bg-white px-2 text-sm"
                                                    disabled={'max' in param === false}
                                                />
                                            </td>
                                            <td className="p-3 text-center">
                                                <Icon className="h-5 w-5 inline-block text-zinc-500" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t p-4 bg-zinc-50/50">
                        <h3 className="font-semibold text-sm mb-3">Añadir Nuevo Parámetro a {selectedSku}</h3>
                        <form onSubmit={handleAddNewParam} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                             <label className="grid gap-1 md:col-span-2">
                                <span className="text-xs font-medium text-zinc-600">Etiqueta</span>
                                <input value={newParam.label} onChange={e => handleNewParamChange('label', e.target.value)} placeholder="Ej. Grado Brix" className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm" required />
                             </label>
                             <label className="grid gap-1">
                                <span className="text-xs font-medium text-zinc-600">Clave (key)</span>
                                <input value={newParam.key} onChange={e => handleNewParamChange('key', e.target.value)} placeholder="ej_brix" className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm" required />
                             </label>
                             <label className="grid gap-1">
                                <span className="text-xs font-medium text-zinc-600">Unidad</span>
                                <input value={newParam.unit} onChange={e => handleNewParamChange('unit', e.target.value)} placeholder="°Bx" className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm" />
                             </label>
                             <label className="grid gap-1">
                                <span className="text-xs font-medium text-zinc-600">Mínimo</span>
                                <input type="number" step="0.01" value={newParam.min} onChange={e => handleNewParamChange('min', e.target.value)} className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm" />
                             </label>
                             <label className="grid gap-1">
                                <span className="text-xs font-medium text-zinc-600">Máximo</span>
                                <input type="number" step="0.01" value={newParam.max} onChange={e => handleNewParamChange('max', e.target.value)} className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm" />
                             </label>
                             <div className="md:col-span-6 flex items-end gap-3">
                                 <label className="grid gap-1 flex-grow">
                                    <span className="text-xs font-medium text-zinc-600">Icono</span>
                                    <select value={newParam.icon} onChange={e => handleNewParamChange('icon', e.target.value)} className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm">
                                        {Object.keys(ICONS).map(iconName => (
                                            <option key={iconName} value={iconName}>{iconName}</option>
                                        ))}
                                    </select>
                                </label>
                                <button type="submit" className="h-9 flex items-center gap-2 text-sm bg-zinc-200 border border-zinc-300 text-zinc-800 rounded-lg px-4 font-semibold hover:bg-zinc-300">
                                    <Plus size={16} /> Añadir
                                </button>
                            </div>
                        </form>
                    </div>

                     <div className="p-4 border-t bg-zinc-50 flex justify-end items-center gap-4">
                        {notification && <span className="text-sm text-green-600 font-medium">{notification}</span>}
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 text-sm bg-zinc-800 text-white rounded-lg px-4 py-2 font-semibold hover:bg-zinc-700"
                        >
                            <Save size={16} /> Guardar Cambios
                        </button>
                    </div>
                </SBCard>
            )}
        </div>
    );
}

export default QCParamsPage;
