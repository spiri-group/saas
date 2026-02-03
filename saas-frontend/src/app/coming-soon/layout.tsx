import '../(site)/globals.css';
import classNames from 'classnames';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SpiriVerse - Coming Soon',
  description: 'Connecting your spiritual needs in 2026',
};

export default function ComingSoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="4d65540d-df75-47d0-821e-c730c2af04bc"
          strategy="afterInteractive"
        />
      </head>
      <body className={classNames(inter.className, 'flex flex-col min-h-screen')}>
        {children}
      </body>
    </html>
  );
}
