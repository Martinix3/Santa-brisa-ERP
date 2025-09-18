import type { Metadata } from "next";
import ClientProviders from "./ClientProviders";

export const metadata: Metadata = { title: "Santa Brisa" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
