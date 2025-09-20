// src/features/agenda/useFullCalendarStyles.ts
import { useEffect } from 'react';

export function useFullCalendarStyles() {
    useEffect(() => {
        const styleId = 'fullcalendar-dynamic-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .fc .fc-toolbar.fc-header-toolbar {
                margin-bottom: 1.5rem;
                font-size: 0.875rem;
            }
            .fc .fc-toolbar-title {
                font-size: 1.25rem;
                font-weight: 600;
            }
            .fc .fc-button {
                background-color: #fff;
                border-color: #d1d5db;
                color: #374151;
                text-transform: capitalize;
            }
            .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active {
                background-color: hsl(var(--sb-sun));
                border-color: hsl(var(--sb-sun));
                color: hsl(var(--sb-neutral-900));
            }
            .fc-direction-ltr .fc-list-day-text, .fc-direction-rtl .fc-list-day-side-text {
                font-weight: 600;
            }
            .fc-event {
                cursor: grab;
            }
            .fc-v-event .fc-event-main {
                padding: 4px;
            }
            .fc .fc-daygrid-day.fc-day-today {
                background-color: hsla(var(--sb-sun), 0.15);
            }
        `;
        document.head.appendChild(style);

        return () => {
            const styleElement = document.getElementById(styleId);
            if (styleElement) {
                styleElement.remove();
            }
        };
    }, []);
}
