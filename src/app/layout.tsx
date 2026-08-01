import './globals.css';

import { Inter, JetBrains_Mono } from 'next/font/google';

import { AppInitializer } from '@/components/AppInitializer';
import { ConditionalAnalytics } from '@/components/cookies/ConditionalAnalytics';
import { CookieConsent } from '@/components/cookies/CookieConsent';
import { ErrorBoundary } from '@/components/error-boundary';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { ConnectionStatusIndicator } from '@/components/realtime/ConnectionStatus';
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
    'Independent oracle transparency and risk infrastructure for DeFi. Cross-oracle price verification, deviation analytics, and liquidation risk signals across Chainlink, Pyth, RedStone, API3 and more.',
  icons: {
    icon: '/logos/owl-logo-icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
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
                className="fixed bottom-4 right-4 z-40"
              />
              <FeedbackButton />
              <CookieConsent />
            </AppInitializer>
          </ErrorBoundary>
        </QueryProvider>
        <ConditionalAnalytics />
      </body>
    </html>
  );
}
