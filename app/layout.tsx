import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from './providers';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Scenario Trading Mentor™',
  description: 'AI-Powered Trading Methodology Platform - Trade the Scenario, Not the Prediction',
  keywords: ['trading', 'crypto', 'AI', 'mentor', 'scenario trading', 'battle card'],
  authors: [{ name: 'KhahanA Insights' }],
  openGraph: {
    title: 'Scenario Trading Mentor™',
    description: 'AI-Powered Trading Methodology Platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
