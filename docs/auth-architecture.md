# Authentication Architecture Guide

**Last Updated:** 2025-11-10  
**Purpose:** This document explains the authentication flow in our Next.js application to prevent architectural confusion and implementation errors.

---

## Overview

Our application uses a **dual-page authentication system** with Firebase:
- **Public route:** `/login` - Accessible to everyone
- **Protected routes:** `/(app)/*` - Requires authentication

This creates a circular protection that prevents unauthorized access while avoiding infinite redirect loops.

---

## Architecture Components

### 1. Login Page (`src/app/login/page.tsx`)

**Responsibility:** Public authentication page

**Key Logic:**
```typescript
useEffect(() => {
  if (authReady && firebaseUser) {
    router.replace('/dashboard-personal');
  }
}, [authReady, firebaseUser, router]);
```

**Behavior:**
- ✅ User NOT authenticated → Shows login form
- ✅ User IS authenticated → Redirects to `/dashboard-personal`

**Critical Rule:** Must use `router.replace()` (not `router.push()`) to avoid back button loops

---

### 2. Authenticated Layout (`src/app/(app)/layout.tsx`)

**Responsibility:** Layout wrapper for ALL protected routes

**Key Logic:**
```typescript
useEffect(() => {
  if (authReady && !firebaseUser) {
    router.replace("/login");
  }
}, [authReady, firebaseUser, router]);
```

**Behavior:**
- ✅ User IS authenticated → Shows app (Sidebar, Header, content)
- ✅ User NOT authenticated → Redirects to `/login`
- ✅ **State persists** between page navigations within `(app)/*`

**Critical Rules:**
1. Must check `authReady` before redirecting (prevents UI flicker)
2. Must check both `firebaseUser` AND `currentUser` for loading state
3. Must use `router.replace()` (not `router.push()`)
4. ALL authentication logic lives in this file (no separate wrapper components)

---

## Authentication Flow Diagram

```
User visits app
    ↓
Is user authenticated?
    ↓
   NO → Redirect to /login
    |       ↓
    |    Login successful?
    |       ↓
    |      YES → Redirect to /dashboard-personal
    |              (enters protected area)
    ↓
   YES → Show (app)/* layout
         (Sidebar, Header, etc.)
         ↓
    User navigates between pages
         ↓
    Layout persists (no re-mount)
    Only page content changes
```

---

## Critical State Checks

### In Login Page
```typescript
// Wait for auth to be ready AND user to be logged in
if (authReady && firebaseUser) {
  router.replace('/dashboard-personal');
}
```

### In Protected Layout
```typescript
// Redirect if auth is ready BUT user is NOT logged in
if (authReady && !firebaseUser) {
  router.replace("/login");
}

// Show loading while waiting for auth state OR user data
if (!authReady || !firebaseUser || !currentUser) {
  return <Loading />;
}
```

---

## Layout Persistence

**How Next.js App Router Works:**

The `src/app/(app)/layout.tsx` file is a **true Next.js layout**:
- ✅ Mounts ONCE when entering `/(app)/*` routes
- ✅ Stays mounted during navigation between pages
- ✅ Preserves React state (alerts, drawers, sidebar state)
- ✅ Only `{children}` changes when navigating

**What this means:**
- Sidebar stays visible ✅
- Header remains static ✅
- UI state persists ✅
- No flashing/reloading ✅

---

## Common Mistakes to AVOID

### ❌ DO NOT: Create wrapper components
```typescript
// WRONG - Creates unnecessary complexity
export default function AppLayout({ children }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
```

### ✅ DO: Put all logic directly in layout.tsx
```typescript
// CORRECT - Single file, clear responsibility
export default function AppLayout({ children }) {
  const { currentUser, authReady, firebaseUser } = useData();
  // ... all auth logic here ...
  return <div>{/* layout JSX */}</div>;
}
```

### ❌ DO NOT: Use router.push() for redirects
```typescript
// WRONG - Creates back button loops
router.push('/login');
```

### ✅ DO: Use router.replace() for redirects
```typescript
// CORRECT - Replaces history, no loops
router.replace('/login');
```

### ❌ DO NOT: Redirect without checking authReady
```typescript
// WRONG - Causes UI flicker
if (!firebaseUser) {
  router.replace('/login');
}
```

### ✅ DO: Always check authReady first
```typescript
// CORRECT - Smooth transition
if (authReady && !firebaseUser) {
  router.replace('/login');
}
```

---

## File Structure

```
src/app/
├── (app)/                    # Protected route group
│   ├── layout.tsx           # Auth guard + persistent layout (CLIENT COMPONENT)
│   ├── contacts/
│   ├── warehouse/
│   └── ...other pages
│
├── login/
│   └── page.tsx             # Public login page (CLIENT COMPONENT)
│
└── layout.tsx               # Root layout (can be server component)
```

**Key Point:** The `(app)` parentheses create a **route group** that doesn't affect URLs but allows us to apply a shared layout to multiple routes.

---

## Debugging Checklist

If authentication is not working correctly, verify:

1. ✅ `authReady` is being checked in both login and layout
2. ✅ Using `router.replace()` not `router.push()`
3. ✅ Both `firebaseUser` AND `currentUser` are checked for loading
4. ✅ Layout is at `src/app/(app)/layout.tsx` (correct location)
5. ✅ No wrapper components between layout and its logic
6. ✅ Login redirects to a page that exists (e.g., `/dashboard-personal`)

---

## Questions & Answers

**Q: Why not use a wrapper component like `<AuthenticatedLayout>`?**  
A: It adds unnecessary complexity and violates Next.js conventions. The layout file IS the authenticated layout.

**Q: Will the sidebar reload when I navigate between pages?**  
A: No! Next.js keeps the layout mounted. Only the `{children}` content changes.

**Q: Can I have other layouts for specific sections?**  
A: Yes! Create nested layouts. For example, `src/app/(app)/warehouse/layout.tsx` would wrap only warehouse pages.

**Q: What if I need server components?**  
A: The root `src/app/layout.tsx` can be a server component. Only `(app)/layout.tsx` needs to be client-side because it uses hooks for auth.

---

## Related Files

- `src/app/(app)/layout.tsx` - Protected layout (THIS IS THE MAIN FILE)
- `src/app/login/page.tsx` - Login page
- `src/lib/dataprovider.tsx` - Auth context provider
- `src/components/layout/Sidebar.tsx` - Sidebar component
- `src/components/layout/SBHeader.tsx` - Header component

---

## Maintenance Notes

**When modifying authentication:**
1. Always test both login → app and app → logout → login flows
2. Verify no console errors about redirects
3. Check that state persists during navigation
4. Test with slow network to ensure loading states work

**When adding new protected pages:**
1. Simply create them under `src/app/(app)/your-page/page.tsx`
2. No additional auth logic needed - layout handles it automatically

---

## Version History

- **2025-11-10:** Initial documentation after consolidating auth layout
  - Removed separate `AuthenticatedLayout.tsx` component
  - Consolidated all logic into Next.js layout file
  - Added comprehensive documentation to prevent future confusion
