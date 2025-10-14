"use server";

import { getServerData, upsertMany } from "@/lib/dataprovider/server";
import type { User, UserRole, UserTerritory, AssignedDistributor } from "@/domain/ssot";
import { roleHasTerritory, roleCanHaveDistributors, getDefaultPermissionsForRole } from "@/config/user-roles";

// ==========================================
// VALIDACIONES
// ==========================================

function validateUserData(data: Partial<User>): { valid: boolean; error?: string } {
  // Validar campos requeridos
  if (data.name && data.name.trim().length === 0) {
    return { valid: false, error: "El nombre es requerido" };
  }

  if (data.email && !data.email.includes('@')) {
    return { valid: false, error: "Email inválido" };
  }

  // Validar territory solo para roles de ventas
  if (data.territory && data.role && !roleHasTerritory(data.role)) {
    return { 
      valid: false, 
      error: `El rol ${data.role} no puede tener territorio asignado` 
    };
  }

  // Validar distribuidores asignados solo para comercial
  if (data.assignedDistributors && data.role && !roleCanHaveDistributors(data.role)) {
    return { 
      valid: false, 
      error: `El rol ${data.role} no puede tener distribuidores asignados` 
    };
  }

  return { valid: true };
}

// ==========================================
// CREATE USER
// ==========================================

export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    const santaData = await getServerData();
    
    // Validar datos
    const validation = validateUserData(userData);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Validar email único
    if (userData.email) {
      const existingUser = santaData.users.find(
        u => u.email?.toLowerCase() === userData.email?.toLowerCase()
      );
      if (existingUser) {
        return { success: false, error: "Ya existe un usuario con ese email" };
      }
    }

    // Generar ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Asignar permisos por defecto según rol
    const defaultPermissions = getDefaultPermissionsForRole(userData.role);

    // Crear usuario
    const newUser: User = {
      ...userData,
      id: userId,
      permissions: userData.permissions || defaultPermissions,
      active: userData.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Guardar
    await upsertMany('users', [newUser]);

    return { success: true, userId };
  } catch (error) {
    console.error('Error creating user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// ==========================================
// UPDATE USER
// ==========================================

export async function updateUser(
  userId: string, 
  updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const santaData = await getServerData();
    
    const userIndex = santaData.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const currentUser = santaData.users[userIndex];

    // Validar datos
    const validation = validateUserData({ ...currentUser, ...updates });
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Si cambia el email, verificar que sea único
    if (updates.email && updates.email !== currentUser.email) {
      const existingUser = santaData.users.find(
        u => u.id !== userId && u.email?.toLowerCase() === updates.email?.toLowerCase()
      );
      if (existingUser) {
        return { success: false, error: "Ya existe un usuario con ese email" };
      }
    }

    // Si cambia el rol, actualizar permisos por defecto
    if (updates.role && updates.role !== currentUser.role) {
      const defaultPermissions = getDefaultPermissionsForRole(updates.role);
      updates.permissions = updates.permissions || defaultPermissions;

      // Limpiar territory si el nuevo rol no lo permite
      if (!roleHasTerritory(updates.role)) {
        updates.territory = undefined;
      }

      // Limpiar distribuidores si el nuevo rol no lo permite
      if (!roleCanHaveDistributors(updates.role)) {
        updates.assignedDistributors = undefined;
      }
    }

    // Actualizar usuario
    const updatedUser = {
      ...currentUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await upsertMany('users', [updatedUser]);

    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// ==========================================
// DELETE USER (Soft Delete)
// ==========================================

export async function deleteUser(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const santaData = await getServerData();
    
    const userIndex = santaData.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // Soft delete: marcar como inactivo
    const deletedUser = {
      ...santaData.users[userIndex],
      active: false,
      updatedAt: new Date().toISOString(),
    };

    await upsertMany('users', [deletedUser]);

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// ==========================================
// UPDATE PERMISSIONS
// ==========================================

export async function updateUserPermissions(
  userId: string,
  permissions: User['permissions']
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const santaData = await getServerData();
    
    const userIndex = santaData.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const updatedUser = {
      ...santaData.users[userIndex],
      permissions,
      updatedAt: new Date().toISOString(),
    };

    await upsertMany('users', [updatedUser]);

    return { success: true };
  } catch (error) {
    console.error('Error updating permissions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// ==========================================
// ASSIGN TERRITORY
// ==========================================

export async function assignTerritory(
  userId: string,
  territory: UserTerritory
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const santaData = await getServerData();
    
    const userIndex = santaData.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const user = santaData.users[userIndex];

    // Validar que el rol permita territory
    if (!roleHasTerritory(user.role)) {
      return { 
        success: false, 
        error: `El rol ${user.role} no puede tener territorio asignado` 
      };
    }

    const updatedUser = {
      ...user,
      territory,
      updatedAt: new Date().toISOString(),
    };

    await upsertMany('users', [updatedUser]);

    return { success: true };
  } catch (error) {
    console.error('Error assigning territory:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// ==========================================
// ASSIGN DISTRIBUTORS
// ==========================================

export async function assignDistributors(
  userId: string,
  distributors: AssignedDistributor[]
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const santaData = await getServerData();
    
    const userIndex = santaData.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const user = santaData.users[userIndex];

    // Validar que el rol permita distribuidores
    if (!roleCanHaveDistributors(user.role)) {
      return { 
        success: false, 
        error: `El rol ${user.role} no puede tener distribuidores asignados` 
      };
    }

    // Validar que los distribuidores existan
    for (const dist of distributors) {
      const partyExists = santaData.contacts?.some(c => c.id === dist.partyId);
      if (!partyExists) {
        return { 
          success: false, 
          error: `Distribuidor ${dist.partyId} no encontrado` 
        };
      }
    }

    const updatedUser = {
      ...user,
      assignedDistributors: distributors,
      updatedAt: new Date().toISOString(),
    };

    await upsertMany('users', [updatedUser]);

    return { success: true };
  } catch (error) {
    console.error('Error assigning distributors:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// ==========================================
// GET USER BY ID
// ==========================================

export async function getUserById(userId: string): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  try {
    const santaData = await getServerData();
    
    const user = santaData.users.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: "Usuario no encontrado" };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error getting user:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

// ==========================================
// BULK UPDATE KPIs
// ==========================================

export async function bulkUpdateKPIs(
  updates: Array<{ userId: string; kpiBaseline: User['kpiBaseline'] }>
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const santaData = await getServerData();
    
    const usersToUpdate = [];
    
    for (const update of updates) {
      const user = santaData.users.find(u => u.id === update.userId);
      if (user) {
        usersToUpdate.push({
          ...user,
          kpiBaseline: update.kpiBaseline,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (usersToUpdate.length > 0) {
      await upsertMany('users', usersToUpdate);
    }

    return { success: true };
  } catch (error) {
    console.error('Error bulk updating KPIs:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}
