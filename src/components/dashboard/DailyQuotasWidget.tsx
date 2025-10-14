'use client';

import { useState, useEffect } from 'react';
import type { DailyQuota } from '@/domain/campaigns';
import { getDailyQuotas, setDailyQuotaTargets } from '@/server/actions/campaigns.actions';
import { toast } from 'sonner';

interface DailyQuotasWidgetProps {
  repId: string;
  date?: string; // YYYY-MM-DD, default today
}

export function DailyQuotasWidget({ repId, date }: DailyQuotasWidgetProps) {
  const [quotas, setQuotas] = useState<DailyQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tempTargets, setTempTargets] = useState({ visits: 5, calls: 10, orders: 3 });
  
  const today = date || new Date().toISOString().split('T')[0];
  
  useEffect(() => {
    loadQuotas();
  }, [repId, today]);
  
  const loadQuotas = async () => {
    setLoading(true);
    try {
      const result = await getDailyQuotas(repId, today);
      if (result.ok) {
        setQuotas(result.data);
        setTempTargets({
          visits: result.data.quotas.visits.target,
          calls: result.data.quotas.calls.target,
          orders: result.data.quotas.orders.target,
        });
      } else {
        toast.error('Error al cargar cuotas');
      }
    } catch (error) {
      console.error('Error loading quotas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveTargets = async () => {
    try {
      const result = await setDailyQuotaTargets(repId, today, tempTargets);
      if (result.ok) {
        toast.success('✅ Objetivos actualizados');
        setEditing(false);
        loadQuotas();
      } else {
        toast.error('Error al actualizar');
      }
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };
  
  if (loading) {
    return (
      <div className="sb-card">
        <div className="animate-pulse">
          <div className="h-4 bg-secondary rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-secondary rounded"></div>
            <div className="h-8 bg-secondary rounded"></div>
            <div className="h-8 bg-secondary rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!quotas) {
    return (
      <div className="sb-card text-center py-8">
        <p className="text-sm text-muted-foreground">No hay datos de cuotas</p>
      </div>
    );
  }
  
  const getStatusColor = (status: DailyQuota['status']) => {
    switch (status) {
      case 'ON_TRACK': return 'text-success';
      case 'AT_RISK': return 'text-warning';
      case 'BEHIND': return 'text-destructive';
    }
  };
  
  const getStatusIcon = (status: DailyQuota['status']) => {
    switch (status) {
      case 'ON_TRACK': return '✅';
      case 'AT_RISK': return '⚠️';
      case 'BEHIND': return '🔴';
    }
  };
  
  const getStatusText = (status: DailyQuota['status']) => {
    switch (status) {
      case 'ON_TRACK': return 'En objetivo';
      case 'AT_RISK': return 'En riesgo';
      case 'BEHIND': return 'Detrás del objetivo';
    }
  };
  
  return (
    <div className="sb-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-base">📊 Cuotas de Hoy</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(today).toLocaleDateString('es-ES', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="sb-btn sb-btn--sm sb-btn--ghost"
        >
          {editing ? '✕' : '⚙️'}
        </button>
      </div>
      
      {/* Edit Mode */}
      {editing ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium">Objetivo Visitas</label>
            <input
              type="number"
              min="0"
              className="sb-input"
              value={tempTargets.visits}
              onChange={(e) => setTempTargets({ ...tempTargets, visits: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Objetivo Llamadas</label>
            <input
              type="number"
              min="0"
              className="sb-input"
              value={tempTargets.calls}
              onChange={(e) => setTempTargets({ ...tempTargets, calls: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Objetivo Pedidos</label>
            <input
              type="number"
              min="0"
              className="sb-input"
              value={tempTargets.orders}
              onChange={(e) => setTempTargets({ ...tempTargets, orders: parseInt(e.target.value) || 0 })}
            />
          </div>
          <button
            onClick={handleSaveTargets}
            className="sb-btn sb-btn--primary sb-btn--sm w-full"
          >
            💾 Guardar Objetivos
          </button>
        </div>
      ) : (
        <>
          {/* Progress Bars */}
          <div className="space-y-3">
            {Object.entries(quotas.quotas).map(([key, quota]) => {
              const percentage = quota.target > 0 
                ? Math.min(100, (quota.current / quota.target) * 100)
                : 0;
              
              return (
                <div key={key}>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="capitalize font-medium">{key}</span>
                    <span className="text-xs">
                      <span className="font-semibold">{quota.current}</span>
                      <span className="text-muted-foreground"> / {quota.target}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        percentage >= 100 ? 'bg-success' :
                        percentage >= 80 ? 'bg-primary' :
                        percentage >= 50 ? 'bg-warning' :
                        'bg-destructive'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Status */}
          <div className={`mt-4 pt-3 border-t border-border flex items-center justify-between text-sm ${getStatusColor(quotas.status)}`}>
            <span className="font-medium">
              {getStatusIcon(quotas.status)} {getStatusText(quotas.status)}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(quotas.lastUpdated).toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
