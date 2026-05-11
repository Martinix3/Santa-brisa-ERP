'use client';
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState, useEffect } from 'react';
import { getUserAlerts, dismissAlert } from '@/server/actions/alerts.actions';
import type { Alert } from '@/domain/ssot';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * 🔔 ALERTS PROVIDER
 * 
 * Hook para integrar el sistema de alertas con DynamicHeader
 * 
 * FASE FINAL.6 - UI Integration
 */

// Tipo compatible con DynamicHeader
export type AlertItem = {
  id: string;
  title: string;
  desc?: string;
  time?: string;
  read?: boolean;
};

export function useAlerts(userId: string) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar alertas
  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await getUserAlerts(userId, {
        status: 'ACTIVE',
        limit: 20,
      });
      
      // Convertir Alert[] a AlertItem[]
      const alertItems: AlertItem[] = data.map((alert: Alert) => ({
        id: alert.id,
        title: alert.title,
        desc: alert.message.substring(0, 100),
        time: formatDistanceToNow(new Date(alert.createdAt), {
          addSuffix: true,
          locale: es,
        }),
        read: false, // Las alertas ACTIVE no están leídas
      }));
      
      setAlerts(alertItems);
    } catch (error) {
      console.error('[Alerts] Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar y cada 30 segundos
  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000); // Refresh cada 30seg
    return () => clearInterval(interval);
  }, [userId]);

  // Marcar todas como leídas
  const handleMarkAllRead = async () => {
    try {
      // Dismiss todas las alertas
      for (const alert of alerts) {
        await dismissAlert(alert.id, userId);
      }
      // Recargar
      await loadAlerts();
    } catch (error) {
      console.error('[Alerts] Error marking all read:', error);
    }
  };

  // Click en alerta individual
  const handleClickAlert = async (alert: AlertItem) => {
    try {
      // Dismiss la alerta
      await dismissAlert(alert.id, userId);
      
      // TODO: Navegar a la entidad relacionada si aplica
      // Por ejemplo, si es EMAIL_URGENT, abrir el email
      // Si tiene accountId, ir a la cuenta
      // etc.
      
      // Recargar alertas
      await loadAlerts();
    } catch (error) {
      console.error('[Alerts] Error handling alert click:', error);
    }
  };

  return {
    alerts,
    loading,
    loadAlerts,
    handleMarkAllRead,
    handleClickAlert,
  };
}
