'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function ConditionalMainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const isLearnMore = pathname === '/learn-more';
  const isPersonalSpace = pathname?.startsWith('/u/') && pathname?.includes('/space');
  const isPractitionerManage = pathname?.startsWith('/p/') && pathname?.includes('/manage');

  // Full screen pages without nav
  if (isHomePage || isLearnMore) {
    return (
      <main className="min-h-screen flex flex-col flex-grow">
        {children}
      </main>
    );
  }

  // Personal space and practitioner manage use dark theme - no light gradient
  if (isPersonalSpace || isPractitionerManage) {
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
