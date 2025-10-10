import { Task, Department, SantaData, TeamMember } from '@/domain/ssot';
import { TimeRange, filterByTimeRange, isOverdue } from './time-range-helpers';

/**
 * Resultado de tareas por departamento
 */
export type TareasDepartamento = {
  vencidas: Task[];
  pendientes: Task[];
};

/**
 * Obtiene las tareas de un departamento filtradas por rango temporal
 */
export function getTareasDepartamento(
  tasks: Task[],
  dept: Department,
  timeRange: TimeRange
): TareasDepartamento {
  // Filtrar tareas del departamento que estén abiertas
  const tareasDeptBase = tasks.filter(t => 
    t.dept === dept && 
    t.status === 'OPEN' &&
    t.dueAt // Solo tareas con fecha planificada
  );
  
  // Vencidas: TODAS las vencidas sin filtro de periodo (se muestran hasta completarse)
  const vencidas = tareasDeptBase.filter(t => isOverdue(t.dueAt!));
  
  // Pendientes: solo las del periodo seleccionado
  const pendientes = tareasDeptBase.filter(t => 
    !isOverdue(t.dueAt!) && 
    filterByTimeRange(t.dueAt!, timeRange)
  );
  
  // Ordenar por fecha
  vencidas.sort((a, b) => 
    new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()
  );
  pendientes.sort((a, b) => 
    new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()
  );
  
  return { vencidas, pendientes };
}

/**
 * Obtiene el nombre del usuario asignado a una tarea
 */
export function getTaskOwnerName(
  task: Task,
  users: TeamMember[]
): string {
  const user = users.find(u => u.id === task.assignedToId);
  return user?.name || 'Sin asignar';
}

/**
 * Formatea la información de una tarea para mostrar
 */
export function formatTaskInfo(
  task: Task,
  data: SantaData
): {
  title: string;
  owner: string;
  date: string;
  isOverdue: boolean;
  daysOverdue?: number;
} {
  const owner = getTaskOwnerName(task, data.teamMembers || []);
  const date = task.dueAt 
    ? new Date(task.dueAt).toLocaleDateString('es-ES')
    : 'Sin fecha';
  
  const taskIsOverdue = task.dueAt ? isOverdue(task.dueAt) : false;
  
  let daysOverdue: number | undefined;
  if (taskIsOverdue && task.dueAt) {
    const now = new Date();
    const planned = new Date(task.dueAt);
    daysOverdue = Math.floor((now.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Título: usa title o kind
  const title = task.title || `Tarea ${task.kind || 'sin especificar'}`;
  
  return {
    title,
    owner,
    date,
    isOverdue: taskIsOverdue,
    daysOverdue
  };
}
