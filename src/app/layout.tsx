
import type { Metadata } from "next";
import ClientProviders from "./ClientProviders";
import "./globals.css";
import MonitoringBoot from '@/components/monitoring/MonitoringBoot';
import { Inter } from 'next/font/google';
import { Toaster } from "sonner";
import React from 'react';
import AuthenticatedLayout from '@/components/layouts/AuthenticatedLayout';
import { RealtimeProvider } from "./providers/RealtimeProvider";


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
        <RealtimeProvider>
            <ClientProviders>
              <AuthenticatedLayout>
                {children}
              </AuthenticatedLayout>
            </ClientProviders>
          <Toaster position="bottom-right" />
        </RealtimeProvider>
      </body>
    </html>
  );
}
