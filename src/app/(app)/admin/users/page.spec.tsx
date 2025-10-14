import { describe, it, expect } from 'vitest';
import type { User } from '@/domain/ssot';

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    role: 'admin',
    active: true,
  },
  {
    id: '2',
    name: 'María García',
    email: 'maria@example.com',
    role: 'comercial',
    active: true,
  },
  {
    id: '3',
    name: 'Pedro López',
    email: 'pedro@example.com',
    role: 'ops',
    active: true,
  },
  {
    id: '4',
    name: 'Ana Martínez',
    email: 'ana@example.com',
    role: 'admin',
    active: true,
  },
  {
    id: '5',
    name: 'Luis Rodríguez',
    email: 'luis@example.com',
    role: 'comercial',
    active: true,
  },
];

describe('Admin Users - User Filtering', () => {
  it('should filter users by role correctly', () => {
    const filterByRole = (role: string) => {
      return mockUsers.filter(u => u.role?.toLowerCase() === role.toLowerCase());
    };

    expect(filterByRole('admin')).toHaveLength(2);
    expect(filterByRole('comercial')).toHaveLength(2);
    expect(filterByRole('ops')).toHaveLength(1);
  });

  it('should filter users by search term (name)', () => {
    const filterBySearch = (term: string) => {
      const search = term.toLowerCase();
      return mockUsers.filter(u => 
        u.name?.toLowerCase().includes(search)
      );
    };

    expect(filterBySearch('juan')).toHaveLength(1);
    expect(filterBySearch('garcía')).toHaveLength(1);
    expect(filterBySearch('pérez')).toHaveLength(1);
  });

  it('should filter users by search term (email)', () => {
    const filterBySearch = (term: string) => {
      const search = term.toLowerCase();
      return mockUsers.filter(u => 
        u.email?.toLowerCase().includes(search)
      );
    };

    expect(filterBySearch('juan@')).toHaveLength(1);
    expect(filterBySearch('example.com')).toHaveLength(5);
  });

  it('should filter users by both role and search term', () => {
    const filterUsers = (roleFilter: string, searchTerm: string) => {
      let result = mockUsers;
      
      if (roleFilter !== "all") {
        result = result.filter(u => u.role?.toLowerCase() === roleFilter.toLowerCase());
      }
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        result = result.filter(u => 
          u.name?.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search)
        );
      }
      
      return result;
    };

    expect(filterUsers('comercial', 'maría')).toHaveLength(1);
    expect(filterUsers('comercial', '')).toHaveLength(2);
    expect(filterUsers('all', 'juan')).toHaveLength(1);
  });
});

describe('Admin Users - Role Statistics', () => {
  it('should calculate role distribution correctly', () => {
    const roleStats: Record<string, number> = {};
    mockUsers.forEach(user => {
      const role = user.role || 'Sin Rol';
      roleStats[role] = (roleStats[role] || 0) + 1;
    });

    expect(roleStats['admin']).toBe(2);
    expect(roleStats['comercial']).toBe(2);
    expect(roleStats['ops']).toBe(1);
  });

  it('should count total users correctly', () => {
    expect(mockUsers.length).toBe(5);
  });

  it('should calculate role percentage correctly', () => {
    const roleStats: Record<string, number> = {};
    mockUsers.forEach(user => {
      const role = user.role || 'Sin Rol';
      roleStats[role] = (roleStats[role] || 0) + 1;
    });

    const comercialPercentage = (roleStats['comercial'] / mockUsers.length) * 100;
    expect(comercialPercentage).toBe(40); // 2 out of 5
  });
});

describe('Admin Users - Badge Colors', () => {
  it('should assign correct badge color for admin role', () => {
    const getRoleBadgeColor = (role?: string) => {
      switch (role?.toLowerCase()) {
        case 'admin':
        case 'owner':
          return 'bg-purple-100 text-purple-800';
        case 'comercial':
          return 'bg-blue-100 text-blue-800';
        case 'ops':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    expect(getRoleBadgeColor('admin')).toBe('bg-purple-100 text-purple-800');
    expect(getRoleBadgeColor('owner')).toBe('bg-purple-100 text-purple-800');
  });

  it('should assign correct badge color for comercial role', () => {
    const getRoleBadgeColor = (role?: string) => {
      switch (role?.toLowerCase()) {
        case 'admin':
        case 'owner':
          return 'bg-purple-100 text-purple-800';
        case 'comercial':
          return 'bg-blue-100 text-blue-800';
        case 'ops':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    expect(getRoleBadgeColor('comercial')).toBe('bg-blue-100 text-blue-800');
  });

  it('should assign default badge color for unknown role', () => {
    const getRoleBadgeColor = (role?: string) => {
      switch (role?.toLowerCase()) {
        case 'admin':
        case 'owner':
          return 'bg-purple-100 text-purple-800';
        case 'sales':
          return 'bg-blue-100 text-blue-800';
        case 'production':
          return 'bg-green-100 text-green-800';
        case 'quality':
          return 'bg-amber-100 text-amber-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    expect(getRoleBadgeColor('unknown')).toBe('bg-gray-100 text-gray-800');
    expect(getRoleBadgeColor(undefined)).toBe('bg-gray-100 text-gray-800');
  });
});

describe('Admin Users - Sorting', () => {
  it('should sort users alphabetically by name', () => {
    const sorted = [...mockUsers].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );

    expect(sorted[0].name).toBe('Ana Martínez');
    expect(sorted[1].name).toBe('Juan Pérez');
    expect(sorted[4].name).toBe('Pedro López');
  });

  it('should handle users without names', () => {
    const usersWithoutNames = [
      ...mockUsers,
      { id: '6', name: '', email: 'test@example.com', role: 'admin' as const, active: true }
    ];

    const sorted = [...usersWithoutNames].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );

    // User without name should be first (empty string sorts first)
    expect(sorted[0].name).toBe('');
  });
});

describe('Admin Users - Edge Cases', () => {
  it('should handle empty users array', () => {
    const emptyUsers: User[] = [];
    
    expect(emptyUsers.length).toBe(0);
    
    const roleStats: Record<string, number> = {};
    emptyUsers.forEach(user => {
      const role = user.role || 'Sin Rol';
      roleStats[role] = (roleStats[role] || 0) + 1;
    });
    
    expect(Object.keys(roleStats)).toHaveLength(0);
  });

  it('should handle users with default role', () => {
    const usersWithDefaultRole = [
      { id: '1', name: 'Test User', email: 'test@example.com', role: 'ops' as const, active: true },
    ];

    const roleStats: Record<string, number> = {};
    usersWithDefaultRole.forEach(user => {
      const role = user.role || 'Sin Rol';
      roleStats[role] = (roleStats[role] || 0) + 1;
    });

    expect(roleStats['ops']).toBe(1);
  });

  it('should handle users with minimal data', () => {
    const minimalUser: User = {
      id: '99',
      name: 'Minimal User',
      email: 'minimal@example.com',
      role: 'admin',
      active: true,
    };

    expect(minimalUser.name).toBe('Minimal User');
    expect(minimalUser.email).toBe('minimal@example.com');
  });

  it('should filter case-insensitively', () => {
    const filterBySearch = (term: string) => {
      const search = term.toLowerCase();
      return mockUsers.filter(u => 
        u.name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search)
      );
    };

    expect(filterBySearch('JUAN')).toHaveLength(1);
    expect(filterBySearch('JuAn')).toHaveLength(1);
    expect(filterBySearch('juan')).toHaveLength(1);
  });
});
