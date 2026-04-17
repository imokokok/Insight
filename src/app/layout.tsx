import './globals.css';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { AppInitializer } from '@/components/AppInitializer';
import { ErrorBoundary } from '@/components/error-boundary';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { PerformanceMetricsCollector } from '@/components/PerformanceMetricsCollector';
import { ConnectionStatusIndicator } from '@/components/realtime/ConnectionStatus';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight',
  description: 'Professional oracle analytics platform',
  other: {
    'dns-prefetch': 'https://fonts.googleapis.com',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ReactQueryProvider>
          <ErrorBoundary>
            <AppInitializer>
              <PerformanceMetricsCollector />
              <Navbar />
              <main className="flex-1" style={{ backgroundColor: 'var(--background)' }}>
                {children}
              </main>
              <Footer />
              <ConnectionStatusIndicator
                showLabel={false}
                showReconnectButton={true}
                className="fixed bottom-4 right-4 z-50"
              />
            </AppInitializer>
          </ErrorBoundary>
        </ReactQueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
