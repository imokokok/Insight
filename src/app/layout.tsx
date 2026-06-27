import './globals.css';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { AppInitializer } from '@/components/AppInitializer';
import { ErrorBoundary } from '@/components/error-boundary';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { ConnectionStatusIndicator } from '@/components/realtime/ConnectionStatus';
import { QueryProvider } from '@/providers/QueryProvider';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insight',
  description: 'Professional oracle analytics platform',
  icons: {
    icon: '/logos/owl-logo-icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <QueryProvider>
          <ErrorBoundary>
            <AppInitializer>
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
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
