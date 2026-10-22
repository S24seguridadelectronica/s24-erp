import { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Spinner } from 'react-bootstrap';
import { Shield, CheckCircle, Users } from 'lucide-react';
import { getRoles } from '@/services/api/users';

export function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Roles y Permisos</h2>
          <p className="text-muted mb-0">Define qué puede hacer cada tipo de usuario en el sistema</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Rol del Sistema</th>
                <th>Descripción</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center">
                      <Shield size={20} className="text-primary me-3" />
                      <span className="fw-semibold">{role.label || role.name}</span>
                      {role.is_system && <Badge bg="warning" text="dark" className="ms-2">Sistema</Badge>}
                    </div>
                  </td>
                  <td className="text-muted">{role.description || '-'}</td>
                  <td className="text-end pe-4">
                    <Button variant="outline-primary" size="sm">
                      <CheckCircle size={16} className="me-1" /> Ver Permisos
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
