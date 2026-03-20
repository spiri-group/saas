"use client";
import './globals.css';
import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SignalRProvider } from '@/components/utils/SignalRProvider';

function ConsoleSignalRWrapper({ children }: { children: React.ReactElement }) {
  const { data: session } = useSession();

  if (!session?.user?.email) {
    return children;
  }

  return (
    <SignalRProvider userId={session.user.email}>
      {children}
    </SignalRProvider>
  );
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider basePath="/api/console/auth">
        <ConsoleSignalRWrapper>
          <div className="console-root">
            {children}
          </div>
        </ConsoleSignalRWrapper>
      </SessionProvider>
    </QueryClientProvider>
  );
}
