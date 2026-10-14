import { useAuth } from './useAuth';

export function usePermissions() {
  const { profile } = useAuth();
  function hasRole(roleName: string): boolean {
    if (!profile) return false;
    return true; 
  }
  function can(module: string, action: string): boolean {
    if (!profile) return false;
    return true;
  }
  return { hasRole, can };
}