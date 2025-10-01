
import type { Metadata } from "next";
import ClientProviders from "./ClientProviders";
import "./globals.css";
import MonitoringBoot from '@/components/monitoring/MonitoringBoot';
import { Inter } from 'next/font/google';
import { Toaster } from "sonner";
import React from 'react';
import { AssistantDialog } from "@/features/assistant/components/AssistantDialog";
import { AssistantTrigger } from "@/features/assistant/components/AssistantTrigger";


const inter = Inter({ 
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Santa Brisa App",
  description: "ERP y CRM para Santa Brisa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-background">
        <ClientProviders>
          {children}
          <AssistantDialog />
          <AssistantTrigger />
        </ClientProviders>
        <Toaster position="bottom-right" />
        <MonitoringBoot />
      </body>
    </html>
  );
}
