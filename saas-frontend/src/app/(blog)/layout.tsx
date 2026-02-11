import { Suspense } from 'react';
import '../(site)/globals.css';
import AnalyticsTracker from '../(site)/components/AnalyticsTracker';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
    </>
  );
}
