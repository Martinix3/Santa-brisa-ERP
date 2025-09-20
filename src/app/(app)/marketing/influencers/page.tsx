
"use client";
import React from 'react';
import InfluencerMarketing from '@/features/influencers/components/InfluencerMarketing';
import { SB_COLORS, waterHeader, hexToRgba, AgaveEdge, Input, Select, Textarea } from '@/components/ui/ui-primitives';
import { ClipboardList } from 'lucide-react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';


// Mock Header component if it's not globally available or needs specific props
function Header({ title, color = "#A7D8D9", icon: Icon = ClipboardList }: { title: string; color?: string; icon?: any }) {
    return (
        <div className="relative border-b" style={{ background: waterHeader("modal:" + title, color), borderColor: hexToRgba(color, 0.18) }}>
            <div className="px-4 py-2.5 text-sm font-medium text-zinc-800 flex items-center gap-2"><Icon className="h-4 w-4" />{title}</div>
            <div className="absolute left-0 right-0 -bottom-px"><AgaveEdge /></div>
        </div>
    );
}


export default function InfluencersPage() {
    // These components are passed to the single-file component.
    // This avoids having to paste them inside the large component file.
    const injectedComponents = {
        SB_COLORS,
        waterHeader,
        hexToRgba,
        AgaveEdge,
        Input,
        Select,
        Textarea,
        Header
    };

    return (
        <AuthenticatedLayout>
            <div className="w-full">
                <InfluencerMarketing components={injectedComponents} />
            </div>
        </AuthenticatedLayout>
    );
}
