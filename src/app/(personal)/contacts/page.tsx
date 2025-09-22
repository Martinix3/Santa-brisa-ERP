"use client";
import React from 'react';
import { ContactsPageContent } from '@/features/contacts/components/ContactsPage';
import { ModuleHeader } from '@/components/ui/ModuleHeader';
import { Contact } from 'lucide-react';

export default function ContactsPage() {
  return (
    <>
      <ModuleHeader title="Contactos" icon={Contact} />
      <div className="p-4 md:p-6">
        <ContactsPageContent />
      </div>
    </>
  );
}
