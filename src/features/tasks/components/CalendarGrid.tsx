"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import type { TaskNew } from "@/domain/ssot";
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  addDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachMonthOfInterval
} from "date-fns";
import { es } from "date-fns/locale";

interface CalendarGridProps {
  view: 'day' | 'week' | 'month' | 'year';
  currentDate: Date;
  tasks: TaskNew[];
  onTaskClick: (task: TaskNew) => void;
  onDateClick: (date: Date) => void;
}

export function CalendarGrid({ view, currentDate, tasks, onTaskClick, onDateClick }: CalendarGridProps) {
  if (view === 'day') {
    return <DayView currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} />;
  }
  
  if (view === 'week') {
    return <WeekView currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} />;
  }
  
  if (view === 'month') {
    return <MonthView currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} onDateClick={onDateClick} />;
  }
  
  return <YearView currentDate={currentDate} tasks={tasks} onDateClick={onDateClick} />;
}

// Vista DÍA: Agenda por horas
function DayView({ currentDate, tasks, onTaskClick }: { currentDate: Date; tasks: TaskNew[]; onTaskClick: (task: TaskNew) => void }) {
  const dayStr = format(currentDate, 'yyyy-MM-dd');
  const dayTasks = tasks.filter(t => t.dueAt?.startsWith(dayStr));
  
  // Horas del día (9am - 6pm)
  const hours = Array.from({ length: 10 }, (_, i: number) => i + 9); // 9-18
  
  // Tareas sin hora específica
  const allDayTasks = dayTasks.filter(t => !t.dueAt?.includes('T'));
  
  // Agrupar tareas por hora
  const tasksByHour = hours.map(hour => {
    const hourTasks = dayTasks.filter(t => {
      if (!t.dueAt?.includes('T')) return false;
      const taskHour = new Date(t.dueAt).getHours();
      return taskHour === hour;
    });
    return { hour, tasks: hourTasks };
  });

  return (
    <div className="space-y-3">
      <div className="text-center py-3 border-b">
        <h2 className="text-xl font-bold capitalize">{format(currentDate, "EEEE d 'de' MMMM", { locale: es })}</h2>
        <p className="text-sm text-muted-foreground mt-1">{dayTasks.length} tareas</p>
      </div>

      {/* Tareas todo el día */}
      {allDayTasks.length > 0 && (
        <div className="p-3 bg-secondary/30 rounded-lg">
          <div className="text-xs font-semibold text-muted-foreground mb-2">TODO EL DÍA</div>
          <div className="space-y-1.5">
            {allDayTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                className={`dept-${task.department} p-2 rounded cursor-pointer text-sm hover:scale-[1.01] transition-transform`}
                style={{
                  backgroundColor: `rgb(var(--dept-bg) / 0.9)`,
                  borderLeft: `3px solid rgb(var(--dept-border))`,
                }}
              >
                <div className="font-medium" style={{ color: `rgb(var(--dept-text))` }}>
                  {task.isPriority && '⭐ '}{task.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid de horas */}
      <div className="space-y-2">
        {tasksByHour.map(({ hour, tasks: hourTasks }) => (
          <div key={hour} className="flex gap-3">
            <div className="w-16 flex-shrink-0 text-right pt-1">
              <span className="text-sm font-medium text-muted-foreground">
                {hour}:00
              </span>
            </div>
            <div className="flex-1 min-h-[60px] border-l-2 border-border/40 pl-3 pb-2">
              {hourTasks.length === 0 ? (
                <div className="h-full flex items-center text-xs text-muted-foreground opacity-50">
                  —
                </div>
              ) : (
                <div className="space-y-1.5">
                  {hourTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={`dept-${task.department} p-2 rounded cursor-pointer text-sm hover:scale-[1.01] transition-transform`}
                      style={{
                        backgroundColor: `rgb(var(--dept-bg) / 0.9)`,
                        borderLeft: `3px solid rgb(var(--dept-border))`,
                      }}
                    >
                      <div className="font-medium" style={{ color: `rgb(var(--dept-text))` }}>
                        {task.isPriority && '⭐ '}{task.title}
                      </div>
                      {task.desc && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {task.desc}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Vista SEMANA: Grid de 7 días con todas las tareas
function WeekView({ currentDate, tasks, onTaskClick }: { currentDate: Date; tasks: TaskNew[]; onTaskClick: (task: TaskNew) => void }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="space-y-4">
      <div className="text-center py-3 border-b">
        <h2 className="text-xl font-bold">
          {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
        </h2>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayTasks = tasks.filter(t => t.dueAt?.startsWith(dayStr));
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dayStr}
              className={`min-h-[300px] rounded-lg border p-3 overflow-y-auto max-h-[600px] ${
                isToday ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="text-center mb-3 sticky top-0 bg-inherit pb-2">
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className={`text-lg font-bold ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                {dayTasks.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {dayTasks.length} {dayTasks.length === 1 ? 'tarea' : 'tareas'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                {dayTasks.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4 opacity-50">
                    Sin tareas
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={`dept-${task.department} text-xs p-2 rounded cursor-pointer hover:scale-[1.02] transition-transform`}
                      style={{
                        backgroundColor: `rgb(var(--dept-bg) / 0.9)`,
                        borderLeft: `3px solid rgb(var(--dept-border))`,
                      }}
                    >
                      <div className="font-medium" style={{ color: `rgb(var(--dept-text))` }}>
                        {task.isPriority && '⭐ '}{task.title}
                      </div>
                      {task.desc && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {task.desc}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Vista MES: Grid de calendario mensual con puntos + solo prioritarias
function MonthView({ 
  currentDate, 
  tasks, 
  onTaskClick,
  onDateClick 
}: { 
  currentDate: Date; 
  tasks: TaskNew[]; 
  onTaskClick: (task: TaskNew) => void;
  onDateClick: (date: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-4">
      <div className="text-center py-3 border-b">
        <h2 className="text-2xl font-bold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
      </div>

      {/* Header días de la semana */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayTasks = tasks.filter(t => t.dueAt?.startsWith(dayStr));
          const priorityTasks = dayTasks.filter(t => t.isPriority);
          const nonPriorityTasks = dayTasks.filter(t => !t.isPriority);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          // Agrupar tareas por departamento para puntos
          const tasksByDept = nonPriorityTasks.reduce((acc, task) => {
            if (!acc[task.department]) acc[task.department] = 0;
            acc[task.department]++;
            return acc;
          }, {} as Record<string, number>);

          return (
            <div
              key={dayStr}
              onClick={() => onDateClick(day)}
              className={`min-h-[100px] rounded-lg border p-2 cursor-pointer transition-all hover:border-primary ${
                isToday ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 
                isCurrentMonth ? 'border-border bg-card hover:bg-secondary/50' : 
                'border-border/50 bg-muted/30'
              }`}
            >
              <div className="text-right mb-1">
                <span className={`text-sm font-semibold ${
                  isToday ? 'text-primary' : 
                  isCurrentMonth ? 'text-foreground' : 
                  'text-muted-foreground'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>

              <div className="space-y-1">
                {/* Tareas prioritarias - mostrar título */}
                {priorityTasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}
                    className={`dept-${task.department} text-[10px] px-1.5 py-0.5 rounded truncate font-medium`}
                    style={{
                      backgroundColor: `rgb(var(--dept-bg) / 0.9)`,
                      color: `rgb(var(--dept-text))`,
                    }}
                  >
                    ⭐ {task.title}
                  </div>
                ))}
                
                {priorityTasks.length > 2 && (
                  <div className="text-[9px] text-muted-foreground px-1">
                    +{priorityTasks.length - 2} prioritarias
                  </div>
                )}

                {/* Tareas normales - solo puntos de colores */}
                {nonPriorityTasks.length > 0 && (
                  <div className="flex gap-1 flex-wrap px-1 mt-1">
                    {Object.entries(tasksByDept).map(([dept, count]) => (
                      <div key={dept} className="flex items-center gap-0.5">
                        <div
                          className={`dept-${dept} w-2 h-2 rounded-full`}
                          style={{
                            backgroundColor: `rgb(var(--dept-bg))`,
                          }}
                          title={`${count} tareas de ${dept}`}
                        />
                        {count > 1 && (
                          <span className="text-[8px] text-muted-foreground">{count}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Vista AÑO: Grid de 12 meses con contador de tareas
function YearView({ 
  currentDate, 
  tasks,
  onDateClick 
}: { 
  currentDate: Date; 
  tasks: TaskNew[];
  onDateClick: (date: Date) => void;
}) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  return (
    <div className="space-y-6">
      <div className="text-center py-4 border-b">
        <h2 className="text-3xl font-bold">{format(currentDate, 'yyyy')}</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const monthStr = format(month, 'yyyy-MM');
          const monthTasks = tasks.filter(t => t.dueAt?.startsWith(monthStr));
          
          return (
            <div
              key={monthStr}
              onClick={() => onDateClick(month)}
              className="sb-card-glass-light p-4 cursor-pointer hover:scale-105 transition-transform"
            >
              <div className="text-center">
                <h3 className="text-lg font-bold capitalize mb-2">
                  {format(month, 'MMMM', { locale: es })}
                </h3>
                <div className="text-3xl font-bold text-primary">
                  {monthTasks.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {monthTasks.length === 1 ? 'tarea' : 'tareas'}
                </div>
              </div>
              
              {monthTasks.length > 0 && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="text-xs text-muted-foreground">
                    ✓ {monthTasks.filter(t => t.status === 'DONE').length} completadas
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ⚡ {monthTasks.filter(t => t.status === 'IN_PROGRESS').length} en progreso
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper: Columna de tareas
function TaskColumn({ 
  title, 
  tasks, 
  onTaskClick 
}: { 
  title: string; 
  tasks: TaskNew[]; 
  onTaskClick: (task: TaskNew) => void 
}) {
  return (
    <div className="sb-card-glass-light p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center justify-between">
        {title}
        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">
          {tasks.length}
        </span>
      </h3>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Sin tareas
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              className={`dept-${task.department} rounded-lg p-3 border cursor-pointer hover:scale-[1.02] transition-transform`}
              style={{
                backgroundColor: `rgb(var(--dept-bg) / 0.8)`,
                borderColor: `rgb(var(--dept-border) / 0.4)`,
              }}
            >
              <div className="text-sm font-medium mb-1" style={{ color: `rgb(var(--dept-text))` }}>
                {task.isPriority && '⭐ '}{task.title}
              </div>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span 
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `rgb(var(--dept-badge-bg) / 0.6)`,
                    color: `rgb(var(--dept-badge-text))`,
                  }}
                >
                  {task.department}
                </span>
                {task.priority && (
                  <span className={`px-2 py-0.5 rounded-full ${
                    task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                    task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {task.priority}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
