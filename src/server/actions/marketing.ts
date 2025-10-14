'use server';

import { getFirestore } from 'firebase-admin/firestore';
import type { 
  MarketingEvent, 
  OnlineCampaign, 
  InfluencerCollab, 
  PlvMaterial 
} from '@/domain/ssot';

const db = getFirestore();

// ============================================
// MARKETING EVENTS
// ============================================

export async function createMarketingEvent(event: Omit<MarketingEvent, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const now = new Date().toISOString();
    const docRef = await db.collection('marketingEvents').add({
      ...event,
      createdAt: now,
      updatedAt: now
    });
    
    return { 
      success: true, 
      id: docRef.id,
      data: { id: docRef.id, ...event, createdAt: now, updatedAt: now }
    };
  } catch (error) {
    console.error('Error creating marketing event:', error);
    return { success: false, error: 'Error al crear el evento' };
  }
}

export async function updateMarketingEvent(id: string, updates: Partial<MarketingEvent>) {
  try {
    const now = new Date().toISOString();
    await db.collection('marketingEvents').doc(id).update({
      ...updates,
      updatedAt: now
    });
    
    return { success: true, id };
  } catch (error) {
    console.error('Error updating marketing event:', error);
    return { success: false, error: 'Error al actualizar el evento' };
  }
}

export async function deleteMarketingEvent(id: string) {
  try {
    await db.collection('marketingEvents').doc(id).delete();
    return { success: true, id };
  } catch (error) {
    console.error('Error deleting marketing event:', error);
    return { success: false, error: 'Error al eliminar el evento' };
  }
}

// ============================================
// ONLINE CAMPAIGNS
// ============================================

export async function createOnlineCampaign(campaign: Omit<OnlineCampaign, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const now = new Date().toISOString();
    const docRef = await db.collection('onlineCampaigns').add({
      ...campaign,
      createdAt: now,
      updatedAt: now
    });
    
    return { 
      success: true, 
      id: docRef.id,
      data: { id: docRef.id, ...campaign, createdAt: now, updatedAt: now }
    };
  } catch (error) {
    console.error('Error creating online campaign:', error);
    return { success: false, error: 'Error al crear la campaña' };
  }
}

export async function updateOnlineCampaign(id: string, updates: Partial<OnlineCampaign>) {
  try {
    const now = new Date().toISOString();
    await db.collection('onlineCampaigns').doc(id).update({
      ...updates,
      updatedAt: now
    });
    
    return { success: true, id };
  } catch (error) {
    console.error('Error updating online campaign:', error);
    return { success: false, error: 'Error al actualizar la campaña' };
  }
}

export async function deleteOnlineCampaign(id: string) {
  try {
    await db.collection('onlineCampaigns').doc(id).delete();
    return { success: true, id };
  } catch (error) {
    console.error('Error deleting online campaign:', error);
    return { success: false, error: 'Error al eliminar la campaña' };
  }
}

// ============================================
// INFLUENCER COLLABORATIONS
// ============================================

export async function createInfluencerCollab(collab: Omit<InfluencerCollab, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const now = new Date().toISOString();
    const docRef = await db.collection('influencerCollabs').add({
      ...collab,
      createdAt: now,
      updatedAt: now
    });
    
    return { 
      success: true, 
      id: docRef.id,
      data: { id: docRef.id, ...collab, createdAt: now, updatedAt: now }
    };
  } catch (error) {
    console.error('Error creating influencer collab:', error);
    return { success: false, error: 'Error al crear la colaboración' };
  }
}

export async function updateInfluencerCollab(id: string, updates: Partial<InfluencerCollab>) {
  try {
    const now = new Date().toISOString();
    await db.collection('influencerCollabs').doc(id).update({
      ...updates,
      updatedAt: now
    });
    
    return { success: true, id };
  } catch (error) {
    console.error('Error updating influencer collab:', error);
    return { success: false, error: 'Error al actualizar la colaboración' };
  }
}

export async function deleteInfluencerCollab(id: string) {
  try {
    await db.collection('influencerCollabs').doc(id).delete();
    return { success: true, id };
  } catch (error) {
    console.error('Error deleting influencer collab:', error);
    return { success: false, error: 'Error al eliminar la colaboración' };
  }
}

// ============================================
// PLV MATERIALS
// ============================================

export async function createPlvMaterial(material: Omit<PlvMaterial, 'id'>) {
  try {
    const docRef = await db.collection('plv_material').add(material);
    
    return { 
      success: true, 
      id: docRef.id,
      data: { id: docRef.id, ...material }
    };
  } catch (error) {
    console.error('Error creating PLV material:', error);
    return { success: false, error: 'Error al crear el material PLV' };
  }
}

export async function updatePlvMaterial(id: string, updates: Partial<PlvMaterial>) {
  try {
    await db.collection('plv_material').doc(id).update(updates);
    return { success: true, id };
  } catch (error) {
    console.error('Error updating PLV material:', error);
    return { success: false, error: 'Error al actualizar el material PLV' };
  }
}

export async function deletePlvMaterial(id: string) {
  try {
    await db.collection('plv_material').doc(id).delete();
    return { success: true, id };
  } catch (error) {
    console.error('Error deleting PLV material:', error);
    return { success: false, error: 'Error al eliminar el material PLV' };
  }
}
