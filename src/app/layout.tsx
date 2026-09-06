import './globals.css';

import { Suspense } from 'react';

import { Inter, JetBrains_Mono } from 'next/font/google';

import { AppInitializer } from '@/components/AppInitializer';
import { ClientUtilities } from '@/components/ClientUtilities';
import { ConditionalAnalytics } from '@/components/cookies/ConditionalAnalytics';
import { ErrorBoundary } from '@/components/error-boundary';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { NavigationProgress } from '@/components/navigation/NavigationProgress';
import { PublicChrome } from '@/components/PublicChrome';
import { QueryProvider } from '@/providers/QueryProvider';

import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Insight — Oracle Transparency & Risk Infrastructure for DeFi',
  description:
    'Independent oracle transparency and risk infrastructure for DeFi. Cross-oracle price verification, deviation analytics, and liquidation risk signals across Chainlink, RedStone, API3 and more.',
  icons: {
    icon: '/logos/insight-glacier-cut.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <QueryProvider>
          <ErrorBoundary>
            <AppInitializer>
              <PublicChrome>
                <Navbar />
              </PublicChrome>
              <Suspense fallback={null}>
                <NavigationProgress />
              </Suspense>
              <main className="flex-1" style={{ backgroundColor: 'var(--background)' }}>
                {children}
              </main>
              <PublicChrome>
                <Footer />
                <ClientUtilities />
              </PublicChrome>
            </AppInitializer>
          </ErrorBoundary>
        </QueryProvider>
        <ConditionalAnalytics />
      </body>
    </html>
  );
}
