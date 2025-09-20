

"use client";

import React, { useState, useEffect } from 'react';
import { User, SantaData as SantaDataType, UserRole } from '@/domain/ssot';
import { Trash2, Lock, Unlock, Edit, Save, X, User as UserIcon } from 'lucide-react';
import { useData } from '@/lib/dataprovider';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { SB_COLORS, SBButton } from '@/components/ui/ui-primitives';

function UserRow({ 
    user, 
    onUpdate, 
    onDelete,
    onEdit,
    isEditing,
    onCancel,
    editedUser,
    setEditedUser,
}: { 
    user: User, 
    onUpdate: (user: User) => void, 
    onDelete: (userId: string) => void,
    onEdit: (user: User) => void,
    isEditing: boolean,
    onCancel: () => void,
    editedUser: User | null,
    setEditedUser: (user: User | null) => void,
}) {
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editedUser) return;
        const { name, value } = e.target;
        setEditedUser({ ...editedUser, [name]: value });
    };

    const handleSave = () => {
        if (editedUser) {
            onUpdate(editedUser);
        }
    };

    const isPrivileged = user.role === 'admin' || user.role === 'owner';

    if (isEditing) {
        return (
            <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input name="name" value={editedUser?.name || ''} onChange={handleInputChange} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"/>
                    <input type="email" name="email" value={editedUser?.email || ''} onChange={handleInputChange} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"/>
                    <select name="role" value={editedUser?.role || 'comercial'} onChange={handleInputChange} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                        <option value="comercial">Comercial</option>
                        <option value="ops">Operaciones</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                    </select>
                </div>
                
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-md border bg-white flex items-center gap-1"><X size={14}/>Cancelar</button>
                    <SBButton onClick={handleSave} className="flex items-center gap-1"><Save size={14}/>Guardar</SBButton>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center p-3 hover:bg-zinc-50 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="font-medium">{user.name}</div>
                <div className="text-zinc-600">{user.email}</div>
                <div className="text-zinc-600 capitalize">{user.role}</div>
                <div className="flex items-center gap-1 text-xs">
                     {isPrivileged ? (
                        <span className="flex items-center gap-1 text-green-700"><Unlock size={12}/> Acceso Total</span>
                    ) : (
                        <span className="flex items-center gap-1 text-zinc-500"><Lock size={12}/> Acceso por Rol</span>
                    )}
                </div>
            </div>
            <div className="flex gap-2 ml-4">
                <button onClick={() => onEdit(user)} className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Edit size={16}/></button>
                <button onClick={() => onDelete(user.id)} className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 size={16}/></button>
            </div>
        </div>
    );
}

function UsersPageContent() {
  const { data: santaData, setData, saveCollection } = useData();
  const [users, setUsers] = useState<User[] | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);

  useEffect(() => {
    if (santaData) {
      setUsers(santaData.users);
    }
  }, [santaData]);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'comercial' as UserRole,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value as UserRole }));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!users || !newUser.name || !newUser.email) {
      alert('Por favor, completa el nombre y el email.');
      return;
    }

    const newUserObject: User = {
      id: `u_${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      active: true,
    };

    const updatedUsers = [...(users || []), newUserObject];
    setUsers(updatedUsers);
    if (santaData) {
      setData({ ...santaData, users: updatedUsers });
      await saveCollection('users', updatedUsers);
    }
    setNewUser({ name: '', email: '', role: 'comercial' });
  };

  const handleUpdateUser = async (updatedUser: User) => {
      const updatedUsers = users ? users.map(u => u.id === updatedUser.id ? updatedUser : u) : null;
      setUsers(updatedUsers);
       if (santaData && updatedUsers) {
          setData({ ...santaData, users: updatedUsers });
          await saveCollection('users', updatedUsers);
      }
      setEditingUserId(null);
      setEditedUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
      if(window.confirm('¿Seguro que quieres eliminar a este usuario?')) {
          const updatedUsers = users ? users.filter(u => u.id !== userId) : null;
          setUsers(updatedUsers);
          if (santaData && updatedUsers) {
              setData({ ...santaData, users: updatedUsers });
              await saveCollection('users', updatedUsers);
          }
      }
  };

  const handleEdit = (user: User) => {
      setEditingUserId(user.id);
      setEditedUser(user);
  };

  const handleCancelEdit = () => {
      setEditingUserId(null);
      setEditedUser(null);
  }

  if (!santaData) {
    return <div className="p-6">Cargando datos...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <p className="text-zinc-600 mt-1">Añade, edita o elimina usuarios y asigna sus roles principales.</p>

      <div className="bg-white p-6 rounded-2xl shadow-card border">
        <h2 className="text-lg font-semibold text-zinc-800 mb-4">Añadir Nuevo Usuario</h2>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <label className="grid gap-1.5" htmlFor="new-user-name">
            <span className="text-sm font-medium text-zinc-700">Nombre</span>
            <input id="new-user-name" name="name" value={newUser.name} onChange={handleInputChange} placeholder="Nombre Apellido" className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" required />
          </label>
          <label className="grid gap-1.5" htmlFor="new-user-email">
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input id="new-user-email" type="email" name="email" value={newUser.email} onChange={handleInputChange} placeholder="email@dominio.com" className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm" required />
          </label>
          <label className="grid gap-1.5" htmlFor="new-user-role">
            <span className="text-sm font-medium text-zinc-700">Rol</span>
            <select id="new-user-role" name="role" value={newUser.role} onChange={handleInputChange} className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
              <option value="comercial">Comercial</option>
              <option value="ops">Operaciones</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <SBButton type="submit" className="md:col-start-3 h-10 font-medium">
            Añadir Usuario
          </SBButton>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-card border">
        <div className="p-4 border-b">
           <h2 className="text-lg font-semibold text-zinc-800">Usuarios Actuales</h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {users ? (
            users.map((user) => (
              <UserRow 
                  key={user.id} 
                  user={user}
                  onUpdate={handleUpdateUser}
                  onDelete={handleDeleteUser}
                  onEdit={handleEdit}
                  isEditing={editingUserId === user.id}
                  onCancel={handleCancelEdit}
                  editedUser={editedUser}
                  setEditedUser={setEditedUser as (user: User | null) => void}
              />
            ))
          ) : (
            <div className="p-4 text-center text-zinc-500">Cargando usuarios...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
    return (
        <>
            <ModuleHeader title="Gestión de Usuarios" icon={UserIcon} />
            <UsersPageContent />
        </>
    );
}
