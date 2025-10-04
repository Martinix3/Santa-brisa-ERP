// src/app/page.tsx
import { redirect } from 'next/navigation';

/**
 * The root page now acts as a simple entry point.
 * It immediately redirects the user to the login page.
 * The logic to redirect authenticated users away from login
 * is handled in the DataProvider and the login page itself.
 */
export default function RootPage() {
  redirect('/login');
}
