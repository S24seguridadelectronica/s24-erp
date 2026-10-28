import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import { Spinner } from 'react-bootstrap';

interface RoleGuardProps {
  allowedRoles: string[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { profile } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await (supabase.from('user_roles') as any)
          .select('roles(name)')
          .eq('user_id', profile.id)
          .maybeSingle();

        const roleName = data?.roles?.name?.toLowerCase().trim() || 'vendedor';
        setUserRole(roleName);
      } catch (error) {
        console.error("Error al obtener rol:", error);
        setUserRole('vendedor');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [profile]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Verificamos si el rol actual está permitido
  const isAllowed = userRole && allowedRoles.includes(userRole);

  if (!isAllowed) {
    // Si es vendedor de campo, lo redirigimos a sus visitas
    if (userRole === 'vendedor_campo' || userRole === 'field_sales' || userRole === 'cerrador') {
      return <Navigate to="/mis-visitas" replace />;
    }
    // Si es otro rol intentando entrar a una ruta prohibida, lo enviamos al inicio
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}