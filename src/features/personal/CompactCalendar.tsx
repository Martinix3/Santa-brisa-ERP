"use client";
import React, { useMemo } from 'react';
import { useData } from '@/lib/dataprovider';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimeRange = 'day' | 'week' | 'month';

type CompactCalendarProps = {
  timeRange: TimeRange;
};

export function CompactCalendar({ timeRange }: CompactCalendarProps) {
  const { data, currentUser } = useData();
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const tasks = useMemo(() => {
    if (!data || !currentUser) return [];
    return (data.interactions || [])
      .filter(i => i.userId === currentUser.id)
      .filter(i => i.status !== 'cancelled');
  }, [data, currentUser]);

  // Generar días/semanas/meses según timeRange
  const calendarData = useMemo(() => {
    const now = currentDate;

    switch (timeRange) {
      case 'day': {
        // Mostrar solo el día actual
        return [now];
      }
      case 'week': {
        // Mostrar semana actual (7 días)
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Domingo de la semana
        const days = [];
        for (let i = 0; i < 7; i++) {
          const day = new Date(start);
          day.setDate(start.getDate() + i);
          days.push(day);
        }
        return days;
      }
      case 'month': {
        // Mostrar mes actual (grid de días)
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        
        // Días del mes
        for (let d = 1; d <= lastDay.getDate(); d++) {
          days.push(new Date(year, month, d));
        }
        return days;
      }
    }
  }, [timeRange, currentDate]);

  // Contar tareas por día
  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => {
      const plannedDate = (t as any).startAt || t.plannedFor;
      if (!plannedDate) return false;
      return plannedDate.startsWith(dateStr);
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (timeRange) {
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const getTitle = () => {
    switch (timeRange) {
      case 'day':
        return currentDate.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        });
      case 'week':
        return currentDate.toLocaleDateString('es-ES', { 
          month: 'long', 
          year: 'numeric' 
        });
      case 'month':
        return currentDate.toLocaleDateString('es-ES', { 
          month: 'long', 
          year: 'numeric' 
        });
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold capitalize">{getTitle()}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => navigate('prev')}
            className="p-1 hover:bg-secondary rounded"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-1 text-xs hover:bg-secondary rounded"
          >
            Hoy
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-1 hover:bg-secondary rounded"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid - Vista Día con Horario */}
      {timeRange === 'day' && (
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {Array.from({ length: 24 }, (_, hour) => {
            const dayTasks = getTasksForDate(calendarData[0]);
            const hourTasks = dayTasks.filter(task => {
              const plannedDate = (task as any).startAt || task.plannedFor;
              if (!plannedDate) return false;
              const taskHour = new Date(plannedDate).getHours();
              return taskHour === hour;
            });

            return (
              <div key={hour} className="flex gap-2 min-h-[60px] border-b">
                <div className="w-16 flex-shrink-0 text-xs font-medium text-muted-foreground pt-1">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 py-1">
                  {hourTasks.length > 0 ? (
                    <div className="space-y-1">
                      {hourTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="text-xs p-2 bg-[#A7D8D9]/20 border-l-2 border-[#618E8F] rounded"
                        >
                          <p className="font-medium">{task.note || 'Tarea'}</p>
                          {task.accountId && (
                            <p className="text-muted-foreground text-[10px] mt-0.5">
                              {data?.accounts?.find(a => a.id === task.accountId)?.name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full hover:bg-secondary/20 rounded transition-colors cursor-pointer" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {timeRange === 'week' && (
        <div className="grid grid-cols-7 gap-1">
          {/* Encabezados días de la semana */}
          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, idx) => (
            <div key={idx} className="text-center text-xs font-medium text-muted-foreground p-1">
              {day}
            </div>
          ))}
          
          {/* Días */}
          {calendarData.map((date, idx) => {
            const dayTasks = getTasksForDate(date);
            return (
              <div
                key={idx}
                className={cn(
                  "aspect-square border rounded p-1 text-xs flex flex-col items-center justify-center",
                  isToday(date) && "bg-[#F7D15F]/20 border-[#F7D15F]",
                  dayTasks.length > 0 && "font-semibold"
                )}
              >
                <span>{date.getDate()}</span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] bg-[#618E8F] text-white rounded-full w-4 h-4 flex items-center justify-center mt-1">
                    {dayTasks.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {timeRange === 'month' && (
        <div className="grid grid-cols-7 gap-1">
          {/* Encabezados */}
          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, idx) => (
            <div key={idx} className="text-center text-xs font-medium text-muted-foreground p-1">
              {day}
            </div>
          ))}
          
          {/* Padding días anteriores */}
          {Array.from({ length: calendarData[0]?.getDay() || 0 }).map((_, idx) => (
            <div key={`pad-${idx}`} className="aspect-square" />
          ))}
          
          {/* Días del mes */}
          {calendarData.map((date, idx) => {
            const dayTasks = getTasksForDate(date);
            return (
              <div
                key={idx}
                className={cn(
                  "aspect-square border rounded p-1 text-xs flex flex-col items-center justify-center cursor-pointer hover:bg-secondary",
                  isToday(date) && "bg-[#F7D15F]/20 border-[#F7D15F] font-bold",
                  dayTasks.length > 0 && "font-semibold"
                )}
              >
                <span>{date.getDate()}</span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] bg-[#A7D8D9] text-black rounded-full w-4 h-4 flex items-center justify-center mt-0.5">
                    {dayTasks.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
