
// src/features/agenda/components/AgendaHeader.tsx
"use client";
import React from 'react';
import { Calendar as CalendarIcon, ListTodo } from 'lucide-react';
import { SBButton } from '@/components/ui';
import { FilterSelect } from '@/components/ui/FilterSelect';

interface AgendaHeaderProps {
    view: 'calendar' | 'tasks';
    onViewChange: (view: 'calendar' | 'tasks') => void;
    responsibleFilter: string;
    onResponsibleChange: (value: string) => void;
    departmentFilter: string;
    onDepartmentChange: (value: string) => void;
    userOptions: { value: string; label: string }[];
    departmentOptions: { value: string; label: string }[];
    onNewEvent: () => void;
}

export function AgendaHeader({
    view, onViewChange, responsibleFilter, onResponsibleChange, departmentFilter, onDepartmentChange,
    userOptions, departmentOptions, onNewEvent
}: AgendaHeaderProps) {
    return (
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <div className="flex items-center p-1 bg-secondary rounded-lg">
                <SBButton size="sm" variant={view === 'calendar' ? 'primary' : 'ghost'} onClick={() => onViewChange('calendar')} className="flex items-center gap-2">
                    <CalendarIcon size={16} /> Calendario
                </SBButton>
                <SBButton size="sm" variant={view === 'tasks' ? 'primary' : 'ghost'} onClick={() => onViewChange('tasks')} className="flex items-center gap-2">
                    <ListTodo size={16} /> Tareas
                </SBButton>
            </div>
            <div className="flex-grow"></div>
            <FilterSelect value={responsibleFilter} onChange={onResponsibleChange} options={userOptions} placeholder="Responsable" />
            <FilterSelect value={departmentFilter} onChange={onDepartmentChange} options={departmentOptions} placeholder="Sector" />
            <SBButton
                onClick={onNewEvent}
                className="gap-2 px-4 py-2"
            >
                <span>Nueva Tarea</span>
            </SBButton>
        </div>
    );
}
