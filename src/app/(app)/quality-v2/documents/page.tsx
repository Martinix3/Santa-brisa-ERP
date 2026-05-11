/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

import { getQualityV2Snapshot } from "@/server/actions/quality-v2.actions";
import { DocumentsLibraryClient } from "./DocumentsLibraryClient";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Biblioteca de Documentos",
  description: "Gestión centralizada de documentos de calidad"
};

export default async function DocumentsPage() {
  const snapshot = await getQualityV2Snapshot();
  
  return <DocumentsLibraryClient lots={snapshot.lots} documents={snapshot.documents} />;
}
