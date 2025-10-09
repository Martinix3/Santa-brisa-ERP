"use client";
import React from 'react';
import { PipelineData, PipelineAlert } from '@/lib/pipeline-helpers';
import { useData } from '@/lib/dataprovider';
import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const STAGE_CONFIG = {
  POTENCIAL: { 
    title: "Potencial", 
    color: "border-[#A7D8D9]",
    bgColor: "bg-[#A7D8D9]/10"
  },
  SEGUIMIENTO: { 
    title: "Seguimiento", 
    color: "border-[#F7D15F]",
    bgColor: "bg-[#F7D15F]/10"
  },
  ACTIVA: { 
    title: "Activa", 
    color: "border-[#618E8F]",
    bgColor: "bg-[#618E8F]/10"
  },
  FALLIDA: { 
    title: "Fallida", 
    color: "border-gray-400",
    bgColor: "bg-gray-100"
  },
};

type PersonalPipelineBoardProps = {
  pipeline: PipelineData[];
  alerts?: PipelineAlert[];
  onProgramAccount: (accountId: string) => void;
};

export function PersonalPipelineBoard({ 
  pipeline, 
  alerts, 
  onProgramAccount 
}: PersonalPipelineBoardProps) {
  const { data } = useData();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mi Pipeline</h2>
      
      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border text-sm",
                alert.type === "warning"
                  ? "bg-orange-50 border-orange-200 text-orange-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              )}
            >
              {alert.type === "warning" ? (
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              ) : (
                <Info size={18} className="flex-shrink-0 mt-0.5" />
              )}
              <p className="flex-1">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Grid */}
      <div className="grid grid-cols-4 gap-3">
        {pipeline.map((stage) => {
          const config = STAGE_CONFIG[stage.stage];
          
          return (
            <div
              key={stage.stage}
              className={cn(
                "flex flex-col rounded-lg border-t-4 min-h-[400px]",
                config.color,
                config.bgColor
              )}
            >
              {/* Header */}
              <div className="p-3 border-b">
                <h3 className="font-semibold text-sm flex items-center justify-between">
                  <span>{config.title}</span>
                  <span className="text-xs bg-white/80 text-gray-700 rounded-full px-2 py-0.5">
                    {stage.count}
                  </span>
                </h3>
                {stage.cajasTotal !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stage.cajasTotal} cajas
                  </p>
                )}
              </div>

              {/* Accounts */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {stage.accounts.length > 0 ? (
                  stage.accounts.map((account) => {
                    const lastInteraction = data?.interactions?.find(
                      i => i.accountId === account.id
                    );
                    
                    return (
                      <div
                        key={account.id}
                        className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border"
                      >
                        <Link 
                          href={`/accounts/${account.id}`}
                          className="font-semibold text-sm hover:underline block mb-1"
                        >
                          {account.name}
                        </Link>
                        
                        <p className="text-xs text-muted-foreground">
                          {account.accountType}
                        </p>

                        {lastInteraction && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Última: {new Date(lastInteraction.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        )}

                        <div className="mt-3 flex gap-2">
                          <Link
                            href={`/accounts/${account.id}`}
                            className="flex-1 py-1.5 text-xs text-center bg-secondary hover:bg-secondary/80 rounded transition-colors"
                          >
                            Ver Historial
                          </Link>
                          <button
                            onClick={() => onProgramAccount(account.id)}
                            className="flex-1 py-1.5 text-xs bg-[#618E8F] text-white hover:bg-[#618E8F]/80 rounded transition-colors"
                          >
                            Registrar
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Vacío
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
