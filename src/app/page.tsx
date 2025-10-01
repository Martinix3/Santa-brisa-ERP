// src/app/page.tsx
import { redirect } from 'next/navigation';

/**
 * This component handles the root path of the application.
 * It automatically redirects all traffic from "/" to "/login".
 * This prevents 404 errors for the root path and ensures users
 * always start at a valid entry point.
 */
export default function RootPage() {
  // Redirect the user to the login page.
  redirect('/login');
}
