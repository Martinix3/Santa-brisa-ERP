"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from "react";
import { FileText, FileCheck, Award, Book, Microscope, Image as ImageIcon, Paperclip, Upload, Download, MoreHorizontal, Calendar, AlertCircle } from "lucide-react";
import type { Lot, Document } from "@/domain/ssot-v2-plus-schemas";

interface DocumentsLibraryClientProps {
  lots: Lot[];
  documents: Document[];
}

type DocType = "ALL" | "COA" | "SPEC" | "CERTIFICATE" | "PROTOCOL" | "METHOD" | "PHOTO" | "APPCC" | "OTHER";
type DocStatus = "ALL" | "DRAFT" | "IN_REVIEW" | "APPROVED" | "RETIRED";

export function DocumentsLibraryClient({ lots, documents }: DocumentsLibraryClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocType>("ALL");
  const [statusFilter, setStatusFilter] = useState<DocStatus>("ALL");

  // Parse dates from serialized data
  const parsedDocuments = documents.map(doc => ({
    ...doc,
    createdAt: typeof doc.createdAt === 'string' ? new Date(doc.createdAt) : doc.createdAt,
    updatedAt: typeof doc.updatedAt === 'string' ? new Date(doc.updatedAt) : doc.updatedAt,
    validity: doc.validity ? {
      validFrom: typeof doc.validity.validFrom === 'string' ? new Date(doc.validity.validFrom) : doc.validity.validFrom,
      validTo: typeof doc.validity.validTo === 'string' ? new Date(doc.validity.validTo) : doc.validity.validTo,
    } : undefined,
    approvals: doc.approvals?.map(a => ({
      ...a,
      at: typeof a.at === 'string' ? new Date(a.at) : a.at,
    })),
  }));

  // Filtrar documentos
  const filteredDocuments = parsedDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || doc.type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || doc.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Stats
  const totalDocs = parsedDocuments.length;
  const approvedDocs = parsedDocuments.filter(d => d.status === "APPROVED").length;
  const inReviewDocs = parsedDocuments.filter(d => d.status === "IN_REVIEW").length;
  const expiringSoon = parsedDocuments.filter(d => {
    if (!d.validity?.validTo) return false;
    const daysUntilExpiry = Math.floor((d.validity.validTo.getTime() - Date.now()) / (86400000));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length;

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "COA":
        return <FileText className="w-10 h-10" />;
      case "SPEC":
        return <FileCheck className="w-10 h-10" />;
      case "CERTIFICATE":
        return <Award className="w-10 h-10" />;
      case "PROTOCOL":
        return <Book className="w-10 h-10" />;
      case "METHOD":
        return <Microscope className="w-10 h-10" />;
      case "PHOTO":
        return <ImageIcon className="w-10 h-10" />;
      case "APPCC":
        return <FileCheck className="w-10 h-10 text-warning" />;
      default:
        return <Paperclip className="w-10 h-10" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sb-header-glass">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Biblioteca de Documentos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestión centralizada de documentos de calidad
            </p>
          </div>
          <button className="sb-btn--primary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Subir Documento
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="sb-card-glass-light p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Documentos</p>
            <p className="text-2xl font-bold text-accent">{totalDocs}</p>
          </div>
          <div className="sb-card-glass-light p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Aprobados</p>
            <p className="text-2xl font-bold text-success">{approvedDocs}</p>
          </div>
          <div className="sb-card-glass-light p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">En Revisión</p>
            <p className="text-2xl font-bold text-warning">{inReviewDocs}</p>
          </div>
          <div className="sb-card-glass-light p-3 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Expiran Pronto</p>
            <p className="text-2xl font-bold text-destructive">{expiringSoon}</p>
          </div>
        </div>

        {/* Search y Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="search"
              placeholder="Buscar por título o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sb-input w-full"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DocType)}
            className="sb-select"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="COA">COA</option>
            <option value="SPEC">Especificaciones</option>
            <option value="CERTIFICATE">Certificados</option>
            <option value="PROTOCOL">Protocolos</option>
            <option value="METHOD">Métodos</option>
            <option value="PHOTO">Fotos</option>
            <option value="APPCC">APPCC</option>
            <option value="OTHER">Otros</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocStatus)}
            className="sb-select"
          >
            <option value="ALL">Todos los estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="IN_REVIEW">En Revisión</option>
            <option value="APPROVED">Aprobado</option>
            <option value="RETIRED">Retirado</option>
          </select>
        </div>
      </div>

      {/* Grid de Documentos */}
      <div className="flex-1 overflow-auto p-4">
        {filteredDocuments.length === 0 ? (
          <div className="sb-card-glass-light p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No se encontraron documentos con los filtros aplicados
            </p>
            <button className="sb-btn--secondary" onClick={() => {
              setSearchQuery("");
              setTypeFilter("ALL");
              setStatusFilter("ALL");
            }}>
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => {
              const isExpiringSoon = doc.validity?.validTo && 
                Math.floor((doc.validity.validTo.getTime() - Date.now()) / 86400000) <= 30;
              
              return (
                <div 
                  key={doc.id}
                  className="sb-card-glass-light p-4 rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                >
                  {/* Header con icono y badges */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-accent flex-shrink-0">
                      {getDocumentIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                        {doc.title}
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        <span className={`sb-badge--${
                          doc.status === "APPROVED" ? "success" :
                          doc.status === "IN_REVIEW" ? "warning" :
                          doc.status === "DRAFT" ? "default" :
                          "destructive"
                        }`}>
                          {doc.status}
                        </span>
                        <span className="sb-badge--info">
                          {doc.type}
                        </span>
                        {isExpiringSoon && (
                          <span className="sb-badge--destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Expira
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Descripción */}
                  {doc.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="space-y-1 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{doc.createdAt.toLocaleDateString("es-ES")}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>v{doc.version}</span>
                    </div>
                    {doc.fileName && (
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate">{doc.fileName}</span>
                      </div>
                    )}
                    {doc.validity?.validTo && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        <span>
                          Válido hasta {doc.validity.validTo.toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    )}
                    {doc.approvals && doc.approvals.length > 0 && (
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-3 h-3" />
                        <span>
                          {doc.approvals.length} aprobación{doc.approvals.length > 1 ? "es" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {doc.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">
                          #{tag}
                        </span>
                      ))}
                      {doc.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{doc.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-border/50">
                    <button className="sb-btn--primary flex-1 text-sm">
                      Ver
                    </button>
                    <button className="sb-btn--ghost px-3">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="sb-btn--ghost px-3">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
