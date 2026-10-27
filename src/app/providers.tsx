import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth'; // o donde tengas tu AuthProvider

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>           {/* 👈 AQUÍ DEBE ESTAR */}
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}