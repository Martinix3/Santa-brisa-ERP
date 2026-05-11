/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/components/dev/DevUserSwitcher.tsx
"use client";
import React, { useState } from 'react';
import { useData } from '@/lib/dataprovider';
import { Users, ChevronDown, Check } from 'lucide-react';

export function DevUserSwitcher() {
  const { data, currentUser, setCurrentUserById } = useData();
  const [isOpen, setIsOpen] = useState(false);

  // Solo mostrar en development
  if (process.env.NODE_ENV !== 'development') return null;
  if (!data?.users && !data?.teamMembers) return null;

  const users = (data?.teamMembers || data?.users || []).filter((u: any) => u.active);

  const handleUserChange = (userId: string) => {
    setCurrentUserById(userId);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-4 left-4 z-[100]">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          <Users size={16} />
          <span className="max-w-[120px] truncate">{currentUser?.displayName || currentUser?.name || 'Sin usuario'}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            {/* Overlay para cerrar al hacer click fuera */}
            <div 
              className="fixed inset-0 z-[-1]" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-2 bg-purple-50 border-b border-purple-100">
                <p className="text-xs font-semibold text-purple-900 uppercase tracking-wide">
                  🔧 Dev Mode - Cambiar Usuario
                </p>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleUserChange(user.id)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                      currentUser?.id === user.id ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{user.displayName || user.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    {currentUser?.id === user.id && (
                      <Check size={16} className="text-purple-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
              <div className="p-2 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  {users.length} usuarios activos
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
