// src/lib/audits/uom-audit.ts
import type {
  SantaData, BillOfMaterial, Material, ProductionOrder, InventoryItem, Product, Uom
} from "@/domain/ssot";

/** Canon UoM en el proyecto (ajústalo si hace falta) */
export const CANON_UOM: Uom[] = ["ud","g","kg","mL","L","case","pallet"] as any;

const ALIASES: Record<string, Uom> = {
  uds: "ud",
  unit: "ud",
  units: "ud",
  bottle: "ud",
  bottles: "ud",
  ml: "mL",
  l: "L",
};

const GROUP: Record<string, "count"|"mass"|"volume"|"log"> = {
  ud: "count",
  g: "mass",
  kg: "mass",
  mL: "volume",
  L: "volume",
  case: "log",
  pallet: "log",
};

export function normalizeUom(u?: string | null): Uom | undefined {
  if (!u) return undefined;
  const key = String(u).trim();
  const alias = ALIASES[key as keyof typeof ALIASES];
  const canon = (alias ?? key) as Uom;
  if (CANON_UOM.includes(canon)) return canon;
  return undefined; // desconocida
}

function sameGroup(a?: Uom, b?: Uom) {
  if (!a || !b) return false;
  return GROUP[a] && GROUP[a] === GROUP[b];
}

export type UomIssue = {
  severity: "ERR" | "WARN";
  entity: "material" | "bom" | "inventory" | "prodOrder" | "product";
  id: string;
  field: string;
  current?: any;
  suggested?: any;
  message: string;
};

export type UomAudit = {
  issues: UomIssue[];
  /** Parches de normalización “seguros” que podemos aplicar automáticamente */
  fixes: {
    collection: keyof SantaData;
    key: string;          // criterio de búsqueda (id/sku/materialId…)
    patch: Record<string, any>;
    hint: string;
  }[];
};

export function runUomAudit(data: SantaData): UomAudit {
  const issues: UomIssue[] = [];
  const fixes: UomAudit["fixes"] = [];

  const materials = (data.materials || []) as Material[];
  const products = (data.products || []) as Product[];
  const boms = (data.billOfMaterials || []) as BillOfMaterial[];
  const inventory = (data.inventory || []) as InventoryItem[];
  const prodOrders = (data.productionOrders || []) as ProductionOrder[];

  // --- Índices útiles
  const materialById = new Map(materials.map(m => [m.id, m]));
  const productBySku = new Map(products.map(p => [p.sku, p]));

  // -------- MATERIALS
  for (const m of materials) {
    const n = normalizeUom((m as any).stockUom ?? (m as any).baseUom ?? (m as any).uom);
    if (!n) {
      issues.push({
        severity: "ERR",
        entity: "material",
        id: m.id,
        field: "uom",
        current: (m as any).stockUom ?? (m as any).baseUom ?? (m as any).uom,
        message: "UoM desconocida en material. Define y normaliza (p.ej. 'mL', 'kg', 'ud')."
      });
      continue;
    }
    // Alias detectado
    const raw = (m as any).stockUom ?? (m as any).baseUom ?? (m as any).uom;
    if (raw !== n) {
      issues.push({
        severity: "WARN",
        entity: "material",
        id: m.id,
        field: "uom",
        current: raw,
        suggested: n,
        message: "UoM con alias; se puede normalizar."
      });
      fixes.push({
        collection: "materials",
        key: m.id,
        patch: { ...(m as any), stockUom: n },
        hint: "Normaliza UoM material"
      });
    }
  }

  // -------- PRODUCTS (por si usan bottleMl/packUom/etc.)
  for (const p of products) {
    const packUom = normalizeUom((p as any).packUom);
    if ((p as any).packUom && !packUom) {
      issues.push({
        severity: "WARN",
        entity: "product",
        id: p.id ?? p.sku,
        field: "packUom",
        current: (p as any).packUom,
        message: "UoM de pack desconocida."
      });
    } else if ((p as any).packUom && (p as any).packUom !== packUom) {
      fixes.push({
        collection: "products",
        key: p.id ?? p.sku,
        patch: { ...(p as any), packUom: packUom },
        hint: "Normaliza UoM pack del producto"
      });
    }
  }

  // -------- BOMS (líneas)
  for (const bom of boms) {
    for (let i = 0; i < (bom.items?.length || 0); i++) {
      const it = bom.items![i] as any;
      const n = normalizeUom(it.unit);
      if (!n) {
        issues.push({
          severity: "ERR",
          entity: "bom",
          id: bom.id,
          field: `items[${i}].unit`,
          current: it.unit,
          message: `UoM desconocida en línea de BOM (${it.materialId}).`
        });
        continue;
      }
      if (n !== it.unit) {
        fixes.push({
          collection: "billOfMaterials",
          key: bom.id,
          patch: {
            ...bom,
            items: bom.items!.map((x, idx) => idx === i ? { ...x, unit: n } : x)
          },
          hint: `Normaliza BOM ${bom.id} línea ${i + 1}`
        });
      }
      // Compatibilidad con el material
      const mat = materialById.get(it.materialId);
      const matUom = normalizeUom((mat as any)?.stockUom ?? (mat as any)?.baseUom ?? (mat as any)?.uom);
      if (mat && matUom && !sameGroup(n, matUom)) {
        issues.push({
          severity: "ERR",
          entity: "bom",
          id: bom.id,
          field: `items[${i}].unit`,
          current: n,
          suggested: matUom,
          message: `UoM incompatible con el material (${mat.name}).`
        });
      }
    }
  }

  // -------- INVENTORY
  for (const lot of inventory as any[]) {
    if (!("uom" in lot)) continue; // si no tenéis uom en inventario, saltamos
    const n = normalizeUom(lot.uom);
    if (!n) {
      issues.push({
        severity: "WARN",
        entity: "inventory",
        id: lot.id,
        field: "uom",
        current: lot.uom,
        message: "UoM de inventario desconocida."
      });
    } else if (n !== lot.uom) {
      fixes.push({
        collection: "inventory",
        key: lot.id,
        patch: { ...lot, uom: n },
        hint: "Normaliza UoM en inventario"
      });
    }
    // Coherencia: si es RM, compara con Material; si es FG, podrías comparar con Product
    const mat = materials.find(m => m.sku === lot.sku || m.id === lot.materialId);
    if (mat) {
      const matUom = normalizeUom((mat as any).stockUom ?? (mat as any).baseUom ?? (mat as any).uom);
      if (matUom && n && !sameGroup(n, matUom)) {
        issues.push({
          severity: "ERR",
          entity: "inventory",
          id: lot.id,
          field: "uom",
          current: n,
          suggested: matUom,
          message: "UoM de inventario no compatible con el material."
        });
      }
    }
  }

  // -------- PRODUCTION ORDERS (actuals + yield)
  for (const po of prodOrders as any[]) {
    // actuals
    (po.actuals || []).forEach((a: any, idx: number) => {
      const n = normalizeUom(a.uom);
      if (!n) {
        issues.push({
          severity: "ERR",
          entity: "prodOrder",
          id: po.id,
          field: `actuals[${idx}].uom`,
          current: a.uom,
          message: "UoM desconocida en consumo real."
        });
      } else if (n !== a.uom) {
        fixes.push({
          collection: "productionOrders",
          key: po.id,
          patch: {
            ...po,
            actuals: po.actuals.map((x: any, i: number) => i === idx ? { ...x, uom: n } : x)
          },
          hint: `Normaliza UoM actuals en orden ${po.id}`
        });
      }
      const mat = materialById.get(a.materialId);
      const matUom = normalizeUom((mat as any)?.stockUom ?? (mat as any)?.baseUom ?? (mat as any)?.uom);
      if (matUom && n && !sameGroup(n, matUom)) {
        issues.push({
          severity: "ERR",
          entity: "prodOrder",
          id: po.id,
          field: `actuals[${idx}].uom`,
          current: n,
          suggested: matUom,
          message: "UoM de consumo real no compatible con el material."
        });
      }
    });

    // yield
    const yu = po.execution?.yieldUom;
    if (yu && !normalizeUom(yu)) {
      issues.push({
        severity: "WARN",
        entity: "prodOrder",
        id: po.id,
        field: "execution.yieldUom",
        current: yu,
        suggested: yu === "uds" ? "ud" : yu === "ml" ? "mL" : undefined,
        message: "UoM de rendimiento final no normalizada."
      });
    }
  }

  return { issues, fixes };
}
