// In Next.js, this file would be called: app/providers.jsx
'use client'

// We can not useState or useRef in a server component, which is why we are
// extracting this part out into it's own file with 'use client' on top
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { UserPreferencesProvider } from './context/UserPreferencesContext'

export default function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            // Retry failed queries (network errors, etc)
            retry: 1,
            // Don't refetch on window focus for better performance
            // User can manually refresh if needed
            refetchOnWindowFocus: false,
            // Refetch on reconnect for data freshness
            refetchOnReconnect: true,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
      <UserPreferencesProvider>
        {children}
      </UserPreferencesProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}