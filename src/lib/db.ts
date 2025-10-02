// src/lib/db.ts
// Reexporta lo que knowledge.ts consume desde tu data provider real
import { useData as dataprovider } from "@/lib/dataprovider";
import type { SantaData } from "@/features/santabrain/lib/types";
export { dataprovider };
export type { SantaData };
