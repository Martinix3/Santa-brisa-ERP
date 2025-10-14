"use client";

import { useState } from "react";
import QuickLogDrawer from "@/features/quicklog/QuickLogDrawer";

export default function TestDrawerPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="sb-page">
      <div className="sb-page__content">
        <div className="sb-card p-8 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">🧪 Test QuickLog Drawer</h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-semibold text-blue-900 mb-2">
                📋 Qué Verificar en Desktop
              </h2>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Panel lateral full-height (100vh)</li>
                <li>✓ Sin esquinas redondeadas</li>
                <li>✓ Sombras 3D sutiles (4 capas)</li>
                <li>✓ Ancho responsive: 380px-540px</li>
                <li>✓ Pegado al borde derecho</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="font-semibold text-green-900 mb-2">
                📱 Qué Verificar en Mobile
              </h2>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✓ Bottom sheet desde abajo</li>
                <li>✓ Esquinas redondeadas arriba</li>
                <li>✓ max-height: 90vh</li>
                <li>✓ Animación slide-up suave</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="font-semibold text-yellow-900 mb-2">
                🎨 Features QuickLog
              </h2>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>✓ Botón 🎙️ micrófono en header</li>
                <li>✓ SANTA BRAIN (con controles de cuenta)</li>
                <li>✓ Constructor de acciones</li>
                <li>✓ Botón "+ Añadir acción"</li>
                <li>✓ Botón "Confirmar y Guardar"</li>
              </ul>
            </div>

            <button
              onClick={() => setDrawerOpen(true)}
              className="sb-btn sb-btn--primary sb-btn--lg w-full"
            >
              🚀 Abrir QuickLog Drawer
            </button>

            <div className="text-xs text-muted-foreground text-center">
              Esta página es solo para pruebas. Puedes eliminarla después.
            </div>
          </div>
        </div>

        <QuickLogDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    </div>
  );
}
