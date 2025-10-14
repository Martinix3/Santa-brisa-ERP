import type { TaskNew } from "@/domain/ssot";

export function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const date = new Date(dateStr);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isThisWeek(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const date = new Date(dateStr);
  
  // Get start of week (Monday)
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Get end of week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return date >= startOfWeek && date <= endOfWeek;
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

export function applyTaskFilters(
  tasks: TaskNew[],
  filters: {
    department?: string;
    priority?: string;
    due: 'ALL' | 'TODAY' | 'WEEK' | 'OVERDUE';
  }
): TaskNew[] {
  return tasks
    .filter((t) => !filters.department || t.department === filters.department)
    .filter((t) => !filters.priority || t.priority === filters.priority)
    .filter((t) => {
      switch (filters.due) {
        case 'TODAY':
          return isToday(t.dueAt);
        case 'WEEK':
          return isThisWeek(t.dueAt);
        case 'OVERDUE':
          return isOverdue(t.dueAt) && t.status !== 'DONE' && t.status !== 'CANCELLED';
        default:
          return true;
      }
    });
}
