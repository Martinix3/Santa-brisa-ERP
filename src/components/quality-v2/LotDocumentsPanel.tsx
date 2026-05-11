'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useEffect, useState } from 'react';
import { FileText, Upload, Clock } from 'lucide-react';

type DocumentType = 'COA' | 'SPEC' | 'SOP' | 'PROTOCOL' | 'METHOD' | 'PHOTO' | 'CERTIFICATE' | 'OTHER';
type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'RETIRED';

type Document = {
  id: string;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  fileUrl: string;
  createdAt: string;
  version?: number;
};

const STATUS_COLORS: Record<DocumentStatus, string> = {
  DRAFT: 'bg-gray-500',
  IN_REVIEW: 'bg-yellow-500',
  APPROVED: 'bg-green-500',
  RETIRED: 'bg-gray-400',
};

const TYPE_LABELS: Record<DocumentType, string> = {
  COA: 'Certificado de Análisis',
  SPEC: 'Especificación',
  SOP: 'Procedimiento',
  PROTOCOL: 'Protocolo',
  METHOD: 'Método',
  PHOTO: 'Fotografía',
  CERTIFICATE: 'Certificado',
  OTHER: 'Otro',
};

export function LotDocumentsPanel({ lotCode }: { lotCode: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // TODO: Replace with real action getDocumentsForEntity({ type: 'lot', id: lotCode })
      const fakeDocs: Document[] = [];
      
      if (alive) {
        setDocs(fakeDocs);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [lotCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        <Clock className="mr-2 h-4 w-4 animate-spin" />
        Cargando documentos…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documentos del lote
        </h4>
        <div className="flex gap-2">
          <button className="sb-btn--secondary">
            <Upload className="mr-2 h-4 w-4" />
            Subir documento
          </button>
          <button className="sb-btn--ghost">
            Gestionar versiones
          </button>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 bg-muted/20 p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            No hay documentos vinculados a este lote
          </p>
          <p className="text-xs text-muted-foreground">
            Sube un COA, SPEC o CERTIFICATE para comenzar
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/50 rounded-lg border">
          {docs.map(doc => (
            <li key={doc.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{doc.title}</span>
                    {doc.version && (
                      <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        v{doc.version}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`${STATUS_COLORS[doc.status]} text-white rounded px-2 py-0.5 text-xs`}>
                      {doc.status}
                    </span>
                    <span>·</span>
                    <span>{TYPE_LABELS[doc.type]}</span>
                    <span>·</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
                <a 
                  href={doc.fileUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="sb-btn--ghost ml-4 flex-shrink-0"
                >
                  Ver documento
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="font-medium mb-1">💡 Próximamente:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>Subir documentos (COA, specs, certificados)</li>
          <li>Control de versiones automático</li>
          <li>Aprobación/retiro de documentos</li>
          <li>Vinculación a protocol runs</li>
        </ul>
      </div>
    </div>
  );
}
