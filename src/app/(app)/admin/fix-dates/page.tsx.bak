"use client";
import React, { useState } from 'react';
import { PageShell } from '@/components/shared/PageShell';
import { useData } from '@/lib/dataprovider';
import { firestoreDb } from '@/lib/firebaseClient';
import { collection, doc, updateDoc, getDocs } from 'firebase/firestore';

export default function FixDatesPage() {
  const { data } = useData();
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [monthsToMove, setMonthsToMove] = useState(4); // De junio a octubre = 4 meses

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const updateAllDates = async () => {
    if (!firestoreDb || !data) return;
    
    setLoading(true);
    addLog('🔄 Iniciando actualización de fechas...');

    try {
      const ordersSnapshot = await getDocs(collection(firestoreDb, 'ordersSellOut'));
      
      addLog(`📊 ${ordersSnapshot.size} pedidos encontrados`);

      let updated = 0;
      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data();
        const oldDate = new Date(orderData.createdAt);
        
        // Sumar X meses
        const newDate = new Date(oldDate);
        newDate.setMonth(oldDate.getMonth() + monthsToMove);
        
        await updateDoc(doc(firestoreDb, 'ordersSellOut', orderDoc.id), {
          createdAt: newDate.toISOString()
        });
        
        updated++;
        if (updated % 10 === 0) {
          addLog(`  ⏳ ${updated} pedidos actualizados...`);
        }
      }

      addLog(`✅ ${updated} pedidos actualizados exitosamente`);
      addLog('🔄 Recarga la página para ver los cambios');
      
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
    
    setLoading(false);
  };

  const previewChanges = () => {
    if (!data) return;
    
    addLog('🔍 PREVIEW DE CAMBIOS:');
    
    const orders = data.ordersSellOut || [];
    const sample = orders.slice(0, 5);
    
    sample.forEach(order => {
      const oldDate = new Date(order.createdAt);
      const newDate = new Date(oldDate);
      newDate.setMonth(oldDate.getMonth() + monthsToMove);
      
      addLog(`  Pedido ${order.id}: ${oldDate.toLocaleDateString('es-ES')} → ${newDate.toLocaleDateString('es-ES')}`);
    });
    
    addLog(`Total: ${orders.length} pedidos se actualizarán`);
  };

  if (!data) {
    return (
      <PageShell title="Actualizar Fechas" module="admin">
        <div>Cargando...</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Actualizar Fechas de Pedidos" module="admin">
      <div className="space-y-6">
        {/* Configuración */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Configuración</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Meses a adelantar/atrasar
              </label>
              <input
                type="number"
                value={monthsToMove}
                onChange={(e) => setMonthsToMove(parseInt(e.target.value))}
                className="w-full p-2 border rounded-lg"
                placeholder="Ejemplo: 4 (junio → octubre)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Positivo = adelantar, Negativo = atrasar. Ejemplo: 4 mueve de junio a octubre.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={previewChanges}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                🔍 Ver Preview
              </button>

              <button
                onClick={updateAllDates}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? '⏳ Actualizando...' : '⚠️ Actualizar TODAS las fechas'}
              </button>
            </div>
          </div>
        </div>

        {/* Información */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">⚠️ Advertencia</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Esta operación actualiza TODAS las fechas de los pedidos</li>
            <li>• No se puede deshacer fácilmente</li>
            <li>• Usa "Ver Preview" primero para verificar los cambios</li>
            <li>• Los dashboards se actualizarán automáticamente</li>
          </ul>
        </div>

        {/* Log */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold mb-2">Log de Operaciones:</h3>
          <div className="font-mono text-xs space-y-1 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded">
            {log.length === 0 && (
              <p className="text-gray-500">Esperando operación...</p>
            )}
            {log.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        </div>

        {/* Sugerencias comunes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">💡 Sugerencias comunes</h3>
          <div className="text-sm space-y-2">
            <p><strong>Junio → Octubre:</strong> +4 meses</p>
            <p><strong>Junio → Septiembre:</strong> +3 meses</p>
            <p><strong>Octubre → Junio:</strong> -4 meses</p>
            <p><strong>Para ver mes actual:</strong> Calcula diferencia desde tus datos actuales hasta hoy</p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
