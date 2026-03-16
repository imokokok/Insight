import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { I18nProvider } from '@/lib/i18n/provider';
import { ErrorBoundary } from '@/components/ErrorBoundaries';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { ConnectionStatusIndicator } from '@/components/realtime/ConnectionStatus';
import { ToastProvider } from '@/components/ui/Toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AppInitializer } from '@/components/AppInitializer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Insight',
  description: 'Professional oracle analytics platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <I18nProvider>
          <ReactQueryProvider>
            <ToastProvider>
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
            </ToastProvider>
          </ReactQueryProvider>
        </I18nProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
