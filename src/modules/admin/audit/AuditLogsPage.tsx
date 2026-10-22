import { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Alert, Form, InputGroup, Row, Col } from 'react-bootstrap';
import { getAuditLogs } from '@/services/api/audit';
import { Search, FileText, User, Calendar } from 'lucide-react';

const ACTION_CONFIG: any = {
  CREATE: { label: 'Creación', color: 'success' },
  UPDATE: { label: 'Actualización', color: 'info' },
  DELETE: { label: 'Eliminación', color: 'danger' },
  LOGIN: { label: 'Inicio de Sesión', color: 'primary' },
  LOGOUT: { label: 'Cierre de Sesión', color: 'secondary' },
};

const TABLE_LABELS: any = {
  customers: 'Clientes',
  opportunities: 'Oportunidades',
  quotes: 'Cotizaciones',
  work_orders: 'Órdenes de Trabajo',
  products: 'Productos',
  suppliers: 'Proveedores',
  accounts_receivable: 'Cuentas por Cobrar',
  accounts_payable: 'Cuentas por Pagar',
  financial_transactions: 'Transacciones',
  profiles: 'Usuarios',
  auth: 'Autenticación',
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    user_name: '',
    table_name: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    try {
      setLoading(true);
      const data = await getAuditLogs({
        table_name: filters.table_name || undefined,
        action: filters.action || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      setLogs(data || []);
    } catch (err: any) {
      setError('Error al cargar registros: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(log =>
    !filters.user_name || log.user_name?.toLowerCase().includes(filters.user_name.toLowerCase())
  );

  if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}><Spinner animation="border" variant="primary" /><span className="ms-2">Cargando...</span></div>;

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h2 className="mb-1">Registro de Auditoría</h2>
        <p className="text-muted mb-0">Historial de todas las acciones realizadas en el sistema</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group><Form.Label>Usuario</Form.Label>
                <Form.Control placeholder="Nombre del usuario..." value={filters.user_name} onChange={(e) => setFilters({...filters, user_name: e.target.value})} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group><Form.Label>Módulo</Form.Label>
                <Form.Select value={filters.table_name} onChange={(e) => setFilters({...filters, table_name: e.target.value})}>
                  <option value="">Todos los módulos</option>
                  {Object.entries(TABLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label as string}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group><Form.Label>Acción</Form.Label>
                <Form.Select value={filters.action} onChange={(e) => setFilters({...filters, action: e.target.value})}>
                  <option value="">Todas</option>
                  {Object.entries(ACTION_CONFIG).map(([key, config]: any) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group><Form.Label>Fecha Inicio</Form.Label>
                <Form.Control type="date" value={filters.startDate} onChange={(e) => setFilters({...filters, startDate: e.target.value})} />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group><Form.Label>Fecha Fin</Form.Label>
                <Form.Control type="date" value={filters.endDate} onChange={(e) => setFilters({...filters, endDate: e.target.value})} />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th className="ps-4">Fecha/Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Descripción</th>
                <th className="text-end pe-4">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-5 text-muted">No hay registros de auditoría.</td></tr>
              ) : (
                filteredLogs.map((log) => {
                  const action = ACTION_CONFIG[log.action];
                  return (
                    <tr key={log.id}>
                      <td className="ps-4">
                        <div>{new Date(log.created_at).toLocaleDateString('es-CO')}</div>
                        <small className="text-muted">{new Date(log.created_at).toLocaleTimeString('es-CO')}</small>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <User size={16} className="me-2 text-muted" />
                          <div>
                            <div className="fw-semibold">{log.user_name || 'Sistema'}</div>
                            <small className="text-muted">{log.user_email}</small>
                          </div>
                        </div>
                      </td>
                      <td><Badge bg={action.color}>{action.label}</Badge></td>
                      <td><Badge bg="secondary">{TABLE_LABELS[log.table_name] || log.table_name}</Badge></td>
                      <td>{log.description || '-'}</td>
                      <td className="text-end pe-4">
                        {(log.old_data || log.new_data) && (
                          <button className="btn btn-outline-info btn-sm" onClick={() => alert('Datos anteriores:\n' + JSON.stringify(log.old_data, null, 2) + '\n\nDatos nuevos:\n' + JSON.stringify(log.new_data, null, 2))}>
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
