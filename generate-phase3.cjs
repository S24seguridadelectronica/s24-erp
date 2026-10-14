const fs = require('fs');
const path = require('path');

const files = {
  'src/hooks/usePermissions.ts': `import { useAuth } from './useAuth';

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
}`,

  'src/services/api/users.ts': `import { supabase } from '../supabase/client';

export async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, is_active, created_at');
  if (error) throw error;
  return data;
}`,

  'src/modules/admin/users/UsersPage.tsx': `import { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { getUsers } from '@/services/api/users';
import { useAuth } from '@/hooks/useAuth';
import { UserPlus, Shield, AlertCircle } from 'lucide-react';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data || []);
    } catch (err: any) {
      setError('Error al cargar los usuarios: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Cargando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Gestión de Usuarios</h2>
          <p className="text-muted mb-0">Administra los accesos y roles del personal de S24</p>
        </div>
        <Button variant="primary">
          <UserPlus size={18} className="me-2" /> Nuevo Usuario
        </Button>
      </div>

      {error && <Alert variant="danger"><AlertCircle size={18} className="me-2" />{error}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Usuario</th>
                <th>Correo Electrónico</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Fecha de Registro</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-5 text-muted">No se encontraron usuarios registrados.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', fontSize: '16px', fontWeight: 'bold' }}>
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="fw-semibold">{user.full_name || 'Sin nombre'}</div>
                          <small className="text-muted">{user.id === profile?.id ? '(Tú)' : ''}</small>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <Badge bg={user.is_active ? 'success' : 'secondary'} className="px-3 py-2">
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString('es-CO')}</td>
                    <td className="text-end pe-4">
                      <Button variant="outline-secondary" size="sm" className="me-2"><Shield size={16} className="me-1" /> Roles</Button>
                      <Button variant="outline-primary" size="sm">Editar</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}`,

  'src/modules/admin/roles/RolesPage.tsx': `import { Card, Table, Badge, Button } from 'react-bootstrap';
import { Shield, CheckCircle, Users } from 'lucide-react';

const ROLES_DATA = [
  { id: 1, name: 'admin_super', label: 'Administrador Principal', description: 'Acceso total al sistema y configuración', users: 1 },
  { id: 2, name: 'admin_ops', label: 'Administrador Operativo', description: 'Gestión de operaciones y técnicos', users: 0 },
  { id: 3, name: 'sales_supervisor', label: 'Supervisor Comercial', description: 'Supervisión de vendedores y aprobaciones', users: 0 },
  { id: 4, name: 'salesperson', label: 'Vendedor', description: 'Gestión de clientes, cotizaciones y llamadas', users: 0 },
  { id: 5, name: 'tech_coordinator', label: 'Coordinador Técnico', description: 'Asignación y seguimiento de órdenes de trabajo', users: 0 },
  { id: 6, name: 'technician', label: 'Técnico', description: 'Consulta y actualización de órdenes asignadas', users: 0 },
  { id: 7, name: 'inventory_manager', label: 'Responsable de Inventario', description: 'Control de stock, entradas y salidas', users: 0 },
  { id: 8, name: 'finance_manager', label: 'Responsable Financiero', description: 'Gestión de pagos, gastos y cuentas por cobrar', users: 0 },
  { id: 9, name: 'web_editor', label: 'Editor de Página Web', description: 'Administración del CMS y contenido público', users: 0 },
];

export function RolesPage() {
  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Roles y Permisos</h2>
          <p className="text-muted mb-0">Define qué puede hacer cada tipo de usuario en el sistema</p>
        </div>
        <Button variant="primary"><Shield size={18} className="me-2" /> Nuevo Rol</Button>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Rol del Sistema</th>
                <th>Descripción</th>
                <th>Usuarios Asignados</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ROLES_DATA.map((role) => (
                <tr key={role.id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                      <Shield size={20} className="text-primary me-3" />
                      <span className="fw-semibold text-capitalize">{role.label}</span>
                      {role.name === 'admin_super' && <Badge bg="warning" text="dark" className="ms-2">Sistema</Badge>}
                    </div>
                  </td>
                  <td className="text-muted">{role.description}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <Users size={16} className="text-muted me-2" />
                      <span>{role.users} usuario{role.users !== 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  <td className="text-end pe-4">
                    <Button variant="outline-primary" size="sm"><CheckCircle size={16} className="me-1" /> Ver Permisos</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}`
};

Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf8');
});

console.log('✅ Archivos de la Fase 3 creados exitosamente.');
