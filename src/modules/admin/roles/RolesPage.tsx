import { Card, Table, Badge, Button } from 'react-bootstrap';
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
}