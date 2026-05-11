"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { CheckCircle2, XCircle, AlertCircle, Minus } from "lucide-react";

interface QcTestCardProps {
  test: {
    parameterId: string;
    parameterName: string;
    value: string | number;
    result: 'PASS' | 'FAIL' | 'NA';
    inSpec: boolean;
    spec?: {
      min?: number;
      max?: number;
      target?: number;
      unit?: string;
    };
  };
}

export function QcTestCard({ test }: QcTestCardProps) {
  const getResultIcon = () => {
    switch (test.result) {
      case 'PASS':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'FAIL':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'NA':
        return <Minus className="h-5 w-5 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-5 w-5 text-warning" />;
    }
  };

  const getResultBgColor = () => {
    switch (test.result) {
      case 'PASS':
        return 'bg-success/10 border-success/20';
      case 'FAIL':
        return 'bg-destructive/10 border-destructive/20';
      case 'NA':
        return 'bg-muted border-border';
      default:
        return 'bg-warning/10 border-warning/20';
    }
  };

  const formatValue = () => {
    if (typeof test.value === 'number') {
      return test.value.toLocaleString('es-ES', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
      });
    }
    return test.value;
  };

  const showSpec = test.spec && (test.spec.min !== undefined || test.spec.max !== undefined || test.spec.target !== undefined);

  return (
    <div className={`rounded-lg border backdrop-blur-sm p-4 ${getResultBgColor()}`}>
      {/* Header with icon and parameter name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 mt-0.5">
          {getResultIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-sm">
            {test.parameterName}
          </h4>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            ID: {test.parameterId}
          </p>
        </div>
      </div>

      {/* Value display */}
      <div className="mb-3">
        <div className="text-xs text-muted-foreground mb-1">
          Valor medido
        </div>
        <div className="text-2xl font-bold text-foreground">
          {formatValue()}
          {test.spec?.unit && (
            <span className="text-base font-normal text-muted-foreground ml-2">
              {test.spec.unit}
            </span>
          )}
        </div>
      </div>

      {/* Specification display */}
      {showSpec && (
        <div className="pt-3 border-t border-border/30">
          <div className="text-xs text-muted-foreground mb-2">
            Especificación
          </div>
          <div className="grid grid-cols-3 gap-2">
            {test.spec?.min !== undefined && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Mín</div>
                <div className="text-sm font-semibold text-foreground">
                  {test.spec.min}
                </div>
              </div>
            )}
            {test.spec?.target !== undefined && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Target</div>
                <div className="text-sm font-semibold text-foreground">
                  {test.spec.target}
                </div>
              </div>
            )}
            {test.spec?.max !== undefined && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Máx</div>
                <div className="text-sm font-semibold text-foreground">
                  {test.spec.max}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In spec indicator */}
      {test.result !== 'NA' && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Estado
            </span>
            <span className={`text-xs font-semibold ${
              test.inSpec 
                ? 'text-success' 
                : 'text-destructive'
            }`}>
              {test.inSpec ? 'Dentro de spec' : 'Fuera de spec'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
