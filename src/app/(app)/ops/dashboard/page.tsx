// This file's content has been moved to /dashboard-personal
// It now serves as a redirect to the new primary dashboard location.
import { redirect } from 'next/navigation';

export default function OpsDashboardPage() {
    redirect('/dashboard-personal');
}
