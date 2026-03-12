import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { I18nProvider } from '@/lib/i18n/context';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SWRProvider } from '@/providers/SWRProvider';
import { TimeRangeProvider } from '@/contexts/TimeRangeContext';

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
            <TimeRangeProvider>
              <ErrorBoundary>
                <Navbar />
                <main className="flex-1 bg-gray-50">{children}</main>
                <Footer />
              </ErrorBoundary>
            </TimeRangeProvider>
          </SWRProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
