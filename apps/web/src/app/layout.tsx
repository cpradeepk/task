import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import PageTransition from '@/components/layout/PageTransition'
import ChunkErrorBoundary from '@/components/error/ChunkErrorBoundary'
import TimerProvider from '@/components/TimerProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Amtariksha - Task Management System',
  description: 'Amtariksha Task Management System for efficient workflow management',
  icons: {
    icon: [
      { url: '/icon.png', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: ['/icon.png']
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Amtariksha'
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ChunkErrorBoundary>
          <LoadingProvider>
            <SettingsProvider>
              <TimerProvider>
                <PageTransition>
                  {children}
                </PageTransition>
              </TimerProvider>
            </SettingsProvider>
          </LoadingProvider>
        </ChunkErrorBoundary>
      </body>
    </html>
  )
}
