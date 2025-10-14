import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { 
  MarketingEvent, 
  OnlineCampaign, 
  InfluencerCollab, 
  PlvMaterial 
} from '@/domain/ssot';
import {
  createMarketingEvent,
  updateMarketingEvent,
  deleteMarketingEvent,
  createOnlineCampaign,
  updateOnlineCampaign,
  deleteOnlineCampaign,
  createInfluencerCollab,
  updateInfluencerCollab,
  deleteInfluencerCollab,
  createPlvMaterial,
  updatePlvMaterial,
  deletePlvMaterial
} from '@/server/actions/marketing';

export function useMarketingActions() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ============================================
  // EVENTS
  // ============================================

  const handleCreateEvent = async (event: Omit<MarketingEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    try {
      const result = await createMarketingEvent(event);
      
      if (result.success) {
        toast.success('Evento creado correctamente');
        router.refresh();
        return result.data;
      } else {
        toast.error(result.error || 'Error al crear el evento');
        return null;
      }
    } catch (error) {
      toast.error('Error inesperado al crear el evento');
      console.error(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvent = async (id: string, updates: Partial<MarketingEvent>) => {
    setLoading(true);
    try {
      const result = await updateMarketingEvent(id, updates);
      
      if (result.success) {
        toast.success('Evento actualizado correctamente');
        router.refresh();
        return true;
      } else {
        toast.error(result.error || 'Error al actualizar el evento');
        return false;
      }
    } catch (error) {
      toast.error('Error inesperado al actualizar el evento');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setLoading(true);
    try {
      const result = await deleteMarketingEvent(id);
      
      if (result.success) {
        toast.success('Evento eliminado correctamente');
        router.refresh();
        return true;
      } else {
        toast.error(result.error || 'Error al eliminar el evento');
        return false;
      }
    } catch (error) {
      toast.error('Error inesperado al eliminar el evento');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CAMPAIGNS
  // ============================================

  const handleCreateCampaign = async (campaign: Omit<OnlineCampaign, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    try {
      const result = await createOnlineCampaign(campaign);
      
      if (result.success) {
        toast.success('Campaña creada correctamente');
        router.refresh();
        return result.data;
      } else {
        toast.error(result.error || 'Error al crear la campaña');
        return null;
      }
    } catch (error) {
      toast.error('Error inesperado al crear la campaña');
      console.error(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampaign = async (id: string, updates: Partial<OnlineCampaign>) => {
    setLoading(true);
    try {
      const result = await updateOnlineCampaign(id, updates);
      
      if (result.success) {
        toast.success('Campaña actualizada correctamente');
        router.refresh();
        return true;
      } else {
        toast.error(result.error || 'Error al actualizar la campaña');
        return false;
      }
    } catch (error) {
      toast.error('Error inesperado al actualizar la campaña');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    setLoading(true);
    try {
      const result = await deleteOnlineCampaign(id);
      
      if (result.success) {
        toast.success('Campaña eliminada correctamente');
        router.refresh();
        return true;
      } else {
        toast.error(result.error || 'Error al eliminar la campaña');
        return false;
      }
    } catch (error) {
      toast.error('Error inesperado al eliminar la campaña');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // COLLABORATIONS
  // ============================================

  const handleCreateCollab = async (collab: Omit<InfluencerCollab, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    try {
      const result = await createInfluencerCollab(collab);
      
      if (result.success) {
        toast.success('Colaboración creada correctamente');
        router.refresh();
        return result.data;
      } else {
        toast.error(result.error || 'Error al crear la colaboración');
        return null;
      }
    } catch (error) {
      toast.error('Error inesperado al crear la colaboración');
      console.error(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCollab = async (id: string, updates: Partial<InfluencerCollab>) => {
    setLoading(true);
    try {
      const result = await updateInfluencerCollab(id, updates);
      
      if (result.success) {
        toast.success('Colaboración actualizada correctamente');
        router.refresh();
        return true;
      } else {
        toast.error(result.error || 'Error al actualizar la colaboración');
        return false;
      }
    } catch (error) {
      toast.error('Error inesperado al actualizar la colaboración');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollab = async (id: string) => {
    setLoading(true);
    try {
      const result = await deleteInfluencerCollab(id);
      
      if (result.success) {
        toast.success('Colaboración eliminada correctamente');
        router.refresh();
        return true;
      } else {
        toast.error(result.error || 'Error al eliminar la colaboración');
        return false;
      }
    } catch (error) {
      toast.error('Error inesperado al eliminar la colaboración');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PLV MATERIALS
  // ============================================

  const handleCreateMaterial = async (material: Omit<PlvMaterial, 'id'>) => {
    setLoading(true);
    try {
      const result = await createPlvMaterial(material);
      
      if (result.success) {
        toast.success('Material PLV creado correctamente');
        router.refresh();
        return result.data;
      } else {
        toast.error(result.error || 'Error al crear el material');
        return null;
      }
    } catch (error) {
      toast.error('Error inesperado al crear el material');
      console.error(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<PlvMaterial>) => {
    setLoading(true);
    try {
      const result = await updatePlvMaterial(id, updates);
      
      if (result.success) {
        toast.success('Material PLV actualizado correctamente');
        router.refresh();
        return true;
      } else {
        toast.error(result.error || 'Error al actualizar el material');
        return false;
      }
    } catch (error) {
      toast.error('Error inesperado al actualizar el material');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    setLoading(true);
    try {
      const result = await deletePlvMaterial(id);
      
      if (result.success) {
        toast.success('Material PLV eliminado correctamente');
        router.refresh();
        return true;
      } else {
        toast.error(result.error || 'Error al eliminar el material');
        return false;
      }
    } catch (error) {
      toast.error('Error inesperado al eliminar el material');
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    // Events
    createEvent: handleCreateEvent,
    updateEvent: handleUpdateEvent,
    deleteEvent: handleDeleteEvent,
    // Campaigns
    createCampaign: handleCreateCampaign,
    updateCampaign: handleUpdateCampaign,
    deleteCampaign: handleDeleteCampaign,
    // Collaborations
    createCollab: handleCreateCollab,
    updateCollab: handleUpdateCollab,
    deleteCollab: handleDeleteCollab,
    // Materials
    createMaterial: handleCreateMaterial,
    updateMaterial: handleUpdateMaterial,
    deleteMaterial: handleDeleteMaterial
  };
}
