
import type { Metadata } from "next";
import ClientProviders from "./ClientProviders";
import "./globals.css";
import MonitoringBoot from '@/components/monitoring/MonitoringBoot';
import { Inter } from 'next/font/google';
import { Toaster } from "sonner";
import React from 'react';

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
        <ClientProviders>
          {children}
        </ClientProviders>
        <Toaster position="bottom-right" />
        <MonitoringBoot />
      </body>
    </html>
  );
}
