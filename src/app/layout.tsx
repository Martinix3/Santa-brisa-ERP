// app/layout.tsx - CORREGIDO Y LISTO PARA USAR

import type { Metadata } from "next";
// 👇 ÚNICA LÍNEA DE IMPORTACIÓN DE ESTILOS GLOBALES
import "./globals.css";
import MonitoringBoot from '@/components/monitoring/MonitoringBoot';
import { Inter } from 'next/font/google';
import React from 'react';
import ClientProviders from './ClientProviders';
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
    images: '/og-image.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="sb-app">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus-ring"
        >
          Saltar al contenido principal
        </a>
        <main className="sb-main">
          {/* Límite del cliente: envuelve todo lo que necesita el navegador */}
          <ClientProviders>
            {children}
            <Toaster position="bottom-right" />
          </ClientProviders>
        </main>
        <MonitoringBoot />
      </body>
    </html>
  );
}