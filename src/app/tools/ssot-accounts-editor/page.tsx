
"use client";
import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useData } from "@/lib/dataprovider";
import { Check, ChevronDown, Database, Download, FileCog, FileText, Map as MapIcon, Trash2, Upload, X } from "lucide-react";
import type { Account as AccountSchema, AccountType, Stage, Interaction, OrderSellOut } from "@/domain/ssot";
import AuthGuard from "@/components/auth/AuthGuard";
import { generateNextOrder } from "@/lib/codes";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { SB_COLORS } from "@/components/ui/ui-primitives";

// This page is now a placeholder as its functionality has been merged into the more powerful Data Viewer.
// We keep it to avoid broken links but guide the user to the new tool.

export default function SSOTEditor() {
    return (
        <AuthGuard>
            <ModuleHeader title="Editor de Cuentas (Obsoleto)" icon={FileCog} color={SB_COLORS.admin} />
            <div className="p-6 max-w-2xl mx-auto">
                <div className="p-6 bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-2xl text-center">
                    <h2 className="text-xl font-bold text-yellow-900">Esta herramienta ha sido reemplazada</h2>
                    <p className="mt-2 text-yellow-800">
                        La funcionalidad de edición, importación y exportación de datos se ha movido al nuevo
                        <strong> Visor de Datos</strong>, que es más potente y permite trabajar con todas las colecciones, no solo con las cuentas.
                    </p>
                    <a href="/dev/data-viewer" className="mt-4 inline-block px-4 py-2 bg-yellow-400 text-yellow-900 font-semibold rounded-lg hover:bg-yellow-500">
                        Ir al Visor de Datos
                    </a>
                </div>
            </div>
        </AuthGuard>
    );
}

    
