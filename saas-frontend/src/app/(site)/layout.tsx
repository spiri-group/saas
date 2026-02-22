import classNames from 'classnames';
import './globals.css';

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import SpiriLogo from '@/icons/spiri-logo';
import Providers from '@/lib/providers';
import SignedIn from './components/SignedIn';
import Link from 'next/link';
import CartIcon from './components/Catalogue/components/ShoppingCart/Nav';
import SearchBar from './components/SearchBar';
import Notifications from '@/components/notifications';
import ConditionalNav from './components/ConditionalNav';
import ConditionalNavItems from './components/ConditionalNavItems';
import ConditionalMainWrapper from './components/ConditionalMainWrapper';
import SacredAnimatedBackground from './components/Home/SacredAnimatedBackground';
import ResolveStripeSuccess from './components/ResolveStripeSuccess';
import ConsentGuard from './components/ConsentGuard';
import CookieBanner from './components/CookieBanner';
import AnalyticsTracker from './components/AnalyticsTracker';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.spiriverse.com'),
  title: 'SpiriVerse',
  description: 'SpiriVerse – A sacred digital marketplace connecting spiritual practitioners with seekers worldwide.',
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={classNames(inter.className, 'flex flex-col min-h-screen')}>
      <Providers>
        {/* Global animated background */}
        <SacredAnimatedBackground />

        <ConditionalNav>
          <div
             style={{}}
             className="flex flex-row items-center justify-between h-20 w-full fixed z-50 bg-transparent backdrop-blur-sm shadow-xl px-3 border-b border-white/10">
            <Link href="/">
              <SpiriLogo height={40} />
            </Link>
              <ConditionalNavItems>
                <SearchBar className="flex-grow mx-6" />
                <div className="flex flex-row items-center space-x-2">
                <CartIcon />
                <SignedIn/>
                </div>
              </ConditionalNavItems>
          </div>
        </ConditionalNav>
        <ConditionalMainWrapper>
          {children}
        </ConditionalMainWrapper>
        <div id="modal-div" className="absolute t-0 l-0 text-slate-800"/>
        <Notifications />
        <ResolveStripeSuccess />
        <ConsentGuard />
        <CookieBanner />
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
      </Providers>
    </div>
  )
}