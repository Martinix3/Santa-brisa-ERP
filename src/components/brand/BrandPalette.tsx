// src/components/brand/BrandPalette.tsx
"use client";

import React from "react";
import { Department } from "@/domain/ssot";

const DEPARTMENTS: Array<{ name: string; label: string; description: string }> = [
  { name: "PERSONAL", label: "Personal", description: "Sol Brisa - Amarillos cálidos" },
  { name: "VENTAS", label: "Ventas", description: "Cobre Arena - Naranjas terrosos" },
  { name: "MARKETING", label: "Marketing", description: "Aqua Claro - Verde-azulados" },
  { name: "LOGISTICA", label: "Logística", description: "Cobre Tierra - Marrones cobrizo" },
  { name: "PRODUCCION", label: "Producción", description: "Aqua Profundo - Verdes grisáceos" },
  { name: "CALIDAD", label: "Calidad", description: "Azul Cálido - Azul lavanda" },
  { name: "FINANZAS", label: "Finanzas", description: "Oro Miel - Dorados tostados" },
  { name: "ADMIN", label: "Admin", description: "Gris Piedra - Grises oliva" },
];

export function BrandPalette() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Paleta Santa Brisa v2</h1>
        <p className="text-muted-foreground">
          Colores equilibrados por departamento con estilo glassmorphism
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEPARTMENTS.map((dept) => (
          <DeptCard key={dept.name} {...dept} />
        ))}
      </div>

      <div className="space-y-4 pt-6 border-t">
        <h2 className="text-xl font-semibold">Ejemplo de Uso</h2>
        <div className="grid gap-3">
          {DEPARTMENTS.slice(0, 3).map((dept) => (
            <div
              key={dept.name}
              className={`dept-${dept.name} p-4 rounded-xl border transition-all hover:scale-[1.02]`}
              style={{
                backgroundColor: `rgb(var(--dept-bg) / 0.8)`,
                borderColor: `rgb(var(--dept-border) / 0.4)`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`avatar-${dept.name} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm`}
                    style={{
                      backgroundColor: `rgb(var(--avatar-bg))`,
                    }}
                  >
                    {dept.label.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div
                      className="font-semibold"
                      style={{ color: `rgb(var(--dept-text))` }}
                    >
                      Tarea de {dept.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Ejemplo de descripción
                    </div>
                  </div>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `rgb(var(--dept-badge-bg))`,
                    color: `rgb(var(--dept-badge-text))`,
                  }}
                >
                  {dept.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeptCard({
  name,
  label,
  description,
}: {
  name: string;
  label: string;
  description: string;
}) {
  return (
    <div className={`dept-${name} rounded-xl border p-5 space-y-4`}>
      {/* Header con avatar */}
      <div className="flex items-center gap-3">
        <div
          className={`avatar-${name} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold`}
          style={{
            backgroundColor: `rgb(var(--avatar-bg))`,
          }}
        >
          {label.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div
            className="font-bold text-lg"
            style={{ color: `rgb(var(--dept-text))` }}
          >
            {label}
          </div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>

      {/* Background sample */}
      <div
        className="h-16 rounded-lg border"
        style={{
          backgroundColor: `rgb(var(--dept-bg))`,
          borderColor: `rgb(var(--dept-border))`,
        }}
      >
        <div className="h-full flex items-center justify-center">
          <span
            className="text-xs font-medium"
            style={{ color: `rgb(var(--dept-text))` }}
          >
            Fondo
          </span>
        </div>
      </div>

      {/* Badge sample */}
      <div className="flex gap-2">
        <span
          className="px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: `rgb(var(--dept-badge-bg))`,
            color: `rgb(var(--dept-badge-text))`,
          }}
        >
          Badge
        </span>
        <span
          className="px-3 py-1.5 rounded-full text-xs font-semibold border"
          style={{
            backgroundColor: `rgb(var(--dept-bg))`,
            borderColor: `rgb(var(--dept-border))`,
            color: `rgb(var(--dept-text))`,
          }}
        >
          Outline
        </span>
      </div>

      {/* Color tokens */}
      <div className="text-[10px] space-y-1 opacity-70">
        <div>
          <span className="font-mono">--dept-bg:</span>{" "}
          <span style={{ color: `rgb(var(--dept-text))` }}>■</span>
        </div>
        <div>
          <span className="font-mono">--dept-text:</span>{" "}
          <span style={{ color: `rgb(var(--dept-text))` }}>■</span>
        </div>
        <div>
          <span className="font-mono">--avatar-bg:</span>{" "}
          <span style={{ color: `rgb(var(--avatar-bg))` }}>■</span>
        </div>
      </div>
    </div>
  );
}
