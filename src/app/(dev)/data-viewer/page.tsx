"use client";
import React from 'react';
import { CsvDataViewer } from '@/features/dev/CsvDataViewer';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Sheet } from 'lucide-react';

export default function DataViewerPage() {
    return (
        <div className="h-full flex flex-col">
            <ModuleHeader title="Editor de CSV (Data Viewer)" icon={Sheet} />
            <div className="flex-grow p-4 md:p-6">
                <CsvDataViewer />
            </div>
        </div>
    );
}
