
"use client";
import { useData } from "@/lib/dataprovider";
import { Cloud, CloudOff } from 'lucide-react';

export function PersistenceToggle() {
    const { isPersistenceEnabled, togglePersistence } = useData();

    const Icon = isPersistenceEnabled ? Cloud : CloudOff;
    const title = `Persistencia: ${isPersistenceEnabled ? 'Activada (Firestore)' : 'Desactivada (Mock Data)'}`;

    return (
        <button
            onClick={togglePersistence}
            className="p-2 rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            title={title}
            aria-label={title}
        >
            <Icon size={18} />
        </button>
    );
}
