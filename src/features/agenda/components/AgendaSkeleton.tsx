
// src/features/agenda/components/AgendaSkeleton.tsx
"use client";
import { SBCard } from "@/components/ui/ui-primitives";

export function AgendaSkeleton() {
    return (
        <div className="p-6 space-y-6 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="h-10 w-48 bg-secondary rounded-lg"></div>
                <div className="flex gap-2">
                    <div className="h-10 w-24 bg-secondary rounded-lg"></div>
                    <div className="h-10 w-24 bg-secondary rounded-lg"></div>
                    <div className="h-10 w-32 bg-secondary rounded-lg"></div>
                </div>
            </div>
            <SBCard noPadding>
                <div className="h-[60vh] bg-secondary"></div>
            </SBCard>
        </div>
    );
}
