'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function ConditionalMainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const isLearnMore = pathname === '/learn-more';
  const isPersonalSpace = pathname?.startsWith('/u/') && pathname?.includes('/space');
  const isPractitioner = pathname?.startsWith('/p/');
  const isPractitionerManage = isPractitioner && pathname?.includes('/manage');
  const isSetup = pathname === '/setup' || pathname?.startsWith('/m/setup') || pathname?.startsWith('/p/setup');

  // Full screen pages without nav
  if (isHomePage || isLearnMore) {
    return (
      <main className="min-h-screen flex flex-col flex-grow">
        {children}
      </main>
    );
  }

  // Setup pages: fill everything below the navbar, no page scroll.
  // No bottom nav during onboarding so we just stretch from mt-20 to the bottom of the viewport.
  if (isSetup) {
    return (
      <main
        className={cn("flex flex-col mt-20 overflow-hidden")}
        style={{ height: 'calc(100dvh - 5rem)' }}
      >
        {children}
      </main>
    );
  }

  // Personal space, practitioner pages use dark theme - no light gradient
  if (isPersonalSpace || isPractitioner) {
    return (
      <main className={cn("min-h-screen-minus-nav flex flex-col flex-grow mt-20 bg-slate-950")}>
        {children}
      </main>
    );
  }

  return (
    <main
      style={{
        background: 'linear-gradient(to bottom, #e3e7ef 0%, #f3f6fb 100%)',
      }}
      className={cn("min-h-screen-minus-nav flex flex-col flex-grow mt-20")}>
      {children}
    </main>
  );
}
