
"use client";

import React from 'react';
import { CalendarPageContent } from '@/features/agenda/components/CalendarPageContent';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';

export default function CalendarPage() {
  return (
    <AuthenticatedLayout>
      <CalendarPageContent />
    </AuthenticatedLayout>
  );
}
