import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LoadingProvider } from '@/contexts/LoadingContext'
import PageTransition from '@/components/layout/PageTransition'
import ChunkErrorBoundary from '@/components/error/ChunkErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EassyLife - Task Management System',
  description: 'EassyLife Task Management System for efficient workflow management',
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
            <PageTransition>
              {children}
            </PageTransition>
          </LoadingProvider>
        </ChunkErrorBoundary>
      </body>
    </html>
  )
}
