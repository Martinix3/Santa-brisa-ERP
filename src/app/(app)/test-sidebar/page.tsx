"use client";

import { Sidebar } from "@/components/layout/Sidebar";

// Página de prueba con sidebar renderizado localmente
export default function TestSidebarPage() {
  return (
    <div className="flex h-screen">
      {/* Sidebar renderizado directamente en la página */}
      <Sidebar isAdmin={true} />
      
      {/* Contenido */}
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-2xl font-bold mb-4">Prueba del Sidebar (Renderizado Local)</h1>
        <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg mb-4">
          <p className="text-sm font-semibold">⚠️ Este sidebar está renderizado DENTRO de esta página</p>
          <p className="text-xs mt-1">No es el sidebar del layout global</p>
        </div>
        <p className="text-muted-foreground">
          Esta página renderiza el sidebar directamente para pruebas aisladas.
        </p>
        <p className="mt-4 text-sm">
          Haz hover sobre las secciones del sidebar que tienen submenús:
        </p>
        <ul className="mt-2 text-sm space-y-1">
          <li>• 📊 Inicio (Calendario/Tareas, Contactos)</li>
          <li>• 💼 Ventas (Cuentas, Pedidos)</li>
          <li>• 📣 Marketing (Collabs, Ads, Events, POS)</li>
          <li>• 🥼 Calidad (Lot Release, Trazabilidad, Parámetros)</li>
          <li>• 🚚 Almacén (Shipping, Recepción, Inventario)</li>
          <li>• 🏭 Producción (BOM, Execution)</li>
          <li>• 💵 Finanzas (Cobros, Pagos)</li>
          <li>• ⚙️ Admin (Integrations, Variables, Settings, Users)</li>
        </ul>
        
        <div className="mt-8 p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Pruebas a realizar:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Hover sobre cualquier sección con submenús</li>
            <li>Verificar que aparece el popup blanco</li>
            <li>Mover el mouse sobre el popup (debería mantenerse abierto)</li>
            <li>Hacer click en los links del popup</li>
            <li>Click en flecha para colapsar/expandir sidebar</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
