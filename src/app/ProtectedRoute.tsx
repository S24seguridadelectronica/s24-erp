import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <Loader2 size={48} className="spinner" color="#0a2540" />
      <p>Cargando...</p>
    </div>
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}