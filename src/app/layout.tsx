
import type { Metadata } from "next";
import "./globals.css";
import MonitoringBoot from '@/components/monitoring/MonitoringBoot';
import { Inter } from 'next/font/google';
import React from 'react';
import ClientProviders from './ClientProviders'; // <- Client Component con "use client"
import { Toaster } from "sonner";

const inter = Inter({ 
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.santabrisa.es"),
  title: "Santa Brisa App",
  description: "ERP y CRM para Santa Brisa",
  openGraph: {
    title: "Santa Brisa App",
    description: "ERP y CRM para Santa Brisa",
    images: '/og-image.png', // Asegúrate de tener una imagen en /public/og-image.png
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-background">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus-ring"
        >
          Saltar al contenido principal
        </a>
        {/* Client boundary: mete dentro todo lo que requiera browser */}
        <ClientProviders>
          {children}
          <Toaster position="bottom-right" />
        </ClientProviders>
        <MonitoringBoot />
      </body>
    </html>
  );
}
