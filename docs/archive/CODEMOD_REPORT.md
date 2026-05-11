# Codemod Report: data.users → data.teamMembers

**Generated:** 2025-10-09T20:42:38.874Z

## Summary

- **Files scanned:** 444
- **Files modified:** 19
- **Total replacements:** 37
- **Mode:** CHANGES APPLIED
- **Backup created:** Yes (.bak files)

## Changes by File

### src/app/(app)/admin/data-import/actions.ts (2 changes)

**Line 75:**
```diff
-     usersById: new Map(data.users.map(u=>[u.id,u])),
+     usersById: new Map(data.teamMembers.map(u=>[u.id,u])),
```

**Line 76:**
```diff
-     usersByEmail: new Map(data.users.filter(u=>u.email).map(u=>[String(u.email).toLowerCase(),u])),
+     usersByEmail: new Map(data.teamMembers.filter(u=>u.email).map(u=>[String(u.email).toLowerCase(),u])),
```

### src/app/(app)/admin/db-check/page.tsx (1 change)

**Line 96:**
```diff
-   const users = data.users || [];
+   const users = data.teamMembers || [];
```

### src/app/(app)/admin/kpi-settings/page.tsx (1 change)

**Line 17:**
```diff
-             setUsers(data.users);
+             setUsers(data.teamMembers);
```

### src/app/(app)/sell-out/page.tsx (6 changes)

**Line 68:**
```diff
-     const comerciales = (data.users || []).filter(u => u.role === 'comercial');
+     const comerciales = (data.teamMembers || []).filter(u => u.role === 'comercial');
```

**Line 114:**
```diff
-           .map(id => data.users?.find(u => u.id === id))
+           .map(id => data.teamMembers?.find(u => u.id === id))
```

**Line 131:**
```diff
-           const owner = data.users?.find(u => u.name === ownerName);
+           const owner = data.teamMembers?.find(u => u.name === ownerName);
```

**Line 153:**
```diff
-     const comerciales = (data.users || []).filter(u => u.role === 'comercial');
+     const comerciales = (data.teamMembers || []).filter(u => u.role === 'comercial');
```

**Line 258:**
```diff
-       const comerciales = (data?.users || []).filter(u => u.role === 'comercial');
+       const comerciales = (data?.teamMembers || []).filter(u => u.role === 'comercial');
```

**Line 437:**
```diff
-                         const owner = data.users?.find(u => u.id === cuenta.ownerId);
+                         const owner = data.teamMembers?.find(u => u.id === cuenta.ownerId);
```

### src/app/(app)/settings/page.tsx (7 changes)

**Line 31:**
```diff
-     if (!data?.users) return;
+     if (!data?.teamMembers) return;
```

**Line 33:**
```diff
-     const comerciales = data.users.filter(u => u.role === 'comercial' || u.role === 'owner');
+     const comerciales = data.teamMembers.filter(u => u.role === 'comercial' || u.role === 'owner');
```

**Line 45:**
```diff
-   }, [data?.users]);
+   }, [data?.teamMembers]);
```

**Line 64:**
```diff
-     if (!firestoreDb || !data?.users) {
+     if (!firestoreDb || !data?.teamMembers) {
```

**Line 73:**
```diff
-       const comerciales = data.users.filter(u => u.role === 'comercial' || u.role === 'owner');
+       const comerciales = data.teamMembers.filter(u => u.role === 'comercial' || u.role === 'owner');
```

**Line 115:**
```diff
-   const comerciales = data.users?.filter(u => u.role === 'comercial' || u.role === 'owner') || [];
+   const comerciales = data.teamMembers?.filter(u => u.role === 'comercial' || u.role === 'owner') || [];
```

**Line 116:**
```diff
-   const todosUsuarios = data.users || [];
+   const todosUsuarios = data.teamMembers || [];
```

### src/components/dev/DevUserSwitcher.tsx (2 changes)

**Line 13:**
```diff
-   if (!data?.users) return null;
+   if (!data?.teamMembers) return null;
```

**Line 15:**
```diff
-   const users = data.users.filter(u => u.active);
+   const users = data.teamMembers.filter(u => u.active);
```

### src/features/accounts/components/AccountCard.tsx (1 change)

**Line 25:**
```diff
-   const owner = data.users?.find(u => u.id === account.ownerId);
+   const owner = data.teamMembers?.find(u => u.id === account.ownerId);
```

### src/features/admin/components/AdminDashboardPage.tsx (2 changes)

**Line 30:**
```diff
-       activeUsers: (data.users || []).filter(u => u.role !== 'admin' && u.active).length,
+       activeUsers: (data.teamMembers || []).filter(u => u.role !== 'admin' && u.active).length,
```

**Line 31:**
```diff
-       totalUsers: (data.users || []).filter(u => u.role !== 'admin').length,
+       totalUsers: (data.teamMembers || []).filter(u => u.role !== 'admin').length,
```

### src/features/admin/components/DataAuditDashboard.tsx (4 changes)

**Line 54:**
```diff
-       !acc.ownerId || !data.users.some(u => u.id === acc.ownerId)
+       !acc.ownerId || !data.teamMembers.some(u => u.id === acc.ownerId)
```

**Line 88:**
```diff
-       !int.userId || !data.users.some(u => u.id === int.userId)
+       !int.userId || !data.teamMembers.some(u => u.id === int.userId)
```

**Line 225:**
```diff
-     if (data.users.some(u => u.kpiBaseline)) {
+     if (data.teamMembers.some(u => u.kpiBaseline)) {
```

**Line 385:**
```diff
-             <StatItem label="Users" value={data.users.length} />
+             <StatItem label="Users" value={data.teamMembers.length} />
```

### src/features/admin/components/DepartmentTasksPanel.tsx (1 change)

**Line 21:**
```diff
-         const user = data.users?.find(u => u.id === task.userId);
+         const user = data.teamMembers?.find(u => u.id === task.userId);
```

### src/features/admin/components/UserDetailPage.tsx (1 change)

**Line 20:**
```diff
-   const users = useMemo(() => data?.users || [], [data]);
+   const users = useMemo(() => data?.teamMembers || [], [data]);
```

### src/features/admin/components/UserRankingTable.tsx (1 change)

**Line 12:**
```diff
-     return (data.users || [])
+     return (data.teamMembers || [])
```

### src/features/admin/components/UsersManagementPage.tsx (1 change)

**Line 20:**
```diff
-   const users = useMemo(() => data?.users || [], [data]);
+   const users = useMemo(() => data?.teamMembers || [], [data]);
```

### src/features/agenda/TaskBoard.tsx (2 changes)

**Line 31:**
```diff
-       .map((id) => data?.users.find((u) => u.id === id))
+       .map((id) => data?.teamMembers.find((u) => u.id === id))
```

**Line 33:**
```diff
-     [task.involvedUserIds, data?.users]
+     [task.involvedUserIds, data?.teamMembers]
```

### src/features/agenda/components/NewTaskDialog.tsx (1 change)

**Line 113:**
```diff
-                     {(data?.users || []).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
+                     {(data?.teamMembers || []).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
```

### src/features/quicklog/components/SBFlows.tsx (1 change)

**Line 462:**
```diff
-   const users = data?.users || [];
+   const users = data?.teamMembers || [];
```

### src/lib/dashboard-helpers.ts (1 change)

**Line 71:**
```diff
-   const owner = getTaskOwnerName(task, data.users || []);
+   const owner = getTaskOwnerName(task, data.teamMembers || []);
```

### src/lib/distributor-helpers.ts (1 change)

**Line 71:**
```diff
-     .map(id => data.users?.find(u => u.id === id))
+     .map(id => data.teamMembers?.find(u => u.id === id))
```

### src/lib/sb-core.ts (1 change)

**Line 129:**
```diff
-   const user = ownerId ? data.users.find(u => u.id === ownerId) : undefined;
+   const user = ownerId ? data.teamMembers.find(u => u.id === ownerId) : undefined;
```

## Next Steps

1. ✅ Verify compilation: `npx tsc --noEmit`
2. ✅ Review changes: `git diff src/`
3. ✅ Test the application: `npm run dev`
4. ✅ Commit changes if all looks good

**Note:** Backup files (.bak) were created. Remove them after verification:
```bash
find src -name "*.bak" -delete
```
