// src/domain/ssot.audit.ts
import {
  // Tipos/constantes del SSOT
  SB_COLORS, SANTA_DATA_COLLECTIONS,
  ACCOUNT_TYPE_META, ORDER_STATUS_META, SHIPMENT_STATUS_META,
  PARTY_ROLE_META, LOT_QC_META, PHASE_DEPT, PHASE_NAME_ES,
  // Tipos para derivar literales
  type SantaData, type AccountType, type OrderStatus, type ShipmentStatus,
  type PartyRoleType, type TraceEventPhase
} from "@/domain/ssot";
import { POLICIES, type CodeEntity } from '@/lib/codes';

// ----------------------------
// Helpers de exhaustividad
// ----------------------------
function keysOf<T extends Record<string, any>>(obj: T) {
  return Object.keys(obj) as Array<keyof T>;
}

function assertHasAllKeys<K extends string>(
  record: Record<K, any>,
  expected: readonly K[],
  name: string
) {
  const missing = expected.filter(k => !(k in record));
  const extra   = keysOf(record as any).filter(k => !expected.includes(k as K));
  if (missing.length || extra.length) {
    throw new Error(
      `❌ ${name} desalineado.\n` +
      (missing.length ? `  - FALTAN: ${missing.join(", ")}\n` : "") +
      (extra.length   ? `  - SOBRAN: ${extra.join(", ")}\n` : "")
    );
  }
}

// ----------------------------
// 1) SantaData ↔ SANTA_DATA_COLLECTIONS
// ----------------------------

type SantaDataKeys = keyof SantaData;
const SantaDataLiteralKeys = [
  // Derivado manualmente por TS no es posible; mantenemos esta lista por build-fail temprano
  "parties","partyRoles","partyDuplicates","users","accounts","ordersSellOut","interactions",
  "items","billOfMaterials","productionOrders","qaChecks","onHand",
  "stockMoves","shipments","deliveryNotes","goodsReceipts","activations","promotions",
  "marketingEvents","onlineCampaigns","influencerCollabs","posTactics","posCostCatalog",
  "plv_material","materialCosts","financeLinks","paymentLinks","traceEvents","incidents",
  "codeAliases","integrations","jobs","dead_letters","expenses",
] as const satisfies readonly SantaDataKeys[];

function auditCollections() {
  // (a) ¿Lista exportada coincide con literal?
  assertHasAllKeys(
    Object.fromEntries(SANTA_DATA_COLLECTIONS.map(k => [k, true])) as Record<SantaDataKeys, true>,
    SantaDataLiteralKeys,
    "SANTA_DATA_COLLECTIONS"
  );
}

// ----------------------------
// 2) Exhaustividad de metadatos sobre enums
// ----------------------------
const ALL_ACCOUNT_TYPES = ["HORECA","RETAIL","PRIVADA","ONLINE","OTRO","DISTRIBUIDOR"] as const satisfies readonly AccountType[];
const ALL_ORDER_STATUS  = ["open","confirmed","shipped","invoiced","paid","cancelled","lost"] as const satisfies readonly OrderStatus[];
const ALL_SHIP_STATUS   = ["pending","picking","ready_to_ship","shipped","delivered","exception","cancelled"] as const satisfies readonly ShipmentStatus[];
const ALL_PARTY_ROLES   = ["CUSTOMER","SUPPLIER","DISTRIBUTOR","IMPORTER","INFLUENCER","CREATOR","EMPLOYEE","BRAND_AMBASSADOR","OTHER"] as const satisfies readonly PartyRoleType[];
const ALL_PHASES        = ["SOURCE","RECEIPT","QC","PRODUCTION","PACK","WAREHOUSE","SALE","DELIVERY"] as const satisfies readonly TraceEventPhase[];
const ALL_CODE_ENTITIES = Object.keys(POLICIES) as readonly (keyof typeof POLICIES)[];

function auditMeta() {
  assertHasAllKeys(ACCOUNT_TYPE_META as Record<AccountType, any>, ALL_ACCOUNT_TYPES, "ACCOUNT_TYPE_META");
  assertHasAllKeys(ORDER_STATUS_META  as Record<OrderStatus, any>, ALL_ORDER_STATUS,  "ORDER_STATUS_META");
  assertHasAllKeys(SHIPMENT_STATUS_META as Record<ShipmentStatus, any>, ALL_SHIP_STATUS, "SHIPMENT_STATUS_META");
  assertHasAllKeys(PARTY_ROLE_META as Record<PartyRoleType, any>, ALL_PARTY_ROLES, "PARTY_ROLE_META");
  assertHasAllKeys(PHASE_DEPT as Record<TraceEventPhase, any>, ALL_PHASES, "PHASE_DEPT");
  assertHasAllKeys(PHASE_NAME_ES as Record<TraceEventPhase, any>, ALL_PHASES, "PHASE_NAME_ES");
  assertHasAllKeys(POLICIES as Record<keyof typeof POLICIES, any>, ALL_CODE_ENTITIES, "CODE_POLICIES");
  // LOT_QC_META es un alias de SB_COLORS.lotQC; no es un enum pero comprobamos campos mínimos
  for (const k of ["release","hold","reject"] as const) {
    if (!(k in LOT_QC_META)) throw new Error(`❌ LOT_QC_META falta clave: ${k}`);
  }
}

// ----------------------------
// 3) Tipos sospechosos
// ----------------------------

// Avisos suaves (no throw): te listamos decisiones de diseño que conviene normalizar.
export function softDesignWarnings() {
  const warns: string[] = [];
  // a) Timestamp vs any
  warns.push("createdAt/updatedAt usan 'any' en varias interfaces (Party, DeliveryNote, etc.). Normaliza a 'Timestamp'.");
  // b) Currency
  warns.push("Currency = 'EUR' pero hay campos 'EUR | string' (OrderSellOut.currency, Expense.currency…). Define 'Currency' como union ampliable y úsala.");
  // c) UoM
  warns.push("UoM incluye 'unit' pero en tipos específicos usas literales 'uom: \"uds\"'. Reemplaza por 'uom: Uom' para consistencia.");
  // d) Party.roles
  warns.push("Party.roles = Array<'CUSTOMER'|'SUPPLIER'|'OTHER'> pero PartyRoleType tiene más valores. O lo amplías o eliminas ese denormalizado.");
  // e) Doble fuente de colecciones
  warns.push("Evita duplicar SANTA_DATA_COLLECTIONS entre '@/domain/ssot' y '@/lib/ssot/collections'. Importa SIEMPRE del dominio.");
  return warns;
}

// Exporta una función que puedes llamar en cualquier boot para lanzar el chequeo
export function runStaticAudit() {
    try {
        // Ejecuta las auditorías que lanzan excepciones
        auditCollections();
        auditMeta();
        
        // Muestra las advertencias suaves
        const hints = softDesignWarnings();
        if (hints.length) {
            console.warn("\n⚠️  SSOT design warnings:\n" + hints.map(h => ` - ${h}`).join("\n"));
        }

        console.log("\n✅ Auditoría estática del SSOT completada. Todo en orden.");
        return true;

    } catch (error: any) {
        console.error("\n" + error.message);
        return false;
    }
}

// Autoejecutar si se llama como script
if (typeof process !== 'undefined' && (process.argv[1].endsWith('ssot.audit.ts') || process.argv[1].endsWith('tsx'))) {
    runStaticAudit();
}
