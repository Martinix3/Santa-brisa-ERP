import type { Metadata } from "next";
import ClientProviders from "./ClientProviders";
import "./globals.css";
import MonitoringBoot from '@/components/monitoring/MonitoringBoot';
import { Inter } from 'next/font/google';
import { ToasterProvider } from '@/components/ui/Toaster';

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
      <body>
        <ToasterProvider>
          <MonitoringBoot />
          <ClientProviders>{children}</ClientProviders>
        </ToasterProvider>
      </body>
    </html>
  );
}
