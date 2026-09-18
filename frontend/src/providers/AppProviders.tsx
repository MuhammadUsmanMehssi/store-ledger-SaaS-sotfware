import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/stores/authStore'

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
