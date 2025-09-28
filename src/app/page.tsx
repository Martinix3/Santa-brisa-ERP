// src/app/page.tsx
import Loading from './loading';

// The root page is now handled by middleware.
// This component is just a fallback while redirection occurs.
export default function RootPage() {
  return <Loading />;
}
