import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { getSession } from '@/lib/session';
import { SessionProvider } from '@/components/SessionContext';
import AppShell from '@/components/AppShell';

const newsreader = localFont({ src: [
  { path: '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2', style: 'normal', weight: '200 800' },
  { path: '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2', style: 'italic', weight: '200 800' },
], variable: '--font-serif', display: 'swap' });
const hanken = localFont({ src: '../../node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2', variable: '--font-sans', weight: '100 900', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Géonéalogie — Famille Dudouyt',
  description: "Explorez l'arbre généalogique de la famille Dudouyt",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Géonéalogie',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="fr">
      <body
        className={`${hanken.variable} ${newsreader.variable}`}
        style={{ margin: 0, background: '#e9e4d8' }}
      >
        <SessionProvider value={{ name: session?.name ?? 'Famille', role: session?.role ?? 'reader' }}><AppShell>{children}</AppShell></SessionProvider>
      </body>
    </html>
  );
}
