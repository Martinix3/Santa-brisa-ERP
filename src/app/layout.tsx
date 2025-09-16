import './globals.css'
import type { Metadata } from 'next'
import React from 'react'
import { DataProvider } from '@/lib/dataprovider'
import QuickLogOverlay from '@/features/quicklog/QuickLogOverlay'

export const metadata: Metadata = {
  title: 'CRM de Santa Brisa',
  description: 'CRM • Santa Brisa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="h-screen flex flex-col bg-white">
        <DataProvider>
          {children}
          <QuickLogOverlay />
        </DataProvider>
      </body>
    </html>
  )
}
