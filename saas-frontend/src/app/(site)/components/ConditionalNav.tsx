'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function ConditionalNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide nav on these pages
  const hideNav = pathname === '/' || pathname === '/learn-more';

  if (hideNav) {
    return null;
  }

  return <>{children}</>;
}
