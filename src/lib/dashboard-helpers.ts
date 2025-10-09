import { Interaction, Department, User, SantaData } from '@/domain/ssot.v7';
import { TimeRange, filterByTimeRange, isOverdue } from './time-range-helpers';

/**
 * Resultado de tareas por departamento
 */
export type TareasDepartamento = {
  vencidas: Interaction[];
  pendientes: Interaction[];
};

/**
 * Obtiene las tareas de un departamento filtradas por rango temporal
 */
export function getTareasDepartamento(
  interactions: Interaction[],
  dept: Department,
  timeRange: TimeRange
): TareasDepartamento {
  // Filtrar tareas del departamento que estén abiertas
  const tareasDeptBase = interactions.filter(i => 
    i.dept === dept && 
    i.status === 'open' &&
    i.plannedFor // Solo tareas con fecha planificada
  );
  
  // Vencidas: TODAS las vencidas sin filtro de periodo (se muestran hasta completarse)
  const vencidas = tareasDeptBase.filter(t => isOverdue(t.plannedFor!));
  
  // Pendientes: solo las del periodo seleccionado
  const pendientes = tareasDeptBase.filter(t => 
    !isOverdue(t.plannedFor!) && 
    filterByTimeRange(t.plannedFor!, timeRange)
  );
  
  // Ordenar por fecha
  vencidas.sort((a, b) => 
    new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime()
  );
  pendientes.sort((a, b) => 
    new Date(a.plannedFor!).getTime() - new Date(b.plannedFor!).getTime()
  );
  
  return { vencidas, pendientes };
}

/**
 * Obtiene el nombre del usuario asignado a una tarea
 */
export function getTaskOwnerName(
  task: Interaction,
  users: User[]
): string {
  const user = users.find(u => u.id === task.userId);
  return user?.name || 'Sin asignar';
}

/**
 * Formatea la información de una tarea para mostrar
 */
export function formatTaskInfo(
  task: Interaction,
  data: SantaData
): {
  title: string;
  owner: string;
  date: string;
  isOverdue: boolean;
  daysOverdue?: number;
} {
  const owner = getTaskOwnerName(task, data.users || []);
  const date = task.plannedFor 
    ? new Date(task.plannedFor).toLocaleDateString('es-ES')
    : 'Sin fecha';
  
  const taskIsOverdue = task.plannedFor ? isOverdue(task.plannedFor) : false;
  
  let daysOverdue: number | undefined;
  if (taskIsOverdue && task.plannedFor) {
    const now = new Date();
    const planned = new Date(task.plannedFor);
    daysOverdue = Math.floor((now.getTime() - planned.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Título: usa note, title o kind
  const title = task.note || task.title || `Tarea ${task.kind || 'sin especificar'}`;
  
  return {
    title,
    owner,
    date,
    isOverdue: taskIsOverdue,
    daysOverdue
  };
}
