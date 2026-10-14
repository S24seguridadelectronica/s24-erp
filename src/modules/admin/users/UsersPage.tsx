import { useState, useEffect } from 'react';
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
}