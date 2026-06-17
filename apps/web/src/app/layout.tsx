import type { Metadata } from 'next'
import './globals.css'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import PageTransition from '@/components/layout/PageTransition'
import ChunkErrorBoundary from '@/components/error/ChunkErrorBoundary'
import TimerProvider from '@/components/TimerProvider'
import ApolloWrapper from '@/components/providers/ApolloWrapper'
import { SecurityProvider } from '@/contexts/SecurityContext'

export const metadata: Metadata = {
  title: 'Karmayog — Task Management',
  description: 'Karmayog by Amtariksha Tech — task, bug, and project management for teams.',
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
    title: 'Karmayog'
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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('themeMode');
                  var system = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && system)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ChunkErrorBoundary>
          <LoadingProvider>
            <SettingsProvider>
              <TimerProvider>
                <ApolloWrapper>
                  <SecurityProvider>
                    <PageTransition>
                      {children}
                    </PageTransition>
                  </SecurityProvider>
                </ApolloWrapper>
              </TimerProvider>
            </SettingsProvider>
          </LoadingProvider>
        </ChunkErrorBoundary>
      </body>
    </html>
  )
}
