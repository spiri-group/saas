'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

/** Hides search bar, cart, and sign-in controls on setup pages */
export default function ConditionalNavItems({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/setup')) return null;
  return <>{children}</>;
}
