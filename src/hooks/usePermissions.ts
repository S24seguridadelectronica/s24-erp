import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/services/supabase/client';

export function usePermissions() {
  const { profile } = useAuth();
  const [roleName, setRoleName] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Consultamos el rol real del usuario a Supabase
  useEffect(() => {
    const fetchRole = async () => {
      if (!profile?.id) {
        setLoadingRole(false);
        return;
      }

      try {
        const { data } = await (supabase.from('user_roles') as any)
          .select('roles(name)')
          .eq('user_id', profile.id)
          .maybeSingle();

        // Guardamos el nombre del rol en minúsculas
        setRoleName(data?.roles?.name?.toLowerCase() || null);
      } catch (error) {
        console.error("Error al obtener rol:", error);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchRole();
  }, [profile]);

  // Función real que verifica si el usuario tiene un rol específico
  function hasRole(roleToCheck: string): boolean {
    if (!profile || !roleName) return false;
    return roleName === roleToCheck.toLowerCase();
  }

  // Función para verificar permisos por módulo (puedes personalizarla)
  function can(module: string, action: string): boolean {
    if (!profile || !roleName) return false;

    // Los administradores pueden hacer todo
    if (hasRole('admin') || hasRole('administrador')) return true;

    // Permisos específicos para el Vendedor de Campo
    if (hasRole('vendedor_campo')) {
      if (module === 'visitas' && (action === 'ver' || action === 'editar')) return true;
      return false; // No puede ver clientes, finanzas, etc.
    }

    // Permisos para la Preventa
    if (hasRole('preventa') || hasRole('vendedor')) {
      if (['crm', 'clientes', 'oportunidades', 'cotizaciones'].includes(module)) return true;
      return false;
    }

    return false;
  }

  return { hasRole, can, loadingRole };
}