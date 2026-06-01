import './globals.css';
import type { Metadata } from 'next';
import { Header } from '../components/layout/Header';

export const metadata: Metadata = {
  title: 'Ultimate Sports League',
  description: 'Season 2026 community sports league schedule, standings and admin tools.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
