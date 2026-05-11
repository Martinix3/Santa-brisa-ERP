/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/ErrorBoundary.tsx
'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { SBButton } from './ui/ui-primitives';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="sb-glass rounded-2xl border border-destructive/30 p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Algo salió mal
              </h2>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-3 rounded-lg bg-muted border border-border">
                <p className="text-xs font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <SBButton
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                <RefreshCw size={16} />
                Recargar página
              </SBButton>
              {this.props.onReset && (
                <SBButton
                  variant="primary"
                  size="sm"
                  onClick={this.handleReset}
                  className="flex-1"
                >
                  Reintentar
                </SBButton>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
