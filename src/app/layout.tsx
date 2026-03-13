import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { I18nProvider } from '@/lib/i18n/provider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SWRProvider } from '@/providers/SWRProvider';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { ConnectionStatusIndicator } from '@/components/realtime/ConnectionStatus';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

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
          <SWRProvider>
            <AuthProvider>
              <TimeRangeProvider>
                <RealtimeProvider>
                  <ErrorBoundary>
                    <Navbar />
                    <main className="flex-1 bg-gray-50">{children}</main>
                    <Footer />
                    <ConnectionStatusIndicator
                      showLabel={false}
                      showReconnectButton={true}
                      className="fixed bottom-4 right-4 z-50"
                    />
                  </ErrorBoundary>
                </RealtimeProvider>
              </TimeRangeProvider>
            </AuthProvider>
          </SWRProvider>
        </I18nProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
