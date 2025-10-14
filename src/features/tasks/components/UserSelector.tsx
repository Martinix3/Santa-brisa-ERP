"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";
import type { User } from "@/domain/ssot";

interface UserSelectorProps {
  users: User[];
  selectedUserId: string;
  onSelect: (userId: string) => void;
  disabled?: boolean;
  currentUserRole?: string;
}

// Helper para generar iniciales
function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Helper para generar clase de color de avatar basado en nombre
function getAvatarColorClass(name: string): string {
  const colors = [
    'avatar-blue',
    'avatar-purple',
    'avatar-pink',
    'avatar-green',
    'avatar-yellow',
    'avatar-orange',
    'avatar-red',
    'avatar-indigo',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function UserSelector({
  users,
  selectedUserId,
  onSelect,
  disabled = false,
  currentUserRole = "comercial",
}: UserSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canAssignToOthers = currentUserRole === "admin" || currentUserRole === "owner";
  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-3">
      <label className="sb-label">Asignado a</label>

      {canAssignToOthers ? (
        <div className="space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuario..."
              className="sb-input pl-9"
              disabled={disabled}
            />
          </div>

          {/* Users Grid/List - más compacto */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-1">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full p-6 text-sm text-center text-muted-foreground">
                No se encontraron usuarios
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = user.id === selectedUserId;
                const initials = getInitials(user.name);
                const avatarColorClass = getAvatarColorClass(user.name);

                return (
                  <button
                    key={user.id}
                    onClick={() => onSelect(user.id)}
                    disabled={disabled}
                    className={`
                      group relative flex flex-col items-center justify-center p-2 rounded-xl 
                      border-2 transition-all hover:scale-105
                      ${isSelected 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-border/40 bg-card/50 hover:border-primary/50'
                      }
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* Check icon for selected */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}

                    {/* Avatar compacto */}
                    <div 
                      className={`${avatarColorClass} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg`}
                      style={{ backgroundColor: `rgb(var(--avatar-bg))` }}
                    >
                      {initials}
                    </div>

                    {/* User name - solo en hover */}
                    <div className="absolute inset-x-0 -bottom-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-[10px] font-medium text-center px-1 py-0.5 bg-popover/95 backdrop-blur-sm rounded shadow-sm truncate">
                        {user.name}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        // Non-admin view - just show current user
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card/50">
          <div 
            className={`${getAvatarColorClass(selectedUser?.name || '')} flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm`}
            style={{ backgroundColor: `rgb(var(--avatar-bg))` }}
          >
            {getInitials(selectedUser?.name || 'U')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {selectedUser?.name || "Usuario desconocido"}
            </div>
            {selectedUser?.email && (
              <div className="text-xs text-muted-foreground truncate">
                {selectedUser.email}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
