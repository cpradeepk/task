import type { Metadata } from 'next'
import './globals.css'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import PageTransition from '@/components/layout/PageTransition'
import ChunkErrorBoundary from '@/components/error/ChunkErrorBoundary'
import TimerProvider from '@/components/TimerProvider'
import ApolloWrapper from '@/components/providers/ApolloWrapper'

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
  }
}

// Viewport configuration (separate export in Next.js 15+)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <ChunkErrorBoundary>
          <LoadingProvider>
            <SettingsProvider>
              <TimerProvider>
                <ApolloWrapper>
                  <PageTransition>
                    {children}
                  </PageTransition>
                </ApolloWrapper>
              </TimerProvider>
            </SettingsProvider>
          </LoadingProvider>
        </ChunkErrorBoundary>
      </body>
    </html>
  )
}
