import type { Metadata } from "next";
import ClientProviders from "./ClientProviders";
import "./globals.css";
import MonitoringBoot from '@/components/monitoring/MonitoringBoot';

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
    <html lang="es">
      <body>
        <MonitoringBoot />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
