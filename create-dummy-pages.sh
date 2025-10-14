#!/bin/bash

# Calendario
mkdir -p src/app/\(app\)/calendario
cat > src/app/\(app\)/calendario/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
import { Calendar } from "lucide-react";
export default function CalendarioPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Calendar className="h-6 w-6" />Calendario y Tareas
      </h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Página de Calendario y Tareas (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

# Ventas
mkdir -p src/app/\(app\)/ventas/dashboard src/app/\(app\)/ventas/cuentas src/app/\(app\)/ventas/pedidos

cat > src/app/\(app\)/ventas/dashboard/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
import { ShoppingCart } from "lucide-react";
export default function VentasDashboardPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <ShoppingCart className="h-6 w-6" />Dashboard Ventas
      </h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Dashboard de Ventas (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/ventas/cuentas/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function CuentasPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Cuentas</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Cuentas (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/ventas/pedidos/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function PedidosPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Pedidos</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Pedidos (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

# Marketing
mkdir -p src/app/\(app\)/marketing/dashboard src/app/\(app\)/marketing/collabs src/app/\(app\)/marketing/ads src/app/\(app\)/marketing/events-activations src/app/\(app\)/marketing/pos-mkt

cat > src/app/\(app\)/marketing/dashboard/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
import { Megaphone } from "lucide-react";
export default function MarketingDashboardPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Megaphone className="h-6 w-6" />Dashboard Marketing
      </h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Dashboard Marketing (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/marketing/collabs/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function CollabsPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Collabs</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Collabs (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/marketing/ads/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function AdsPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Ads</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Ads (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/marketing/events-activations/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function EventsPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Events & Activations</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Events (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/marketing/pos-mkt/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function POSMktPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">POS Marketing</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>POS Marketing (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

# Quality
mkdir -p src/app/\(app\)/quality/dashboard src/app/\(app\)/quality/lot-release src/app/\(app\)/quality/trazability src/app/\(app\)/quality/parametros

cat > src/app/\(app\)/quality/dashboard/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
import { ShieldCheck } from "lucide-react";
export default function QualityDashboardPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <ShieldCheck className="h-6 w-6" />Dashboard Calidad
      </h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Dashboard Calidad (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/quality/lot-release/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function LotReleasePage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Lot Release</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Lot Release (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/quality/trazability/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function TrazabilityPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Trazabilidad</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Trazabilidad (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/quality/parametros/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function ParametrosPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Parámetros</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Parámetros (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

# Logistics
mkdir -p src/app/\(app\)/logistics/dashboard src/app/\(app\)/logistics/shipping src/app/\(app\)/logistics/recepcion src/app/\(app\)/logistics/inventario

cat > src/app/\(app\)/logistics/dashboard/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
import { Truck } from "lucide-react";
export default function LogisticsDashboardPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Truck className="h-6 w-6" />Dashboard Almacén
      </h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Dashboard Almacén (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/logistics/shipping/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function ShippingPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Shipping</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Shipping (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/logistics/recepcion/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function RecepcionPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Recepción</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Recepción (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/logistics/inventario/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function InventarioPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Inventario</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Inventario (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

# Production
mkdir -p src/app/\(app\)/production/dashboard

cat > src/app/\(app\)/production/dashboard/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
import { Factory } from "lucide-react";
export default function ProductionDashboardPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <Factory className="h-6 w-6" />Dashboard Producción
      </h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Dashboard Producción (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

# Finance
mkdir -p src/app/\(app\)/finance/dashboard src/app/\(app\)/finance/cobros src/app/\(app\)/finance/pagos

cat > src/app/\(app\)/finance/dashboard/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
import { DollarSign } from "lucide-react";
export default function FinanceDashboardPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title flex items-center gap-2">
        <DollarSign className="h-6 w-6" />Dashboard Finanzas
      </h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Dashboard Finanzas (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/finance/cobros/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function CobrosPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Cobros</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Cobros (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

cat > src/app/\(app\)/finance/pagos/page.tsx << 'EOPAGE'
"use client";
import { SBCard } from "@/components/ui/ui-primitives";
export default function PagosPage() {
  return (
    <div className="sb-page">
      <h1 className="sb-page__title">Pagos</h1>
      <div className="sb-page__content"><SBCard><div className="sb-card__content"><p>Pagos (dummy)</p></div></SBCard></div>
    </div>
  );
}
EOPAGE

echo "✓ Todas las páginas dummy creadas"
